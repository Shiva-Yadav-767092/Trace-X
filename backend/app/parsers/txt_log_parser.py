from pathlib import Path
from app.parsers.base import BaseParser, ParserResult, ExtractedEvent
from app.parsers.timestamp_utils import normalize_timestamp
from app.parsers.regex_indicators import extract_indicators_from_text

class TxtLogParser(BaseParser):
    def can_parse(self, filename: str, media_type: str) -> bool:
        lower = filename.lower()
        return lower.endswith(".txt") or lower.endswith(".log") or "text/plain" in media_type

    def parse(self, file_path: Path, filename: str) -> ParserResult:
        result = ParserResult(format_name="TXT_LOG", metadata={"filename": filename})
        all_entities = []

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception as e:
            result.errors.append(f"Failed to read file: {str(e)}")
            return result

        for line_num, raw_line in enumerate(lines, start=1):
            line = raw_line.strip()
            if not line:
                continue

            # Normalize timestamp
            norm_dt, precision, tz_prov = normalize_timestamp(line)

            # Categorize event
            line_lower = line.lower()
            category = "SYSTEM"
            severity = "INFO"

            if any(k in line_lower for k in ["failed password", "authentication failure", "invalid user", "login failed"]):
                category = "AUTHENTICATION"
                severity = "HIGH"
            elif any(k in line_lower for k in ["accepted password", "session opened", "login successful"]):
                category = "AUTHENTICATION"
                severity = "MEDIUM"
            elif any(k in line_lower for k in ["powershell", "cmd.exe", "whoami", "mimikatz", "process created", "executed"]):
                category = "EXECUTION"
                severity = "HIGH"
            elif any(k in line_lower for k in ["http", "get /", "post /", "connection reset", "port 443", "port 80"]):
                category = "NETWORK"
                severity = "MEDIUM" if "suspicious" in line_lower else "LOW"
            elif any(k in line_lower for k in ["backup completed", "routine backup", "cron run", "scheduled maintenance"]):
                category = "BENIGN"
                severity = "INFO"

            # Extract observable indicators
            line_entities = extract_indicators_from_text(line)
            all_entities.extend(line_entities)

            # Disclose timestamp uncertainty
            desc = line
            if precision in ("UNCERTAIN", "UNKNOWN"):
                desc = f"[Uncertain Timestamp] {line}"

            event = ExtractedEvent(
                event_type="LOG_ENTRY",
                category=category,
                severity=severity,
                description=desc,
                observed_timestamp=line[:60] if norm_dt else "UNKNOWN",
                normalized_timestamp_utc=norm_dt,
                timestamp_precision=precision,
                timezone_provenance=tz_prov,
                extracted_metadata={
                    "source_line": line_num,
                    "raw_line": line,
                    "indicators_found": len(line_entities)
                },
                related_entities=line_entities
            )
            result.events.append(event)

        result.entities = all_entities
        result.metadata["total_lines_parsed"] = len(lines)
        return result
