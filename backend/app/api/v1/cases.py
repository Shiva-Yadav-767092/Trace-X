from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Case, ProcessingJob, AuditLog
from app.schemas.domain import (
    CaseCreate, CaseUpdate, CaseResponse, OverviewStatsResponse, ProcessingJobResponse
)
from app.services.case_service import CaseService
from app.services.demo_seeder import DemoSeeder

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("/overview", response_model=OverviewStatsResponse)
def get_overview(db: Session = Depends(get_db)):
    return CaseService.get_overview_dashboard(db)

@router.post("/demo-seed")
def seed_demo_case(db: Session = Depends(get_db)):
    return DemoSeeder.seed_hackathon_demo(db)

@router.get("", response_model=List[CaseResponse])
def list_cases(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status.upper())
    cases = query.order_by(Case.created_at.desc()).all()

    result = []
    for c in cases:
        st = CaseService.get_case_stats(db, c.id)
        result.append(CaseResponse(
            id=c.id,
            case_number=c.case_number,
            title=c.title,
            description=c.description,
            status=c.status,
            investigator=c.investigator,
            created_at=c.created_at,
            updated_at=c.updated_at,
            stats=st
        ))
    return result

@router.post("", response_model=CaseResponse)
def create_case(data: CaseCreate, db: Session = Depends(get_db)):
    case = CaseService.create_case(db, data)
    st = CaseService.get_case_stats(db, case.id)
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        investigator=case.investigator,
        created_at=case.created_at,
        updated_at=case.updated_at,
        stats=st
    )

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    st = CaseService.get_case_stats(db, case.id)
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        investigator=case.investigator,
        created_at=case.created_at,
        updated_at=case.updated_at,
        stats=st
    )

@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: str, data: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = case.status
    if data.title is not None:
        case.title = data.title
    if data.description is not None:
        case.description = data.description
    if data.status is not None:
        case.status = data.status.upper()
    if data.investigator is not None:
        case.investigator = data.investigator

    if data.status and data.status.upper() != old_status:
        audit = AuditLog(
            case_id=case.id,
            actor_id=case.investigator,
            action="CASE_STATUS_CHANGED",
            target_type="CASE",
            target_id=case.id,
            details={"old_status": old_status, "new_status": case.status}
        )
        db.add(audit)

    db.commit()
    db.refresh(case)
    st = CaseService.get_case_stats(db, case.id)
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        investigator=case.investigator,
        created_at=case.created_at,
        updated_at=case.updated_at,
        stats=st
    )

@router.get("/{case_id}/jobs", response_model=List[ProcessingJobResponse])
def get_case_jobs(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return db.query(ProcessingJob).filter(ProcessingJob.case_id == case_id).order_by(ProcessingJob.started_at.desc()).all()
