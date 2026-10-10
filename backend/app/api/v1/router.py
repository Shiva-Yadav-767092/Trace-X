from fastapi import APIRouter
from app.api.v1.cases import router as cases_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.timeline import router as timeline_router
from app.api.v1.graph import router as graph_router
from app.api.v1.findings import router as findings_router
from app.api.v1.reports import router as reports_router
from app.api.v1.audit import router as audit_router

api_router = APIRouter()

api_router.include_router(cases_router)
api_router.include_router(evidence_router)
api_router.include_router(timeline_router)
api_router.include_router(graph_router)
api_router.include_router(findings_router)
api_router.include_router(reports_router)
api_router.include_router(audit_router)
