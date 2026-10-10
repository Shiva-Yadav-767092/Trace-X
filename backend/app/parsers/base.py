from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

@dataclass
class ExtractedEvent:
    event_type: str
    category: str # AUTHENTICATION, NETWORK, EXECUTION, EMAIL, SYSTEM, EXFILTRATION, BENIGN
    severity: str # INFO, LOW, MEDIUM, HIGH, CRITICAL
    description: str
    observed_timestamp: Optional[str]
    normalized_timestamp_utc: Optional[datetime]
    timestamp_precision: str # EXACT_SECOND, MINUTE, HOUR, DATE_ONLY, UNCERTAIN, UNKNOWN
    timezone_provenance: str
    extracted_metadata: Dict[str, Any] = field(default_factory=dict)
    related_entities: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class ParserResult:
    events: List[ExtractedEvent] = field(default_factory=list)
    entities: List[Dict[str, Any]] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    format_name: str = "UNKNOWN"
    metadata: Dict[str, Any] = field(default_factory=dict)

class BaseParser(ABC):
    @abstractmethod
    def can_parse(self, filename: str, media_type: str) -> bool:
        """Determines if this parser can handle the given file."""
        pass

    @abstractmethod
    def parse(self, file_path: Path, filename: str) -> ParserResult:
        """Parses the file and extracts events and entities."""
        pass
