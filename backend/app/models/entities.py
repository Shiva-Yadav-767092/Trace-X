import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON, Index, Boolean
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="OPEN", nullable=False, index=True) # OPEN, IN_PROGRESS, UNDER_REVIEW, CLOSED
    investigator = Column(String(100), default="Investigator", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    relationships = relationship("Relationship", back_populates="case", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="case", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False)
    media_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)
    acquisition_metadata = Column(JSON, nullable=True)
    uploaded_at = Column(DateTime, default=utc_now, nullable=False)
    processing_status = Column(String(50), default="PENDING", nullable=False) # PENDING, PROCESSING, PROCESSED, ERROR, UNSUPPORTED
    processing_error = Column(Text, nullable=True)
    last_verified_at = Column(DateTime, nullable=True)
    verification_status = Column(String(50), default="UNVERIFIED", nullable=False) # UNVERIFIED, VERIFIED_VALID, VERIFIED_CORRUPTED

    case = relationship("Case", back_populates="evidence")
    events = relationship("Event", back_populates="evidence", cascade="all, delete-orphan")
    finding_links = relationship("FindingEvidence", back_populates="evidence", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="GENERAL", index=True)
    severity = Column(String(50), nullable=False, default="INFO") # INFO, LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    observed_timestamp = Column(String(100), nullable=True) # Raw source timestamp string
    normalized_timestamp_utc = Column(DateTime, nullable=True, index=True)
    timestamp_precision = Column(String(50), default="EXACT_SECOND", nullable=False) # EXACT_SECOND, MINUTE, HOUR, DATE_ONLY, UNCERTAIN, UNKNOWN
    timezone_provenance = Column(String(100), default="UTC", nullable=False)
    extracted_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="events")
    evidence = relationship("Evidence", back_populates="events")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True) # EMAIL, URL, DOMAIN, IP_ADDRESS, FILE_HASH, USER_ACCOUNT, HOST_DEVICE
    normalized_value = Column(String(500), nullable=False, index=True)
    display_value = Column(String(500), nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="entities")

    __table_args__ = (
        Index("ix_case_entity_normalized", "case_id", "entity_type", "normalized_value", unique=True),
    )


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    source_entity_id = Column(String(36), nullable=False, index=True)
    target_entity_id = Column(String(36), nullable=False, index=True)
    relationship_type = Column(String(100), nullable=False)
    derivation_method = Column(String(50), nullable=False, default="RULE_DERIVED") # DIRECTLY_OBSERVED, RULE_DERIVED, ANALYST_CONFIRMED, HYPOTHESIZED
    rule_name = Column(String(100), nullable=False)
    explanation = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False, default=1.0)
    supporting_evidence = Column(JSON, nullable=True) # list of evidence/event IDs
    review_status = Column(String(50), default="CONFIRMED", nullable=False) # PENDING, CONFIRMED, REJECTED
    created_at = Column(DateTime, default=utc_now, nullable=False)

    case = relationship("Case", back_populates="relationships")

    __table_args__ = (
        Index("ix_case_rel_source_target", "case_id", "source_entity_id", "target_entity_id", "relationship_type", unique=True),
    )


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_number = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    finding_type = Column(String(100), nullable=False) # INITIAL_ACCESS, CREDENTIAL_COMPROMISE, EXECUTION, LATERAL_MOVEMENT, COMMAND_AND_CONTROL, DATA_EXFILTRATION, ANOMALY
    derivation_method = Column(String(50), nullable=False, default="DETERMINISTIC_RULE") # DETERMINISTIC_RULE, TEMPORAL_CORRELATION, MULTI_ARTIFACT_PIVOT, AI_SYNTHESIS
    confidence = Column(Float, nullable=False, default=0.85)
    confidence_explanation = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)
    review_status = Column(String(50), default="PENDING_REVIEW", nullable=False, index=True) # PENDING_REVIEW, CONFIRMED, REJECTED, NEEDS_FURTHER_INVESTIGATION
    analyst_notes = Column(Text, nullable=True)
    relevant_events = Column(JSON, nullable=True) # list of event IDs
    relevant_entities = Column(JSON, nullable=True) # list of entity IDs
    created_at = Column(DateTime, default=utc_now, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_id = Column(String(100), nullable=True)

    case = relationship("Case", back_populates="findings")
    evidence_links = relationship("FindingEvidence", back_populates="finding", cascade="all, delete-orphan")


class FindingEvidence(Base):
    __tablename__ = "finding_evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    support_type = Column(String(50), default="PRIMARY_ARTIFACT", nullable=False) # PRIMARY_ARTIFACT, CORROBORATING, CONTEXTUAL
    explanation = Column(Text, nullable=False)

    finding = relationship("Finding", back_populates="evidence_links")
    evidence = relationship("Evidence", back_populates="finding_links")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True)
    actor_id = Column(String(100), nullable=False, default="Investigator")
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=False) # CASE, EVIDENCE, EVENT, FINDING, REPORT, JOB
    target_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    details = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="audit_logs")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False, default="PARSE_AND_CORRELATE")
    status = Column(String(50), nullable=False, default="PENDING", index=True) # PENDING, IN_PROGRESS, COMPLETED, FAILED
    started_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_summary = Column(Text, nullable=True)
    progress_pct = Column(Integer, default=0, nullable=False)
    details = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="processing_jobs")
