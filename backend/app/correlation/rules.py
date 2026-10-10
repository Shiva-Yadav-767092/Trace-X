from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from datetime import datetime

@dataclass
class CorrelationCandidate:
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    derivation_method: str
    rule_name: str
    explanation: str
    confidence: float
    supporting_evidence: List[str]

@dataclass
class GeneratedFinding:
    finding_number: str
    title: str
    description: str
    finding_type: str
    derivation_method: str
    confidence: float
    confidence_explanation: str
    limitations: str
    relevant_events: List[str]
    relevant_entities: List[str]
    supporting_evidence_map: List[Dict[str, str]] # list of {evidence_id, support_type, explanation}
