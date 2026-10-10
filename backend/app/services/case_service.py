from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entities import Case, Evidence, Event, Relationship, Finding, AuditLog, ProcessingJob
from app.schemas.domain import CaseCreate, CaseUpdate, CaseStats, CaseResponse

class CaseService:
    @staticmethod
    def create_case(db: Session, data: CaseCreate) -> Case:
        case_num = data.case_number
        if not case_num:
            count = db.query(Case).count() + 1
            case_num = f"CASE-2026-{count:04d}"

        case = Case(
            case_number=case_num,
            title=data.title,
            description=data.description,
            investigator=data.investigator or "Investigator",
            status="OPEN"
        )
        db.add(case)
        db.flush()

        audit = AuditLog(
            case_id=case.id,
            actor_id=case.investigator,
            action="CASE_CREATED",
            target_type="CASE",
            target_id=case.id,
            details={"case_number": case.case_number, "title": case.title}
        )
        db.add(audit)
        db.commit()
        db.refresh(case)
        return case

    @staticmethod
    def get_case_stats(db: Session, case_id: str) -> CaseStats:
        ev_count = db.query(Evidence).filter(Evidence.case_id == case_id).count()
        event_count = db.query(Event).filter(Event.case_id == case_id).count()
        rel_count = db.query(Relationship).filter(Relationship.case_id == case_id).count()
        f_count = db.query(Finding).filter(Finding.case_id == case_id).count()
        pending_f_count = db.query(Finding).filter(Finding.case_id == case_id, Finding.review_status == "PENDING_REVIEW").count()
        return CaseStats(
            evidence_count=ev_count,
            event_count=event_count,
            relationship_count=rel_count,
            finding_count=f_count,
            pending_finding_count=pending_f_count
        )

    @staticmethod
    def get_overview_dashboard(db: Session) -> Dict[str, Any]:
        total_cases = db.query(Case).count()
        total_evidence = db.query(Evidence).count()
        total_events = db.query(Event).count()
        total_relationships = db.query(Relationship).count()
        pending_findings = db.query(Finding).filter(Finding.review_status == "PENDING_REVIEW").count()
        confirmed_findings = db.query(Finding).filter(Finding.review_status == "CONFIRMED").count()

        # Evidence by media type
        ev_types = db.query(Evidence.media_type, func.count(Evidence.id)).group_by(Evidence.media_type).all()
        evidence_by_type = {t or "unknown": c for t, c in ev_types}

        # Events by category
        ev_cats = db.query(Event.category, func.count(Event.id)).group_by(Event.category).all()
        events_by_category = {c or "GENERAL": count for c, count in ev_cats}

        recent_cases = db.query(Case).order_by(Case.created_at.desc()).limit(5).all()
        recent_cases_with_stats = []
        for c in recent_cases:
            st = CaseService.get_case_stats(db, c.id)
            c_dict = {
                "id": c.id,
                "case_number": c.case_number,
                "title": c.title,
                "description": c.description,
                "status": c.status,
                "investigator": c.investigator,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "stats": st
            }
            recent_cases_with_stats.append(c_dict)

        recent_jobs = db.query(ProcessingJob).order_by(ProcessingJob.started_at.desc()).limit(5).all()

        return {
            "total_cases": total_cases,
            "total_evidence": total_evidence,
            "total_events": total_events,
            "total_relationships": total_relationships,
            "pending_findings": pending_findings,
            "confirmed_findings": confirmed_findings,
            "evidence_by_type": evidence_by_type,
            "events_by_category": events_by_category,
            "recent_cases": recent_cases_with_stats,
            "recent_jobs": recent_jobs,
        }
