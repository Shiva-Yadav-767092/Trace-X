import os
import shutil
from pathlib import Path
from typing import Dict, Any
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.core.config import settings
from app.models.entities import Case, Evidence, Event, Finding, Relationship, AuditLog
from app.services.case_service import CaseService
from app.services.evidence_service import EvidenceService
from app.correlation.engine import run_correlation_pipeline

DEMO_DATASET_DIR = Path(__file__).resolve().parent.parent.parent.parent / "demo" / "dataset"

class DemoSeeder:
    @staticmethod
    def seed_hackathon_demo(db: Session) -> Dict[str, Any]:
        """
        Creates or resets the reproducible hackathon demo case 'CASE-2026-9042'.
        Ingests 6 heterogeneous forensic artifacts, hashes them with SHA-256,
        extracts normalized events and indicators, and runs the correlation engine.
        """
        demo_case_num = "CASE-2026-9042"
        existing = db.query(Case).filter(Case.case_number == demo_case_num).first()
        if existing:
            # Clean up existing to ensure reproducible freshness
            db.delete(existing)
            db.commit()

        # Create Demo Case
        case = Case(
            case_number=demo_case_num,
            title="Operation PhishTrace — Spearphishing & Credential Pivot Investigation",
            description=(
                "High-priority digital forensic investigation reconstructing an advanced social engineering vector. "
                "Evidence bundle contains inbound spoofed EML notice, authentication server logs, "
                "endpoint JSON telemetry, proxy network CSV logs, and environmental noise artifacts."
            ),
            status="IN_PROGRESS",
            investigator="Lead Analyst (TRACE-X Security Team)"
        )
        db.add(case)
        db.commit()
        db.refresh(case)

        # Artifacts to ingest
        dataset_files = [
            ("phishing_email.eml", "message/rfc822", "Inbound email captured by secure mail transport"),
            ("auth_service.log", "text/plain", "Linux PAM/SSHD authentication daemon syslog"),
            ("endpoint_activity.json", "application/json", "Host WS-CORP-082 EDR process execution telemetry"),
            ("network_traffic.csv", "text/csv", "Perimeter HTTP proxy egress flow logs"),
            ("backup_routine.log", "text/plain", "Scheduled midnight maintenance job log (benign baseline)"),
            ("legacy_sensor.txt", "text/plain", "Legacy network probe capture with clock skew/missing timestamps"),
        ]

        ingested_evidence = []
        for filename, media_type, notes in dataset_files:
            file_path = DEMO_DATASET_DIR / filename
            if not file_path.exists():
                continue

            with open(file_path, "rb") as f:
                upload_file = UploadFile(
                    filename=filename,
                    file=f,
                    headers={"content-type": media_type}
                )
                ev = EvidenceService.process_uploaded_evidence(
                    db=db,
                    case_id=case.id,
                    upload_file=upload_file,
                    collector_notes=notes
                )
                ingested_evidence.append(ev)

        # Run correlation pipeline
        corr_result = run_correlation_pipeline(db, case.id)

        # Perform one automated hash verification on the phishing email
        if ingested_evidence:
            EvidenceService.verify_integrity(db, ingested_evidence[0].id)

        # Record demo initialization audit
        audit = AuditLog(
            case_id=case.id,
            actor_id="Demo Orchestrator",
            action="DEMO_DATASET_SEEDED",
            target_type="CASE",
            target_id=case.id,
            details={
                "artifacts_loaded": len(ingested_evidence),
                "correlation_summary": corr_result
            }
        )
        db.add(audit)
        db.commit()

        return {
            "status": "SUCCESS",
            "case_id": case.id,
            "case_number": case.case_number,
            "title": case.title,
            "evidence_count": len(ingested_evidence),
            "correlation": corr_result
        }

if __name__ == "__main__":
    from app.db.session import SessionLocal, engine, Base
    import app.models # ensure models are registered
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        res = DemoSeeder.seed_hackathon_demo(db)
        print("Demo Seeder Executed Successfully:")
        print(res)
    finally:
        db.close()
