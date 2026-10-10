import json
from pathlib import Path
from typing import Any, List, Dict
from app.parsers.base import BaseParser, ParserResult, ExtractedEvent
from app.parsers.timestamp_utils import normalize_timestamp
from app.parsers.regex_indicators import extract_indicators_from_text

class JsonParser(BaseParser):
    def can_parse(self, filename: str, media_type: str) -> bool:
        lower = filename.lower()
        return lower.endswith(".json") or "application/json" in media_type

    def parse(self, file_path: Path, filename: str) -> ParserResult:
        result = ParserResult(format_name="JSON", metadata={"filename": filename})
        all_entities = []

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                data = json.load(f)
        except Exception as e:
            result.errors.append(f"Failed to parse JSON file: {str(e)}")
            return result

        items: List[tuple[str, Dict[str, Any]]] = []
        if isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, dict):
                    items.append((f"root[{i}]", item))
        elif isinstance(data, dict):
            # Check if there is an array under 'events', 'logs', 'records', etc.
            found_array = False
            for k in ["events", "logs", "records", "items", "data"]:
                if k in data and isinstance(data[k], list):
                    for i, item in enumerate(data[k]):
                        if isinstance(item, dict):
                            items.append((f"{k}[{i}]", item))
                    found_array = True
                    break
            if not found_array:
                items.append(("root", data))

        for json_path, obj in items:
            raw_str = json.dumps(obj)
            
            # Find timestamp
            raw_ts = ""
            for k in ["timestamp", "@timestamp", "time", "datetime", "date", "event_time", "observed_at"]:
                if k in obj and isinstance(obj[k], str):
                    raw_ts = obj[k]
                    break

            norm_dt, precision, tz_prov = normalize_timestamp(raw_ts)

            # Category
            category = "SYSTEM"
            cat_val = obj.get("category", "") or obj.get("event_type", "") or obj.get("source", "")
            if cat_val:
                category = str(cat_val).upper()
            elif any(k in raw_str.lower() for k in ["process", "powershell", "cmd.exe", "exec"]):
                category = "EXECUTION"
            elif any(k in raw_str.lower() for k in ["network", "conn", "http", "socket"]):
                category = "NETWORK"

            # Severity
            severity = "INFO"
            sev_val = str(obj.get("severity", "") or obj.get("level", "")).upper()
            if sev_val in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
                severity = sev_val
            elif "malicious" in raw_str.lower() or "threat" in raw_str.lower():
                severity = "HIGH"

            # Description
            desc = obj.get("description", "") or obj.get("message", "") or obj.get("action", "") or f"JSON event at {json_path}"

            # Indicators
            indicators = extract_indicators_from_text(raw_str)
            all_entities.extend(indicators)

            event = ExtractedEvent(
                event_type=obj.get("event_name", "JSON_EVENT"),
                category=category,
                severity=severity,
                description=str(desc)[:300],
                observed_timestamp=raw_ts or "NO_TIMESTAMP",
                normalized_timestamp_utc=norm_dt,
                timestamp_precision=precision,
                timezone_provenance=tz_prov,
                extracted_metadata={
                    "json_path": json_path,
                    "payload_keys": list(obj.keys()),
                    "raw_json": obj
                },
                related_entities=indicators
            )
            result.events.append(event)

        result.entities = all_entities
        result.metadata["total_objects_extracted"] = len(items)
        return result
