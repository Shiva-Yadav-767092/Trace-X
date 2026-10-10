from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Case, AuditLog
from app.reporting.service import ReportingService

router = APIRouter(tags=["reports"])

@router.get("/cases/{case_id}/report")
def get_case_report(
    case_id: str,
    format: str = Query("json", pattern="^(json|txt|csv)$"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    report_data = ReportingService.compile_case_report(db, case_id)

    # Record audit log
    audit = AuditLog(
        case_id=case_id,
        actor_id="Investigator",
        action="REPORT_GENERATED",
        target_type="REPORT",
        target_id=report_data["metadata"]["report_id"],
        details={"format": format}
    )
    db.add(audit)
    db.commit()

    if format == "txt":
        txt_content = ReportingService.generate_txt_report(report_data)
        return Response(
            content=txt_content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=TRACE_X_Report_{case.case_number}.txt"}
        )
    elif format == "csv":
        csv_content = ReportingService.generate_csv_events(report_data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=TRACE_X_Timeline_{case.case_number}.csv"}
        )
    else:
        return report_data
