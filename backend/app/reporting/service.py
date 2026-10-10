import io
import csv
import json
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import Case, Evidence, Event, Finding, Relationship, AuditLog, FindingEvidence

class ReportingService:
    @staticmethod
    def compile_case_report(db: Session, case_id: str) -> Dict[str, Any]:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        events = db.query(Event).filter(Event.case_id == case_id).order_by(Event.normalized_timestamp_utc.asc().nullslast()).all()
        findings = db.query(Finding).filter(Finding.case_id == case_id).all()
        relationships = db.query(Relationship).filter(Relationship.case_id == case_id).all()
        audit_logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.timestamp.desc()).all()

        # Compile evidence inventory
        evidence_inv = []
        for ev in evidence_items:
            evidence_inv.append({
                "id": ev.id,
                "original_filename": ev.original_filename,
                "media_type": ev.media_type,
                "size_bytes": ev.size_bytes,
                "sha256": ev.sha256,
                "processing_status": ev.processing_status,
                "verification_status": ev.verification_status,
                "last_verified_at": ev.last_verified_at.isoformat() if ev.last_verified_at else None,
                "uploaded_at": ev.uploaded_at.isoformat() if ev.uploaded_at else None
            })

        # Compile timeline
        timeline_events = []
        for ev in events:
            timeline_events.append({
                "id": ev.id,
                "event_type": ev.event_type,
                "category": ev.category,
                "severity": ev.severity,
                "description": ev.description,
                "observed_timestamp": ev.observed_timestamp,
                "normalized_timestamp_utc": ev.normalized_timestamp_utc.isoformat() if ev.normalized_timestamp_utc else "UNCERTAIN",
                "timestamp_precision": ev.timestamp_precision,
                "timezone_provenance": ev.timezone_provenance,
                "source_evidence_id": ev.evidence_id
            })

        # Compile findings
        compiled_findings = []
        for f in findings:
            supp_links = db.query(FindingEvidence, Evidence).join(
                Evidence, FindingEvidence.evidence_id == Evidence.id
            ).filter(FindingEvidence.finding_id == f.id).all()

            supp_items = []
            for fe, ev in supp_links:
                supp_items.append({
                    "evidence_id": ev.id,
                    "filename": ev.original_filename,
                    "sha256": ev.sha256,
                    "support_type": fe.support_type,
                    "explanation": fe.explanation
                })

            compiled_findings.append({
                "finding_number": f.finding_number,
                "title": f.title,
                "description": f.description,
                "finding_type": f.finding_type,
                "derivation_method": f.derivation_method,
                "confidence": f.confidence,
                "confidence_explanation": f.confidence_explanation,
                "limitations": f.limitations,
                "review_status": f.review_status,
                "analyst_notes": f.analyst_notes,
                "reviewer_id": f.reviewer_id,
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
                "supporting_evidence": supp_items
            })

        # Relationships
        compiled_rels = []
        for r in relationships:
            compiled_rels.append({
                "source_id": r.source_entity_id,
                "target_id": r.target_entity_id,
                "relationship_type": r.relationship_type,
                "derivation_method": r.derivation_method,
                "confidence": r.confidence,
                "explanation": r.explanation
            })

        # Audits
        compiled_audits = []
        for a in audit_logs:
            compiled_audits.append({
                "timestamp": a.timestamp.isoformat(),
                "actor": a.actor_id,
                "action": a.action,
                "target_type": a.target_type,
                "target_id": a.target_id,
                "details": a.details
            })

        return {
            "metadata": {
                "report_id": f"REP-{case.case_number}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "system": "TRACE-X Incident Reconstruction Platform v1.0",
                "disclaimer": "This report provides technical forensic correlation based strictly on provided artifacts. Not courtroom-certified by default. Every finding must be verified independently by an investigator."
            },
            "case": {
                "id": case.id,
                "case_number": case.case_number,
                "title": case.title,
                "description": case.description,
                "status": case.status,
                "investigator": case.investigator,
                "created_at": case.created_at.isoformat() if case.created_at else None
            },
            "evidence_inventory": evidence_inv,
            "findings": compiled_findings,
            "timeline": timeline_events,
            "relationships_summary": {
                "total_relationships": len(compiled_rels),
                "items": compiled_rels[:50]
            },
            "audit_trail": compiled_audits
        }

    @staticmethod
    def generate_txt_report(report_data: Dict[str, Any]) -> str:
        c = report_data["case"]
        m = report_data["metadata"]
        lines = [
            "=" * 78,
            "TRACE-X DIGITAL FORENSICS & INCIDENT RECONSTRUCTION REPORT",
            "=" * 78,
            f"Report ID:      {m['report_id']}",
            f"Generated:      {m['generated_at']} (UTC)",
            f"Case Number:    {c['case_number']}",
            f"Case Title:     {c['title']}",
            f"Case Status:    {c['status']}",
            f"Investigator:   {c['investigator']}",
            "-" * 78,
            "EXECUTIVE DISCLAIMER & METHODOLOGY",
            "-" * 78,
            m['disclaimer'],
            "",
            "-" * 78,
            "1. EVIDENCE INVENTORY & INTEGRITY DIGESTS (SHA-256)",
            "-" * 78,
        ]

        for ev in report_data["evidence_inventory"]:
            lines.append(f"• File: {ev['original_filename']} ({ev['size_bytes']} bytes)")
            lines.append(f"  SHA-256:  {ev['sha256']}")
            lines.append(f"  Status:   {ev['processing_status']} | Integrity: {ev['verification_status']}")
            lines.append("")

        lines.extend([
            "-" * 78,
            "2. INVESTIGATION FINDINGS & ANALYST REVIEW DECISIONS",
            "-" * 78,
        ])

        for f in report_data["findings"]:
            lines.append(f"[{f['finding_number']}] {f['title']}")
            lines.append(f"  Type:        {f['finding_type']} ({f['derivation_method']})")
            lines.append(f"  Confidence:  {int(f['confidence'] * 100)}% - {f['confidence_explanation']}")
            lines.append(f"  Status:      {f['review_status']} (Reviewer: {f.get('reviewer_id') or 'N/A'})")
            if f.get('analyst_notes'):
                lines.append(f"  Notes:       {f['analyst_notes']}")
            lines.append(f"  Description: {f['description']}")
            lines.append(f"  Limitations: {f['limitations']}")
            lines.append("  Supporting Evidence:")
            for s in f["supporting_evidence"]:
                lines.append(f"    - {s['filename']} [{s['support_type']}] (SHA256: {s['sha256'][:16]}...)")
            lines.append("")

        lines.extend([
            "-" * 78,
            "3. CHRONOLOGICAL INCIDENT TIMELINE",
            "-" * 78,
        ])

        for ev in report_data["timeline"]:
            ts = ev["normalized_timestamp_utc"]
            lines.append(f"[{ts}] [{ev['category']}] [{ev['severity']}] {ev['description']}")
            lines.append(f"   Precision: {ev['timestamp_precision']} | Provenance: {ev['timezone_provenance']}")

        lines.extend([
            "",
            "=" * 78,
            "END OF FORENSIC RECONSTRUCTION REPORT - TRACE-X PLATFORM",
            "=" * 78
        ])

        return "\n".join(lines)

    @staticmethod
    def generate_csv_events(report_data: Dict[str, Any]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp_UTC", "Category", "Severity", "Precision", "Timezone_Provenance", "Description", "Source_Evidence_ID"])
        for ev in report_data["timeline"]:
            writer.writerow([
                ev["normalized_timestamp_utc"],
                ev["category"],
                ev["severity"],
                ev["timestamp_precision"],
                ev["timezone_provenance"],
                ev["description"],
                ev["source_evidence_id"]
            ])
        return output.getvalue()
