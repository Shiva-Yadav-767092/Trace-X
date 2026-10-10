import csv
from pathlib import Path
from app.parsers.base import BaseParser, ParserResult, ExtractedEvent
from app.parsers.timestamp_utils import normalize_timestamp
from app.parsers.regex_indicators import extract_indicators_from_text

class CsvParser(BaseParser):
    def can_parse(self, filename: str, media_type: str) -> bool:
        lower = filename.lower()
        return lower.endswith(".csv") or "text/csv" in media_type

    def parse(self, file_path: Path, filename: str) -> ParserResult:
        result = ParserResult(format_name="CSV", metadata={"filename": filename})
        all_entities = []

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []
                result.metadata["headers"] = headers

                # Find candidate timestamp column
                ts_col = None
                for col in headers:
                    if col.lower() in ("timestamp", "datetime", "time", "date", "ts", "event_time", "observed_at"):
                        ts_col = col
                        break

                for row_num, row in enumerate(reader, start=2): # 1 is header
                    row_text = " | ".join(f"{k}: {v}" for k, v in row.items() if v)
                    
                    # Timestamp normalization
                    norm_dt, precision, tz_prov = None, "UNKNOWN", "NONE"
                    raw_ts = row.get(ts_col, "") if ts_col else ""
                    if raw_ts:
                        norm_dt, precision, tz_prov = normalize_timestamp(raw_ts)

                    # Extract indicators
                    row_entities = extract_indicators_from_text(row_text)
                    all_entities.extend(row_entities)

                    # Determine category and severity
                    text_lower = row_text.lower()
                    is_network = any(k in [h.lower() for h in headers] for k in ["src_ip", "dest_ip", "protocol", "port", "domain", "bytes_transferred"]) or any(k in text_lower for k in ["http", "tcp", "udp", "traffic"])
                    if is_network:
                        category = "NETWORK"
                    elif any(k in text_lower for k in ["failed password", "accepted password", "session opened", "auth_attempt"]):
                        category = "AUTHENTICATION"
                    else:
                        category = "GENERAL"

                    severity = "INFO"
                    if any(k in text_lower for k in ["blocked", "denied", "malicious", "attack", "alert", "c2"]):
                        severity = "HIGH"
                    elif any(k in text_lower for k in ["warn", "suspicious", "anomalous"]):
                        severity = "MEDIUM"

                    event = ExtractedEvent(
                        event_type="CSV_RECORD",
                        category=category,
                        severity=severity,
                        description=f"Record from row {row_num}: {row_text[:200]}",
                        observed_timestamp=raw_ts or "ROW_WITHOUT_EXPLICIT_TIME",
                        normalized_timestamp_utc=norm_dt,
                        timestamp_precision=precision,
                        timezone_provenance=tz_prov,
                        extracted_metadata={
                            "source_row": row_num,
                            "parsed_fields": row,
                        },
                        related_entities=row_entities
                    )
                    result.events.append(event)

        except Exception as e:
            result.errors.append(f"Failed to parse CSV: {str(e)}")

        result.entities = all_entities
        return result
