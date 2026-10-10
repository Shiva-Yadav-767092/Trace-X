# TRACE-X API Reference
## Base URL: `/api/v1`

### System Endpoints
- `GET /health`: Health-check endpoint verifying database and storage availability.

### Case Management
- `GET /api/v1/cases/overview`: Summary metrics for command center dashboard.
- `POST /api/v1/cases/demo-seed`: 1-click seeder for synthetic hackathon scenario (`CASE-2026-9042`).
- `GET /api/v1/cases`: List all investigation cases. Filter by `status`.
- `POST /api/v1/cases`: Create a new investigation case.
- `GET /api/v1/cases/{case_id}`: Retrieve case details and statistics.
- `PATCH /api/v1/cases/{case_id}`: Update case title, description, investigator, or status (`OPEN`, `IN_PROGRESS`, `UNDER_REVIEW`, `CLOSED`).

### Evidence & Integrity
- `GET /api/v1/cases/{case_id}/evidence`: List evidence artifacts for a case.
- `POST /api/v1/cases/{case_id}/evidence`: Multipart upload for evidence file with optional collector notes.
- `GET /api/v1/evidence/{evidence_id}`: Retrieve evidence artifact metadata.
- `GET /api/v1/evidence/{evidence_id}/download`: Download original preserved bytes.
- `POST /api/v1/evidence/{evidence_id}/verify`: Live recalculation of stored disk bytes SHA-256 against recorded acquisition hash.
- `POST /api/v1/cases/{case_id}/analysis`: Trigger the deterministic correlation engine for this case.

### Incident Reconstruction
- `GET /api/v1/cases/{case_id}/timeline`: Retrieve chronological normalized events. Query params: `search`, `category`, `severity`, `sort_order` (`asc` / `desc`).
- `GET /api/v1/cases/{case_id}/graph`: Retrieve Cytoscape.js nodes and explainable edges.
- `GET /api/v1/cases/{case_id}/findings`: Retrieve derived investigation findings.
- `POST /api/v1/findings/{finding_id}/review`: Submit analyst review decision (`CONFIRMED`, `REJECTED`, `NEEDS_FURTHER_INVESTIGATION`) with analyst notes.

### Reports & Audit
- `GET /api/v1/cases/{case_id}/report`: Export compiled forensic report. Formats: `json`, `txt`, `csv`.
- `GET /api/v1/cases/{case_id}/audit`: Query immutable audit trail logs.
