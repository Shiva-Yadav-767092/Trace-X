from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Case, AuditLog
from app.schemas.domain import AuditLogResponse

router = APIRouter(tags=["audit"])

@router.get("/cases/{case_id}/audit", response_model=List[AuditLogResponse])
def get_case_audit_logs(
    case_id: str,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = db.query(AuditLog).filter(AuditLog.case_id == case_id)
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if target_type:
        query = query.filter(AuditLog.target_type == target_type.upper())

    return query.order_by(AuditLog.timestamp.desc()).all()
