import hashlib
import os
import re
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Tuple, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import Evidence, Event, AuditLog
from app.parsers.registry import default_registry

def sanitize_filename(filename: str) -> str:
    # Strip dangerous path characters to prevent path traversal
    clean = re.sub(r'[\\/*?:"<>|]', "", Path(filename).name)
    return clean or "unnamed_artifact.dat"

def calculate_stream_sha256_and_save(file_obj, dest_path: Path) -> Tuple[str, int]:
    hasher = hashlib.sha256()
    size = 0
    with open(dest_path, "wb") as f_out:
        while chunk := file_obj.read(1024 * 1024): # 1MB chunks
            hasher.update(chunk)
            f_out.write(chunk)
            size += len(chunk)
    return hasher.hexdigest(), size

class EvidenceService:
    @staticmethod
    def process_uploaded_evidence(
        db: Session,
        case_id: str,
        upload_file: UploadFile,
        collector_notes: str = ""
    ) -> Evidence:
        safe_name = sanitize_filename(upload_file.filename)
        case_storage_dir = settings.STORAGE_DIR / case_id
        case_storage_dir.mkdir(parents=True, exist_ok=True)

        temp_storage_path = case_storage_dir / f"temp_{safe_name}"

        # Stream save and compute hash
        try:
            sha256_digest, size_bytes = calculate_stream_sha256_and_save(upload_file.file, temp_storage_path)
        except Exception as e:
            if temp_storage_path.exists():
                temp_storage_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to save evidence file: {str(e)}")

        if size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
            temp_storage_path.unlink()
            raise HTTPException(status_code=413, detail=f"File exceeds maximum upload size limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes")

        # Destination with internal unique key
        final_filename = f"{sha256_digest[:12]}_{safe_name}"
        final_storage_path = case_storage_dir / final_filename

        # If already exists, replace or overwrite cleanly
        if temp_storage_path != final_storage_path:
            shutil.move(str(temp_storage_path), str(final_storage_path))

        media_type = upload_file.content_type or "application/octet-stream"

        # Create Evidence record in DB
        evidence = Evidence(
            case_id=case_id,
            original_filename=safe_name,
            storage_key=str(final_storage_path.relative_to(settings.STORAGE_DIR)),
            media_type=media_type,
            size_bytes=size_bytes,
            sha256=sha256_digest,
            acquisition_metadata={
                "original_filename": upload_file.filename,
                "collector_notes": collector_notes,
                "ingest_timestamp": datetime.now(timezone.utc).isoformat(),
            },
            processing_status="PROCESSING",
            verification_status="UNVERIFIED"
        )
        db.add(evidence)
        db.flush()

        # Parse evidence using parser registry
        parse_result = default_registry.parse_file(final_storage_path, safe_name, media_type)

        if parse_result.errors and not parse_result.events:
            evidence.processing_status = "ERROR" if parse_result.format_name != "UNSUPPORTED" else "UNSUPPORTED"
            evidence.processing_error = "; ".join(parse_result.errors)
        else:
            evidence.processing_status = "PROCESSED"
            if parse_result.errors:
                evidence.processing_error = "; ".join(parse_result.errors)

            # Insert extracted events
            for ext_event in parse_result.events:
                meta = ext_event.extracted_metadata or {}
                meta["related_entities"] = ext_event.related_entities

                ev_model = Event(
                    case_id=case_id,
                    evidence_id=evidence.id,
                    event_type=ext_event.event_type,
                    category=ext_event.category,
                    severity=ext_event.severity,
                    description=ext_event.description,
                    observed_timestamp=ext_event.observed_timestamp,
                    normalized_timestamp_utc=ext_event.normalized_timestamp_utc,
                    timestamp_precision=ext_event.timestamp_precision,
                    timezone_provenance=ext_event.timezone_provenance,
                    extracted_metadata=meta
                )
                db.add(ev_model)

        # Audit log entry
        audit = AuditLog(
            case_id=case_id,
            actor_id="Investigator",
            action="EVIDENCE_UPLOADED",
            target_type="EVIDENCE",
            target_id=evidence.id,
            details={
                "filename": safe_name,
                "sha256": sha256_digest,
                "size_bytes": size_bytes,
                "events_extracted": len(parse_result.events),
                "status": evidence.processing_status
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(evidence)
        return evidence

    @staticmethod
    def verify_integrity(db: Session, evidence_id: str) -> Dict[str, Any]:
        evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
        if not evidence:
            raise HTTPException(status_code=404, detail="Evidence not found")

        full_path = settings.STORAGE_DIR / evidence.storage_key
        if not full_path.exists():
            evidence.verification_status = "VERIFIED_CORRUPTED"
            evidence.last_verified_at = datetime.now(timezone.utc)
            db.commit()
            return {
                "evidence_id": evidence.id,
                "original_filename": evidence.original_filename,
                "expected_sha256": evidence.sha256,
                "calculated_sha256": "FILE_MISSING_ON_DISK",
                "matches": False,
                "verification_timestamp": evidence.last_verified_at,
                "verification_status": "VERIFIED_CORRUPTED",
                "details": "Stored file does not exist at recorded storage path."
            }

        # Recalculate hash from stored bytes
        hasher = hashlib.sha256()
        with open(full_path, "rb") as f:
            while chunk := f.read(1024 * 1024):
                hasher.update(chunk)
        calculated_hash = hasher.hexdigest()

        matches = (calculated_hash.lower() == evidence.sha256.lower())
        now = datetime.now(timezone.utc)
        evidence.last_verified_at = now
        evidence.verification_status = "VERIFIED_VALID" if matches else "VERIFIED_CORRUPTED"

        # Log audit
        audit = AuditLog(
            case_id=evidence.case_id,
            actor_id="Investigator",
            action="EVIDENCE_VERIFIED",
            target_type="EVIDENCE",
            target_id=evidence.id,
            details={
                "expected_sha256": evidence.sha256,
                "calculated_sha256": calculated_hash,
                "matches": matches,
                "status": evidence.verification_status
            }
        )
        db.add(audit)
        db.commit()

        return {
            "evidence_id": evidence.id,
            "original_filename": evidence.original_filename,
            "expected_sha256": evidence.sha256,
            "calculated_sha256": calculated_hash,
            "matches": matches,
            "verification_timestamp": now,
            "verification_status": evidence.verification_status,
            "details": "Integrity check succeeded: calculated SHA-256 exactly matches recorded hash." if matches else "CRITICAL: Hash mismatch detected! Stored bytes differ from recorded acquisition digest."
        }
