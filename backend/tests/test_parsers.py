from pathlib import Path
from app.parsers.txt_log_parser import TxtLogParser
from app.parsers.csv_parser import CsvParser
from app.parsers.json_parser import JsonParser
from app.parsers.eml_parser import EmlParser
from app.parsers.registry import default_registry

def test_txt_log_parser(tmp_path):
    log_content = (
        "2026-10-09 14:18:02 auth-service[8412]: Failed password for user jdoe from 198.51.100.45 port 54112 ssh2\n"
        "2026-10-09 14:22:15 auth-service[8412]: Accepted password for user jdoe from 198.51.100.45 port 54118 ssh2\n"
    )
    p = tmp_path / "auth.log"
    p.write_text(log_content, encoding="utf-8")

    parser = TxtLogParser()
    assert parser.can_parse("auth.log", "text/plain")

    result = parser.parse(p, "auth.log")
    assert len(result.events) == 2
    assert result.events[0].category == "AUTHENTICATION"
    assert result.events[0].severity == "HIGH"
    assert result.events[0].normalized_timestamp_utc is not None
    assert any(e["normalized_value"] == "198.51.100.45" for e in result.entities)
    assert any(e["normalized_value"] == "jdoe" for e in result.entities)

def test_csv_parser(tmp_path):
    csv_content = (
        "timestamp,src_ip,dest_ip,domain,status\n"
        "2026-10-09T14:16:45Z,10.0.4.15,198.51.100.45,login-portal.auth-token-verify.net,200\n"
    )
    p = tmp_path / "network.csv"
    p.write_text(csv_content, encoding="utf-8")

    parser = CsvParser()
    result = parser.parse(p, "network.csv")
    assert len(result.events) == 1
    assert result.events[0].category == "NETWORK"
    assert any(e["entity_type"] == "IP_ADDRESS" for e in result.entities)
    assert any(e["entity_type"] == "DOMAIN" for e in result.entities)

def test_json_parser(tmp_path):
    json_content = '{"host": "WS-CORP-082", "events": [{"timestamp": "2026-10-09T14:24:10Z", "event_name": "PROCESS_CREATION", "user": "jdoe", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}]}'
    p = tmp_path / "events.json"
    p.write_text(json_content, encoding="utf-8")

    parser = JsonParser()
    result = parser.parse(p, "events.json")
    assert len(result.events) == 1
    assert result.events[0].category == "EXECUTION"
    assert any(e["entity_type"] == "FILE_HASH" for e in result.entities)

def test_eml_parser(tmp_path):
    eml_content = (
        "From: admin@spoofed-phish.internal\n"
        "To: victim@corp.internal\n"
        "Subject: Urgent Action Needed\n"
        "Date: Thu, 09 Oct 2026 14:15:20 +0000\n"
        "\n"
        "Click here: http://malicious-login.internal/reset\n"
    )
    p = tmp_path / "email.eml"
    p.write_text(eml_content, encoding="utf-8")

    parser = EmlParser()
    result = parser.parse(p, "email.eml")
    assert len(result.events) == 1
    assert result.events[0].category == "EMAIL"
    assert any(e["entity_type"] == "EMAIL" for e in result.entities)
    assert any(e["entity_type"] == "URL" for e in result.entities)

def test_unsupported_format_explicit_rejection(tmp_path):
    p = tmp_path / "firmware.bin"
    p.write_bytes(b"\x00\x01\x02\x03")

    result = default_registry.parse_file(p, "firmware.bin", "application/octet-stream")
    assert result.format_name == "UNSUPPORTED"
    assert len(result.errors) > 0
    assert "Unsupported format" in result.errors[0]
