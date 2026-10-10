from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.models.entities import Case, Event
from app.schemas.domain import EventResponse

router = APIRouter(tags=["timeline"])

@router.get("/cases/{case_id}/timeline", response_model=List[EventResponse])
def get_case_timeline(
    case_id: str,
    search: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    evidence_id: Optional[str] = None,
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = db.query(Event).filter(Event.case_id == case_id)

    if search:
        s = f"%{search}%"
        query = query.filter(or_(Event.description.ilike(s), Event.event_type.ilike(s), Event.observed_timestamp.ilike(s)))

    if category:
        query = query.filter(Event.category == category.upper())

    if severity:
        query = query.filter(Event.severity == severity.upper())

    if evidence_id:
        query = query.filter(Event.evidence_id == evidence_id)

    if sort_order == "desc":
        query = query.order_by(Event.normalized_timestamp_utc.desc().nullslast())
    else:
        query = query.order_by(Event.normalized_timestamp_utc.asc().nullslast())

    return query.all()
