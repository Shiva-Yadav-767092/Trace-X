# TRACE-X Architecture & System Design
## Threat Reconstruction, Artifact Correlation & Evidence eXplorer

### 1. High-Level Architecture

TRACE-X is structured around a decoupled, modular client-server forensic architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 TRACE-X Frontend (React + TS)               │
│  - Evidence Vault      - Cytoscape.js Evidence Graph        │
│  - Incident Timeline   - Findings Review Workbench          │
│  - Forensic Reports    - Immutable Audit Log Inspector      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (FastAPI /api/v1)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Core                     │
│  - Case-Scoped Authorization   - Stream SHA-256 Hasher      │
│  - Parser Registry             - Deterministic Correlator   │
│  - Reporting Service           - AI Interface Abstraction   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     Relational Database     ││   Isolated Evidence Storage  │
│  - Cases, Events, Entities  ││  - Case-isolated directories │
│  - Relationships, Findings  ││  - Unaltered original bytes  │
│  - Immutable Audit Trails   ││  - SHA-256 named keys        │
└─────────────────────────────┘└──────────────────────────────┘
```

### 2. Evidence Processing Pipeline

Every ingested file passes through a strict sequential pipeline:

1. **Upload & Path Traversal Neutralization:** Stored with internal SHA-256 prefixed keys. Filename is sanitized to prevent directory traversal.
2. **Cryptographic Preservation:** SHA-256 digest calculated in chunks over raw bytes.
3. **Format Parsing:** `ParserRegistry` routes to the appropriate module (`TxtLogParser`, `CsvParser`, `JsonParser`, `EmlParser`). Unsupported formats are explicitly flagged.
4. **Timestamp Normalization:** Converts valid timestamps to UTC while recording precision (`EXACT_SECOND`, `UNCERTAIN`) and source timezone provenance.
5. **Indicator Extraction:** Identifies IPv4, URLs, domains, emails, hashes, usernames, and hostnames.
6. **Correlation Engine:**
   - Multi-artifact shared indicator discovery
   - Cryptographic hash linkage
   - Temporal proximity windows
7. **Findings Synthesis:** Grounded findings generated with confidence scores, methodology notes, and forensic limitations.
8. **Analyst Review & Report Export:** Decisions logged immutably in `AuditLog` table.
