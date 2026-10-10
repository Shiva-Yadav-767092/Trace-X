# TRACE-X
## Threat Reconstruction, Artifact Correlation & Evidence eXplorer

> **"Every artifact tells a story. TRACE-X connects the evidence."**

TRACE-X is an AI-assisted digital forensics, evidence correlation, and incident reconstruction platform built for cybersecurity investigators, SOC analysts, and incident response teams.

---

## Key Differentiators

- **Cryptographic Byte Preservation & SHA-256 Verification:** Original evidence files are preserved bit-for-bit upon upload with live hash recalculation.
- **Explainable Correlation Engine:** Deterministic rule engine reveals *why* two artifacts are connected, with documented rule derivations, strength scores, and assumptions.
- **Uncertainty Awareness:** Explicit disclosures for ambiguous timestamps, sensor clock skew, and shared NAT limitations.
- **Interactive Incident Topology:** High-performance Cytoscape.js canvas with neighborhood exploration, filter chips, and inspector drawers.
- **Analyst Findings Workbench:** Evidence-backed findings with confirm/reject review workflows and full immutable audit trail logging.
- **Multi-Format Forensic Reports:** Instant downloadable exports in JSON, CSV, TXT, and printable PDF formats.

---

## System Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Cytoscape.js, Recharts, Lucide Icons.
- **Backend:** Python 3.12+ / 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic migrations, Pytest.
- **Persistence & Storage:** SQLite local development mode (PostgreSQL ready), isolated case-scoped file vault.
- **Design System:** Custom graphite-and-electric-violet cybersecurity aesthetic (`#111116`, `#17171D`, `#202028`, `#A78BFA`, `#67E8F9`, `#34D399`, `#FBBF24`, `#F87171`).

---

## Windows Quickstart (No-Docker Local Mode)

### Prerequisites
- Python 3.12 or newer (Python 3.14 supported)
- Node.js v18 or newer (Node v20 LTS recommended)
- Git for Windows

### Step 1: Clone and Navigate
```powershell
cd C:\Users\Asus\.gemini\antigravity\scratch\trace-x
```

### Step 2: Setup Python Backend
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed reproducible Hackathon Demo scenario (Optional - also available via 1-click UI)
python -m app.services.demo_seeder

# Start the FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be running at `http://127.0.0.1:8000`.
Interactive OpenAPI docs are available at `http://127.0.0.1:8000/docs`.

### Step 3: Setup Frontend (New Terminal)
```powershell
cd C:\Users\Asus\.gemini\antigravity\scratch\trace-x\frontend

# Install frontend packages
npm install

# Start Vite dev server
npm run dev
```
Open your browser to `http://localhost:5173`.

---

## Docker Quickstart

```bash
docker-compose up --build
```
- Web Application: `http://localhost:5173`
- Backend API & Health: `http://localhost:8000/health`

---

## Running the Automated Test Suite

### Backend Unit & Integration Tests (10/10 Passing)
```powershell
cd backend
..\.venv\Scripts\pytest -v
```

### Frontend Typecheck & Production Build
```powershell
cd frontend
npm run build
```

---

## Hackathon Demonstration Scenario

TRACE-X comes pre-packaged with **Operation PhishTrace (`CASE-2026-9042`)**, a synthetic multi-artifact cybersecurity scenario:

1. Click **Load Demo Scenario** in the top navigation bar.
2. Inspect the 6 ingested artifacts and their SHA-256 hashes in **Evidence Vault** (`/evidence`).
3. Click **Verify Hash** to trigger live on-disk byte re-hashing.
4. Open **Incident Timeline** (`/timeline`) to observe normalized chronological events and timestamp uncertainty disclosures.
5. Explore the **Investigation Graph** (`/graph`) with Cytoscape.js neighborhood highlights and correlation rationale.
6. Review findings and record investigator determinations in **AI Findings** (`/findings`).
7. Export comprehensive forensic reports in **Forensic Reports** (`/reports`).
8. Inspect the complete action history in **Case & Audit Logs** (`/cases`).
