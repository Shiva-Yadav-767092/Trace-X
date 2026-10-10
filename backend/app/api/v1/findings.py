from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Case, Finding, FindingEvidence, Evidence, AuditLog
from app.schemas.domain import FindingResponse, FindingReviewRequest, SupportingEvidenceItem

router = APIRouter(tags=["findings"])

@router.get("/cases/{case_id}/findings", response_model=List[FindingResponse])
def list_case_findings(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    findings = db.query(Finding).filter(Finding.case_id == case_id).order_by(Finding.finding_number.asc()).all()

    results = []
    for f in findings:
        supp_links = db.query(FindingEvidence, Evidence).join(
            Evidence, FindingEvidence.evidence_id == Evidence.id
        ).filter(FindingEvidence.finding_id == f.id).all()

        supp_items = [
            SupportingEvidenceItem(
                evidence_id=ev.id,
                original_filename=ev.original_filename,
                sha256=ev.sha256,
                support_type=fe.support_type,
                explanation=fe.explanation
            )
            for fe, ev in supp_links
        ]

        results.append(FindingResponse(
            id=f.id,
            case_id=f.case_id,
            finding_number=f.finding_number,
            title=f.title,
            description=f.description,
            finding_type=f.finding_type,
            derivation_method=f.derivation_method,
            confidence=f.confidence,
            confidence_explanation=f.confidence_explanation,
            limitations=f.limitations,
            review_status=f.review_status,
            analyst_notes=f.analyst_notes,
            relevant_events=f.relevant_events,
            relevant_entities=f.relevant_entities,
            created_at=f.created_at,
            reviewed_at=f.reviewed_at,
            reviewer_id=f.reviewer_id,
            supporting_evidence_items=supp_items
        ))

    return results

@router.post("/findings/{finding_id}/review", response_model=FindingResponse)
def review_finding(finding_id: str, req: FindingReviewRequest, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_status = finding.review_status
    finding.review_status = req.review_status
    finding.analyst_notes = req.analyst_notes
    finding.reviewer_id = req.reviewer_id or "Lead Analyst"
    finding.reviewed_at = datetime.now(timezone.utc)

    # Record Audit
    audit = AuditLog(
        case_id=finding.case_id,
        actor_id=finding.reviewer_id,
        action="FINDING_REVIEWED",
        target_type="FINDING",
        target_id=finding.id,
        details={
            "finding_number": finding.finding_number,
            "old_status": old_status,
            "new_status": req.review_status,
            "analyst_notes": req.analyst_notes
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(finding)

    supp_links = db.query(FindingEvidence, Evidence).join(
        Evidence, FindingEvidence.evidence_id == Evidence.id
    ).filter(FindingEvidence.finding_id == finding.id).all()

    supp_items = [
        SupportingEvidenceItem(
            evidence_id=ev.id,
            original_filename=ev.original_filename,
            sha256=ev.sha256,
            support_type=fe.support_type,
            explanation=fe.explanation
        )
        for fe, ev in supp_links
    ]

    return FindingResponse(
        id=finding.id,
        case_id=finding.case_id,
        finding_number=finding.finding_number,
        title=finding.title,
        description=finding.description,
        finding_type=finding.finding_type,
        derivation_method=finding.derivation_method,
        confidence=finding.confidence,
        confidence_explanation=finding.confidence_explanation,
        limitations=finding.limitations,
        review_status=finding.review_status,
        analyst_notes=finding.analyst_notes,
        relevant_events=finding.relevant_events,
        relevant_entities=finding.relevant_entities,
        created_at=finding.created_at,
        reviewed_at=finding.reviewed_at,
        reviewer_id=finding.reviewer_id,
        supporting_evidence_items=supp_items
    )
