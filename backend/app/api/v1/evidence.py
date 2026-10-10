from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import Case, Evidence, ProcessingJob
from app.schemas.domain import EvidenceResponse, EvidenceVerifyResponse
from app.services.evidence_service import EvidenceService
from app.correlation.engine import run_correlation_pipeline

router = APIRouter(tags=["evidence"])

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def list_case_evidence(
    case_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = db.query(Evidence).filter(Evidence.case_id == case_id)
    if status:
        query = query.filter(Evidence.processing_status == status.upper())
    return query.order_by(Evidence.uploaded_at.desc()).all()

@router.post("/cases/{case_id}/evidence", response_model=EvidenceResponse)
def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(""),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return EvidenceService.process_uploaded_evidence(
        db=db,
        case_id=case_id,
        upload_file=file,
        collector_notes=notes or ""
    )

@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev

@router.get("/evidence/{evidence_id}/download")
def download_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    file_path = settings.STORAGE_DIR / ev.storage_key
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Evidence file missing on disk")

    return FileResponse(
        path=file_path,
        filename=ev.original_filename,
        media_type=ev.media_type
    )

@router.post("/evidence/{evidence_id}/verify", response_model=EvidenceVerifyResponse)
def verify_evidence_hash(evidence_id: str, db: Session = Depends(get_db)):
    return EvidenceService.verify_integrity(db, evidence_id)

@router.post("/cases/{case_id}/analysis")
def trigger_analysis(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    job = ProcessingJob(
        case_id=case_id,
        job_type="PARSE_AND_CORRELATE",
        status="IN_PROGRESS",
        progress_pct=20
    )
    db.add(job)
    db.commit()

    try:
        res = run_correlation_pipeline(db, case_id)
        job.status = "COMPLETED"
        job.progress_pct = 100
        job.details = res
        db.commit()
        return res
    except Exception as e:
        job.status = "FAILED"
        job.error_summary = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")
