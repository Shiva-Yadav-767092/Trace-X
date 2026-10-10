# TRACE-X Synthetic Hackathon Scenario
## Operation PhishTrace (Incident ID: `CASE-2026-9042`)

This synthetic evidence bundle models a realistic enterprise cyber incident involving spearphishing, credential abuse, perimeter egress proxy traffic, and host process execution.

### Artifacts in the Bundle

| Artifact Filename | Forensic Format | Role in Incident | Key Extracted Observables |
| :--- | :--- | :--- | :--- |
| `phishing_email.eml` | RFC822 / EML | Inbound lure targeting `jdoe@corp-acme.internal` | URL: `http://login-portal.auth-token-verify.net/reset`, Domain: `login-portal.auth-token-verify.net` |
| `auth_service.log` | Syslog / PAM | External SSH/PAM authentication attempts | User: `jdoe`, External IP: `198.51.100.45` |
| `network_traffic.csv` | Web Proxy Log | Outbound HTTP requests from internal client | Client: `10.0.4.15`, Dest IP: `198.51.100.45`, Domain: `login-portal.auth-token-verify.net` |
| `endpoint_activity.json` | EDR Telemetry | Process creation spawned by Outlook | Host: `WS-CORP-082`, User: `jdoe`, Hash: `e3b0c44298fc...`, Process: `powershell.exe` |
| `backup_routine.log` | Scheduled Task | Benign background noise artifact | Midnight backup daemon log (illustrating noise separation) |
| `legacy_sensor.txt` | Sensor Probe | Incomplete sensor telemetry | Entries lacking standard timestamps (illustrating uncertainty disclosure) |

### Reproducing the Investigation

#### Via Web Interface:
Click the **Load Demo Scenario** button in the top navigation bar.

#### Via CLI / Python:
Run from the backend root:
```powershell
python -m app.services.demo_seeder
```
