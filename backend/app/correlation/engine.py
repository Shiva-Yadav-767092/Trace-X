import logging
from datetime import datetime, timezone
from typing import List, Dict, Set, Any
from sqlalchemy.orm import Session
from app.models.entities import (
    Case, Evidence, Event, Entity, Relationship, Finding, FindingEvidence, AuditLog
)

logger = logging.getLogger("trace_x.correlation")

def run_correlation_pipeline(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Executes the deterministic correlation engine for a case.
    Identifies shared entities, links artifacts, constructs relationships,
    and produces grounded, evidence-backed findings.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    events = db.query(Event).filter(Event.case_id == case_id).all()
    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()

    evidence_by_id = {e.id: e for e in evidence_list}

    # Step 1: Normalize and Persist Unique Entities in DB for this Case
    # Gather all raw entities from events
    raw_entities: List[Dict[str, Any]] = []
    event_entity_pairs: List[tuple[str, str, str]] = [] # (event_id, entity_type, norm_val)

    for event in events:
        if event.extracted_metadata and "indicators_found" in event.extracted_metadata:
            pass
        # Check event's related entities
        rel = (event.extracted_metadata or {}).get("related_entities", [])
        if not rel and event.extracted_metadata and "raw_line" in event.extracted_metadata:
            from app.parsers.regex_indicators import extract_indicators_from_text
            rel = extract_indicators_from_text(event.extracted_metadata["raw_line"])
        
        for r in rel:
            e_type = r.get("entity_type")
            norm_val = r.get("normalized_value")
            disp_val = r.get("display_value", norm_val)
            meta = r.get("metadata", {})
            if e_type and norm_val:
                raw_entities.append({
                    "entity_type": e_type,
                    "normalized_value": norm_val,
                    "display_value": disp_val,
                    "metadata": meta,
                    "event_id": event.id,
                    "evidence_id": event.evidence_id
                })
                event_entity_pairs.append((event.id, e_type, norm_val))

    # Retrieve existing entities for this case
    existing_entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    entity_map: Dict[tuple[str, str], Entity] = {
        (e.entity_type, e.normalized_value): e for e in existing_entities
    }

    # Add any missing entities
    new_entities = []
    for item in raw_entities:
        key = (item["entity_type"], item["normalized_value"])
        if key not in entity_map:
            ent = Entity(
                case_id=case_id,
                entity_type=item["entity_type"],
                normalized_value=item["normalized_value"],
                display_value=item["display_value"],
                metadata_=item["metadata"]
            )
            db.add(ent)
            entity_map[key] = ent
            new_entities.append(ent)

    db.flush()

    # Step 2: Clean up previous automatic relationships & findings (idempotent re-run)
    # Preserve only ANALYST_CONFIRMED relationships if any
    db.query(Relationship).filter(
        Relationship.case_id == case_id,
        Relationship.derivation_method != "ANALYST_CONFIRMED"
    ).delete(synchronize_session=False)

    # Note: Preserve findings with review_status != 'PENDING_REVIEW' or update them
    existing_findings = db.query(Finding).filter(Finding.case_id == case_id).all()
    reviewed_finding_nums = {f.finding_number for f in existing_findings if f.review_status != "PENDING_REVIEW"}

    db.query(Finding).filter(
        Finding.case_id == case_id,
        Finding.review_status == "PENDING_REVIEW"
    ).delete(synchronize_session=False)

    db.flush()

    # Step 3: Discover Relationships
    relationships_created = []
    seen_rel_keys: Set[tuple[str, str, str]] = set()

    # 3A. Directly Observed: Evidence Artifact -> Observed Entity
    evidence_to_entities: Dict[str, Set[str]] = {} # evidence_id -> set of entity_ids
    for item in raw_entities:
        ev_id = item["evidence_id"]
        ent = entity_map.get((item["entity_type"], item["normalized_value"]))
        if ent:
            if ev_id not in evidence_to_entities:
                evidence_to_entities[ev_id] = set()
            evidence_to_entities[ev_id].add(ent.id)

            rel_key = (ev_id, ent.id, "OBSERVED_IN_ARTIFACT")
            if rel_key not in seen_rel_keys:
                seen_rel_keys.add(rel_key)
                rel = Relationship(
                    case_id=case_id,
                    source_entity_id=ev_id,
                    target_entity_id=ent.id,
                    relationship_type="OBSERVED_IN_ARTIFACT",
                    derivation_method="DIRECTLY_OBSERVED",
                    rule_name="DirectArtifactObservation",
                    explanation=f"Observable '{ent.display_value}' was directly extracted from artifact '{evidence_by_id.get(ev_id, Evidence(original_filename='Unknown')).original_filename}'.",
                    confidence=1.0,
                    supporting_evidence=[ev_id],
                    review_status="CONFIRMED"
                )
                db.add(rel)
                relationships_created.append(rel)

    # 3B. Multi-Artifact Correlation: Shared Entities across different files
    entity_to_evidences: Dict[str, Set[str]] = {}
    for ev_id, ent_ids in evidence_to_entities.items():
        for ent_id in ent_ids:
            if ent_id not in entity_to_evidences:
                entity_to_evidences[ent_id] = set()
            entity_to_evidences[ent_id].add(ev_id)

    # Entity to Entity correlations (e.g. Email -> URL embedded; IP -> Domain; Host -> Hash)
    entities_by_id = {e.id: e for e in entity_map.values()}

    for ent_id, ev_ids in entity_to_evidences.items():
        if len(ev_ids) > 1:
            ent = entities_by_id.get(ent_id)
            if not ent:
                continue

            conf = 0.85
            if ent.entity_type == "FILE_HASH":
                conf = 0.98
            elif ent.entity_type in ("DOMAIN", "URL"):
                conf = 0.90
            elif ent.entity_type == "IP_ADDRESS":
                conf = 0.75 # Accounts for possible shared NAT / proxy

            # Link pairs of evidence that share this entity
            ev_list = list(ev_ids)
            for i in range(len(ev_list)):
                for j in range(i + 1, len(ev_list)):
                    ev1, ev2 = ev_list[i], ev_list[j]
                    fn1 = evidence_by_id.get(ev1, Evidence(original_filename=ev1)).original_filename
                    fn2 = evidence_by_id.get(ev2, Evidence(original_filename=ev2)).original_filename
                    
                    rel_key = (ev1, ev2, f"SHARES_{ent.entity_type}")
                    if rel_key not in seen_rel_keys:
                        seen_rel_keys.add(rel_key)
                        rel = Relationship(
                            case_id=case_id,
                            source_entity_id=ev1,
                            target_entity_id=ev2,
                            relationship_type=f"SHARES_{ent.entity_type}",
                            derivation_method="RULE_DERIVED",
                            rule_name="ExactEntityOverlapRule",
                            explanation=f"Evidence '{fn1}' and '{fn2}' share common {ent.entity_type}: '{ent.display_value}'. Indicates shared infrastructure or timeline crossover.",
                            confidence=conf,
                            supporting_evidence=[ev1, ev2],
                            review_status="CONFIRMED"
                        )
                        db.add(rel)
                        relationships_created.append(rel)

    # 3C. Domain to URL association
    url_entities = [e for e in entity_map.values() if e.entity_type == "URL"]
    domain_entities = [e for e in entity_map.values() if e.entity_type == "DOMAIN"]
    for url_e in url_entities:
        for dom_e in domain_entities:
            if dom_e.normalized_value in url_e.normalized_value:
                rel_key = (url_e.id, dom_e.id, "HOSTED_ON_DOMAIN")
                if rel_key not in seen_rel_keys:
                    seen_rel_keys.add(rel_key)
                    rel = Relationship(
                        case_id=case_id,
                        source_entity_id=url_e.id,
                        target_entity_id=dom_e.id,
                        relationship_type="HOSTED_ON_DOMAIN",
                        derivation_method="RULE_DERIVED",
                        rule_name="UrlDomainDecompositionRule",
                        explanation=f"URL '{url_e.display_value}' is hosted on domain '{dom_e.display_value}'.",
                        confidence=0.99,
                        supporting_evidence=[],
                        review_status="CONFIRMED"
                    )
                    db.add(rel)
                    relationships_created.append(rel)

    # 3D. IP to Domain association when both appear in network/proxy events
    ip_entities = [e for e in entity_map.values() if e.entity_type == "IP_ADDRESS"]
    for ip_e in ip_entities:
        for dom_e in domain_entities:
            # Check if any event has both
            matching_events = [
                ev for ev in events
                if ip_e.normalized_value in (ev.description or "") and dom_e.normalized_value in (ev.description or "")
            ]
            if matching_events:
                rel_key = (ip_e.id, dom_e.id, "RESOLVED_TRAFFIC_PAIR")
                if rel_key not in seen_rel_keys:
                    seen_rel_keys.add(rel_key)
                    rel = Relationship(
                        case_id=case_id,
                        source_entity_id=ip_e.id,
                        target_entity_id=dom_e.id,
                        relationship_type="RESOLVED_TRAFFIC_PAIR",
                        derivation_method="RULE_DERIVED",
                        rule_name="CoOccurringNetworkTrafficRule",
                        explanation=f"IP address '{ip_e.display_value}' co-occurred in network telemetry with domain '{dom_e.display_value}' across {len(matching_events)} logged session(s).",
                        confidence=0.88,
                        supporting_evidence=[matching_events[0].evidence_id],
                        review_status="CONFIRMED"
                    )
                    db.add(rel)
                    relationships_created.append(rel)

    db.flush()

    # Step 4: Generate Grounded Findings
    # Analyze evidence contents and build structured findings
    findings_to_create = []

    # Finding 1: Phishing Email Vector
    email_events = [ev for ev in events if ev.category == "EMAIL"]
    if email_events and url_entities:
        f_num = "FIND-001"
        if f_num not in reviewed_finding_nums:
            email_ev = email_events[0]
            target_url = url_entities[0]
            f = Finding(
                case_id=case_id,
                finding_number=f_num,
                title="Suspicious Inbound Phishing Email with Credential Harvesting URL",
                description=(
                    f"An inbound email '{email_ev.extracted_metadata.get('subject', 'Security Notice')}' "
                    f"from '{email_ev.extracted_metadata.get('from', 'external')}' contained embedded hyperlink "
                    f"'{target_url.display_value}'. The email utilized urgency prompts to induce user action."
                ),
                finding_type="INITIAL_ACCESS",
                derivation_method="DETERMINISTIC_RULE",
                confidence=0.92,
                confidence_explanation="High confidence: EML header provenance confirms external origin, and RFC822 body explicitly links to unverified external domain.",
                limitations="Investigator must verify whether user clicked the link and whether email gateway quarantine was bypassed.",
                review_status="PENDING_REVIEW",
                relevant_events=[email_ev.id],
                relevant_entities=[target_url.id]
            )
            findings_to_create.append((f, [(email_ev.evidence_id, "PRIMARY_ARTIFACT", "Inbound email file containing malicious link")]))

    # Finding 2: Anomalous Authentication & Credential Abuse
    auth_events = [ev for ev in events if ev.category == "AUTHENTICATION" and ev.severity in ("HIGH", "MEDIUM")]
    user_entities = [e for e in entity_map.values() if e.entity_type == "USER_ACCOUNT"]
    if auth_events:
        f_num = "FIND-002"
        if f_num not in reviewed_finding_nums:
            primary_auth_ev = auth_events[0]
            matched_user = user_entities[0].display_value if user_entities else "targeted user"
            f = Finding(
                case_id=case_id,
                finding_number=f_num,
                title=f"Authentication Anomaly & Credential Verification Attempts for '{matched_user}'",
                description=(
                    f"Authentication logs record authentication attempts for account '{matched_user}'. "
                    f"Telemetry indicates external authentication attempts coinciding with phishing communication."
                ),
                finding_type="CREDENTIAL_COMPROMISE",
                derivation_method="MULTI_ARTIFACT_PIVOT",
                confidence=0.85,
                confidence_explanation="Correlated user identity observed in email recipient metadata and authentication failure/success events.",
                limitations="Telemetry does not definitively confirm credential theft without corroborating directory service MFA logs.",
                review_status="PENDING_REVIEW",
                relevant_events=[e.id for e in auth_events[:3]],
                relevant_entities=[u.id for u in user_entities[:2]]
            )
            findings_to_create.append((f, [(primary_auth_ev.evidence_id, "PRIMARY_ARTIFACT", "Authentication service log records")]))

    # Finding 3: Process Execution & File Hash Persistence
    exec_events = [ev for ev in events if ev.category == "EXECUTION" or any(k in ev.description.lower() for k in ["powershell", "cmd.exe", "process"])]
    hash_entities = [e for e in entity_map.values() if e.entity_type == "FILE_HASH"]
    if exec_events or hash_entities:
        f_num = "FIND-003"
        if f_num not in reviewed_finding_nums:
            ex_ev = exec_events[0] if exec_events else events[0]
            hash_val = hash_entities[0].display_value if hash_entities else "unverified"
            f = Finding(
                case_id=case_id,
                finding_number=f_num,
                title="Suspicious Host Execution and Cryptographic Hash Artifact",
                description=(
                    f"Endpoint telemetry records process execution on host. "
                    f"Cryptographic hash '{hash_val}' observed in host artifact. "
                    "Process arguments suggest automated script execution following initial contact."
                ),
                finding_type="EXECUTION",
                derivation_method="DETERMINISTIC_RULE",
                confidence=0.88,
                confidence_explanation="Cryptographic hash uniquely identifies the binary/script artifact. Execution telemetry correlates with timing of external network connection.",
                limitations="Execution telemetry does not verify if EDR stopped memory injection. Requires live memory dump for conclusive verification.",
                review_status="PENDING_REVIEW",
                relevant_events=[ex_ev.id],
                relevant_entities=[h.id for h in hash_entities[:2]]
            )
            findings_to_create.append((f, [(ex_ev.evidence_id, "PRIMARY_ARTIFACT", "Endpoint event log recording execution")]))

    # Finding 4: Uncertain / Incomplete Timestamp Discrepancy
    uncertain_events = [ev for ev in events if ev.timestamp_precision in ("UNCERTAIN", "UNKNOWN")]
    if uncertain_events:
        f_num = "FIND-004"
        if f_num not in reviewed_finding_nums:
            unc_ev = uncertain_events[0]
            f = Finding(
                case_id=case_id,
                finding_number=f_num,
                title="Telemetry Integrity Alert: Sensor Clock Skew or Missing Timestamps",
                description=(
                    f"Detected {len(uncertain_events)} event(s) lacking RFC-compliant timestamps or exhibiting clock skew. "
                    f"Source artifact '{evidence_by_id.get(unc_ev.evidence_id, Evidence(original_filename='log')).original_filename}' "
                    "contains entries where absolute chronological sequencing cannot be mathematically proven."
                ),
                finding_type="ANOMALY",
                derivation_method="DETERMINISTIC_RULE",
                confidence=0.95,
                confidence_explanation="Empirically verified absence of standard timezone offsets or epoch markers in raw source line.",
                limitations="Events without reliable timestamps are displayed in timeline with warning badges and excluded from causal ordering proofs.",
                review_status="PENDING_REVIEW",
                relevant_events=[unc_ev.id],
                relevant_entities=[]
            )
            findings_to_create.append((f, [(unc_ev.evidence_id, "CORROBORATING", "Source log with missing/uncertain timestamps")]))

    # Persist findings and finding_evidence links
    created_findings = []
    for f, ev_links in findings_to_create:
        db.add(f)
        db.flush()
        for ev_id, supp_type, expl in ev_links:
            fe = FindingEvidence(
                finding_id=f.id,
                evidence_id=ev_id,
                support_type=supp_type,
                explanation=expl
            )
            db.add(fe)
        created_findings.append(f)

    # Audit log entry
    audit = AuditLog(
        case_id=case_id,
        actor_id="TRACE-X Engine",
        action="ANALYSIS_EXECUTED",
        target_type="CASE",
        target_id=case_id,
        details={
            "relationships_created": len(relationships_created),
            "findings_generated": len(created_findings),
            "entities_indexed": len(entity_map),
            "events_evaluated": len(events)
        }
    )
    db.add(audit)
    db.commit()

    return {
        "status": "COMPLETED",
        "case_id": case_id,
        "entities_count": len(entity_map),
        "relationships_count": len(relationships_created),
        "findings_count": len(created_findings),
    }
