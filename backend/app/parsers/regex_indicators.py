import re
from typing import List, Dict, Any, Set
from urllib.parse import urlparse

# IPv4 regex (with octet validation)
IPV4_REGEX = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
)

# Email regex (supports standard and enterprise TLDs e.g. .internal, .corporate)
EMAIL_REGEX = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b'
)

# URL regex (supports http, https, hxxp, hxxps)
URL_REGEX = re.compile(
    r'\b(?:https?|hxxps?):\/\/[^\s<>"\'{}|\\^`]+',
    re.IGNORECASE
)

# Hashes
SHA256_REGEX = re.compile(r'\b[a-fA-F0-9]{64}\b')
SHA1_REGEX = re.compile(r'\b[a-fA-F0-9]{40}\b')
MD5_REGEX = re.compile(r'\b[a-fA-F0-9]{32}\b')

# User account patterns in logs
USER_PATTERNS = [
    re.compile(r'(?:user|username|account|for user)\s*[=:]\s*["\']?([a-zA-Z0-9._-]+)["\']?', re.IGNORECASE),
    re.compile(r'for\s+user\s+([a-zA-Z0-9._-]+)\b', re.IGNORECASE),
    re.compile(r'user\s+([a-zA-Z0-9._-]+)\s+logged', re.IGNORECASE),
]

# Hostname patterns
HOST_PATTERNS = [
    re.compile(r'\b(WS-[A-Za-z0-9_-]+|SRV-[A-Za-z0-9_-]+|DESKTOP-[A-Za-z0-9]+|HOST-[A-Za-z0-9_-]+)\b', re.IGNORECASE),
    re.compile(r'(?:hostname|host|computer_name)\s*[=:]\s*["\']?([a-zA-Z0-9._-]+)["\']?', re.IGNORECASE),
]

def extract_indicators_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Extracts all recognized cybersecurity indicators from a given string.
    Returns a list of dicts with entity_type, normalized_value, display_value, metadata.
    """
    extracted: List[Dict[str, Any]] = []
    seen: Set[str] = set()

    # 1. Emails
    for match in EMAIL_REGEX.finditer(text):
        email = match.group(0)
        norm = email.lower()
        key = f"EMAIL:{norm}"
        if key not in seen:
            seen.add(key)
            extracted.append({
                "entity_type": "EMAIL",
                "normalized_value": norm,
                "display_value": email,
                "metadata": {"domain": norm.split("@")[-1]}
            })

    # 2. URLs & Domains
    for match in URL_REGEX.finditer(text):
        raw_url = match.group(0).rstrip(".,;)>]")
        clean_url = raw_url.replace("hxxp://", "http://").replace("hxxps://", "https://")
        norm = clean_url.lower()
        key = f"URL:{norm}"
        if key not in seen:
            seen.add(key)
            extracted.append({
                "entity_type": "URL",
                "normalized_value": norm,
                "display_value": raw_url,
                "metadata": {"defanged": "hxxp" in raw_url}
            })
        # Extract domain from URL
        try:
            parsed = urlparse(clean_url)
            domain = parsed.netloc.split(":")[0].lower()
            if domain and not re.match(r'^\d+\.\d+\.\d+\.\d+$', domain):
                dom_key = f"DOMAIN:{domain}"
                if dom_key not in seen:
                    seen.add(dom_key)
                    extracted.append({
                        "entity_type": "DOMAIN",
                        "normalized_value": domain,
                        "display_value": domain,
                        "metadata": {"extracted_from_url": norm}
                    })
        except Exception:
            pass

    # 2B. Standalone FQDN Domains (e.g. login-portal.auth-token-verify.net)
    DOMAIN_REGEX = re.compile(
        r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|edu|gov|io|internal|local|mil|biz|info|site|[a-zA-Z]{2,12})\b',
        re.IGNORECASE
    )
    for match in DOMAIN_REGEX.finditer(text):
        dom = match.group(0).lower()
        if not re.match(r'^\d+\.\d+\.\d+\.\d+$', dom) and not any(dom in s for s in seen if s.startswith("EMAIL:")):
            dom_key = f"DOMAIN:{dom}"
            if dom_key not in seen:
                seen.add(dom_key)
                extracted.append({
                    "entity_type": "DOMAIN",
                    "normalized_value": dom,
                    "display_value": dom,
                    "metadata": {"type": "standalone_fqdn"}
                })

    # 3. IP Addresses
    for match in IPV4_REGEX.finditer(text):
        ip = match.group(0)
        # Filter common non-indicator IPs
        if ip in ("0.0.0.0", "255.255.255.255", "127.0.0.1"):
            continue
        key = f"IP_ADDRESS:{ip}"
        if key not in seen:
            seen.add(key)
            is_private = ip.startswith("10.") or ip.startswith("192.168.") or (ip.startswith("172.") and 16 <= int(ip.split(".")[1]) <= 31)
            extracted.append({
                "entity_type": "IP_ADDRESS",
                "normalized_value": ip,
                "display_value": ip,
                "metadata": {"is_rfc1918_private": is_private}
            })

    # 4. Hashes
    for match in SHA256_REGEX.finditer(text):
        h = match.group(0).lower()
        key = f"FILE_HASH:{h}"
        if key not in seen:
            seen.add(key)
            extracted.append({
                "entity_type": "FILE_HASH",
                "normalized_value": h,
                "display_value": h,
                "metadata": {"algorithm": "SHA-256"}
            })

    for match in MD5_REGEX.finditer(text):
        h = match.group(0).lower()
        # Avoid matching substring of sha256
        if any(h in k for k in seen if k.startswith("FILE_HASH:")):
            continue
        key = f"FILE_HASH:{h}"
        if key not in seen:
            seen.add(key)
            extracted.append({
                "entity_type": "FILE_HASH",
                "normalized_value": h,
                "display_value": h,
                "metadata": {"algorithm": "MD5"}
            })

    # 5. User accounts
    for pat in USER_PATTERNS:
        for match in pat.finditer(text):
            user = match.group(1).strip()
            if len(user) > 2 and not user.isdigit():
                norm = user.lower()
                key = f"USER_ACCOUNT:{norm}"
                if key not in seen:
                    seen.add(key)
                    extracted.append({
                        "entity_type": "USER_ACCOUNT",
                        "normalized_value": norm,
                        "display_value": user,
                        "metadata": {}
                    })

    # 6. Hostnames
    for pat in HOST_PATTERNS:
        for match in pat.finditer(text):
            host = match.group(1).strip()
            norm = host.upper()
            key = f"HOST_DEVICE:{norm}"
            if key not in seen:
                seen.add(key)
                extracted.append({
                    "entity_type": "HOST_DEVICE",
                    "normalized_value": norm,
                    "display_value": host,
                    "metadata": {}
                })

    return extracted
