import re
from datetime import datetime, timezone
from typing import Optional, Tuple

# Patterns for timestamp extraction
ISO_8601_REGEX = re.compile(
    r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)'
)
COMMON_LOG_REGEX = re.compile(
    r'\[?(\d{2}/[A-Za-z]{3}/\d{4}:\d{2}:\d{2}:\d{2}(?:\s+[+-]\d{4})?)\]?'
)
SYSLOG_REGEX = re.compile(
    r'\b([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\b'
)
STANDARD_DATE_TIME_REGEX = re.compile(
    r'\b(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\b'
)

def parse_iso_timestamp(ts_str: str) -> Optional[datetime]:
    ts_str = ts_str.strip().replace(" ", "T")
    try:
        # Handle Z
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def normalize_timestamp(raw_str: str) -> Tuple[Optional[datetime], str, str]:
    """
    Returns:
    (normalized_utc_datetime, timestamp_precision, timezone_provenance)
    """
    if not raw_str or not raw_str.strip():
        return None, "UNKNOWN", "NONE"

    raw = raw_str.strip()

    # 1. ISO 8601
    iso_match = ISO_8601_REGEX.search(raw)
    if iso_match:
        dt = parse_iso_timestamp(iso_match.group(1))
        if dt:
            tz_prov = "UTC" if "Z" in raw or "+00" in raw else "OFFSET_PRESERVED"
            return dt, "EXACT_SECOND", tz_prov

    # 2. Standard YYYY-MM-DD HH:MM:SS
    std_match = STANDARD_DATE_TIME_REGEX.search(raw)
    if std_match:
        try:
            dt = datetime.strptime(std_match.group(1), "%Y-%m-%d %H:%M:%S")
            dt = dt.replace(tzinfo=timezone.utc)
            return dt, "EXACT_SECOND", "ASSUMED_UTC"
        except Exception:
            pass

    # 3. Common Log Format: DD/Mon/YYYY:HH:MM:SS +0000
    clf_match = COMMON_LOG_REGEX.search(raw)
    if clf_match:
        clean = clf_match.group(1).strip("[]")
        parts = clean.split()
        time_part = parts[0]
        try:
            dt = datetime.strptime(time_part, "%d/%b/%Y:%H:%M:%S")
            dt = dt.replace(tzinfo=timezone.utc)
            tz_prov = parts[1] if len(parts) > 1 else "UTC"
            return dt, "EXACT_SECOND", f"CLF_{tz_prov}"
        except Exception:
            pass

    # 4. Syslog: Mon DD HH:MM:SS (assumes current or specified year e.g. 2026)
    sys_match = SYSLOG_REGEX.search(raw)
    if sys_match:
        try:
            # Inject current year 2026
            val = sys_match.group(1)
            dt = datetime.strptime(f"2026 {val}", "%Y %b %d %H:%M:%S")
            dt = dt.replace(tzinfo=timezone.utc)
            return dt, "EXACT_SECOND", "SYSLOG_NO_YEAR_ASSUMED_2026"
        except Exception:
            pass

    # 5. Missing / ambiguous
    return None, "UNCERTAIN", "AMBIGUOUS_FORMAT"
