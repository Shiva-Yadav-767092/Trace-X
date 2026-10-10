import email
from email import policy
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import List, Dict, Any
from app.parsers.base import BaseParser, ParserResult, ExtractedEvent
from app.parsers.regex_indicators import extract_indicators_from_text

class EmlParser(BaseParser):
    def can_parse(self, filename: str, media_type: str) -> bool:
        lower = filename.lower()
        return lower.endswith(".eml") or "message/rfc822" in media_type

    def parse(self, file_path: Path, filename: str) -> ParserResult:
        result = ParserResult(format_name="EML", metadata={"filename": filename})
        all_entities: List[Dict[str, Any]] = []

        try:
            with open(file_path, "rb") as f:
                msg = email.message_from_binary_file(f, policy=policy.default)
        except Exception as e:
            result.errors.append(f"Failed to parse EML: {str(e)}")
            return result

        subject = str(msg.get("Subject", "(No Subject)"))
        from_hdr = str(msg.get("From", ""))
        to_hdr = str(msg.get("To", ""))
        date_hdr = str(msg.get("Date", ""))
        msg_id = str(msg.get("Message-ID", ""))
        received_hdrs = [str(r) for r in msg.get_all("Received", [])]

        # Normalize Date header
        norm_dt = None
        precision = "UNKNOWN"
        tz_prov = "NONE"
        if date_hdr:
            try:
                dt = parsedate_to_datetime(date_hdr)
                norm_dt = dt
                precision = "EXACT_SECOND"
                tz_prov = f"RFC2822_{dt.tzname() or 'OFFSET'}"
            except Exception:
                precision = "UNCERTAIN"
                tz_prov = "UNPARSEABLE_RFC2822"

        # Extract body text safely
        body_text_parts = []
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype in ("text/plain", "text/html"):
                try:
                    payload = part.get_content()
                    if isinstance(payload, str):
                        body_text_parts.append(payload)
                except Exception:
                    pass

        full_body = "\n".join(body_text_parts)

        # Extract indicators from headers and body
        combined_text = f"From: {from_hdr}\nTo: {to_hdr}\nSubject: {subject}\n{full_body}"
        extracted_indicators = extract_indicators_from_text(combined_text)
        all_entities.extend(extracted_indicators)

        # Message ID entity
        if msg_id:
            all_entities.append({
                "entity_type": "MESSAGE_ID",
                "normalized_value": msg_id.strip("<>").lower(),
                "display_value": msg_id.strip("<>"),
                "metadata": {"header": "Message-ID"}
            })

        # Check for phishing characteristics
        severity = "INFO"
        if any(w in subject.lower() for w in ["urgent", "verify", "password", "suspended", "action required"]):
            severity = "MEDIUM"
        if any("login" in e.get("normalized_value", "") or "verify" in e.get("normalized_value", "") for e in extracted_indicators if e.get("entity_type") == "URL"):
            severity = "HIGH"

        event = ExtractedEvent(
            event_type="EMAIL_RECEIVED",
            category="EMAIL",
            severity=severity,
            description=f"Email: '{subject}' From: {from_hdr} To: {to_hdr}",
            observed_timestamp=date_hdr or "UNKNOWN",
            normalized_timestamp_utc=norm_dt,
            timestamp_precision=precision,
            timezone_provenance=tz_prov,
            extracted_metadata={
                "subject": subject,
                "from": from_hdr,
                "to": to_hdr,
                "message_id": msg_id,
                "received_hops": len(received_hdrs),
                "has_body": bool(full_body),
                "body_preview": full_body[:300] if full_body else ""
            },
            related_entities=extracted_indicators
        )

        result.events.append(event)
        result.entities = all_entities
        result.metadata["subject"] = subject
        result.metadata["message_id"] = msg_id
        return result
