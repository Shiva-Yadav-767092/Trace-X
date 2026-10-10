import io
import hashlib
from pathlib import Path
from app.services.evidence_service import calculate_stream_sha256_and_save, sanitize_filename

def test_stream_hashing_and_preservation(tmp_path):
    data = b"FORENSIC_RAW_BYTES_SAMPLE_FOR_SHA256_VERIFICATION"
    expected_hash = hashlib.sha256(data).hexdigest()

    file_obj = io.BytesIO(data)
    dest_path = tmp_path / "preserved_artifact.bin"

    calculated_hash, size = calculate_stream_sha256_and_save(file_obj, dest_path)

    assert calculated_hash == expected_hash
    assert size == len(data)
    assert dest_path.exists()
    assert dest_path.read_bytes() == data

def test_filename_sanitization():
    unsafe_name = "../../etc/passwd"
    clean = sanitize_filename(unsafe_name)
    assert ".." not in clean
    assert "/" not in clean
    assert "\\" not in clean
    assert clean == "passwd"

    windows_unsafe = "C:\\Windows\\System32\\cmd.exe"
    clean_win = sanitize_filename(windows_unsafe)
    assert "cmd.exe" in clean_win
    assert ":" not in clean_win
