from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ----------------- Case Schemas -----------------
class CaseCreate(BaseModel):
    case_number: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    investigator: Optional[str] = "Investigator"

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    investigator: Optional[str] = None

class CaseStats(BaseModel):
    evidence_count: int = 0
    event_count: int = 0
    relationship_count: int = 0
    finding_count: int = 0
    pending_finding_count: int = 0

class CaseResponse(BaseModel):
    id: str
    case_number: str
    title: str
    description: Optional[str] = None
    status: str
    investigator: str
    created_at: datetime
    updated_at: datetime
    stats: Optional[CaseStats] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Evidence Schemas -----------------
class EvidenceResponse(BaseModel):
    id: str
    case_id: str
    original_filename: str
    storage_key: str
    media_type: str
    size_bytes: int
    sha256: str
    acquisition_metadata: Optional[Dict[str, Any]] = None
    uploaded_at: datetime
    processing_status: str
    processing_error: Optional[str] = None
    last_verified_at: Optional[datetime] = None
    verification_status: str

    model_config = ConfigDict(from_attributes=True)

class EvidenceVerifyResponse(BaseModel):
    evidence_id: str
    original_filename: str
    expected_sha256: str
    calculated_sha256: str
    matches: bool
    verification_timestamp: datetime
    verification_status: str
    details: str

# ----------------- Event Schemas -----------------
class EventResponse(BaseModel):
    id: str
    case_id: str
    evidence_id: str
    event_type: str
    category: str
    severity: str
    description: str
    observed_timestamp: Optional[str] = None
    normalized_timestamp_utc: Optional[datetime] = None
    timestamp_precision: str
    timezone_provenance: str
    extracted_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Entity Schemas -----------------
class EntityResponse(BaseModel):
    id: str
    case_id: str
    entity_type: str
    normalized_value: str
    display_value: str
    metadata: Optional[Dict[str, Any]] = Field(default=None, alias="metadata_")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

# ----------------- Relationship Schemas -----------------
class RelationshipResponse(BaseModel):
    id: str
    case_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    derivation_method: str
    rule_name: str
    explanation: str
    confidence: float
    supporting_evidence: Optional[List[str]] = None
    review_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Finding Schemas -----------------
class SupportingEvidenceItem(BaseModel):
    evidence_id: str
    original_filename: str
    sha256: str
    support_type: str
    explanation: str

class FindingResponse(BaseModel):
    id: str
    case_id: str
    finding_number: str
    title: str
    description: str
    finding_type: str
    derivation_method: str
    confidence: float
    confidence_explanation: str
    limitations: str
    review_status: str
    analyst_notes: Optional[str] = None
    relevant_events: Optional[List[str]] = None
    relevant_entities: Optional[List[str]] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    supporting_evidence_items: Optional[List[SupportingEvidenceItem]] = None

    model_config = ConfigDict(from_attributes=True)

class FindingReviewRequest(BaseModel):
    review_status: str = Field(..., pattern="^(CONFIRMED|REJECTED|NEEDS_FURTHER_INVESTIGATION)$")
    analyst_notes: Optional[str] = None
    reviewer_id: Optional[str] = "Lead Analyst"

# ----------------- Graph Schemas -----------------
class GraphNode(BaseModel):
    id: str
    label: str
    type: str # EVIDENCE, EMAIL, URL, DOMAIN, IP_ADDRESS, FILE_HASH, USER_ACCOUNT, HOST_DEVICE, EVENT, FINDING
    data: Dict[str, Any]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    relationship_type: str
    derivation_method: str
    confidence: float
    explanation: str
    supporting_evidence: Optional[List[str]] = None

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# ----------------- Audit Log Schemas -----------------
class AuditLogResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    actor_id: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Processing Job Schemas -----------------
class ProcessingJobResponse(BaseModel):
    id: str
    case_id: str
    job_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_summary: Optional[str] = None
    progress_pct: int
    details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Overview Dashboard Schemas -----------------
class OverviewStatsResponse(BaseModel):
    total_cases: int
    total_evidence: int
    total_events: int
    total_relationships: int
    pending_findings: int
    confirmed_findings: int
    evidence_by_type: Dict[str, int]
    events_by_category: Dict[str, int]
    recent_cases: List[CaseResponse]
    recent_jobs: List[ProcessingJobResponse]
