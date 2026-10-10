# TRACE-X Hackathon Demonstration Script
## Step-by-Step Evaluator Walkthrough (5-Minute Demo)

### Objective
Demonstrate how TRACE-X reconstructs an advanced spearphishing and credential compromise incident across heterogeneous files without manual correlation.

---

### Phase 1: Ingestion & 1-Click Reproducibility (Minute 1)
1. Open the web interface at `http://localhost:5173`.
2. Notice the graphite-and-electric-violet UI aesthetic.
3. Click **Load Demo Scenario** in the top navigation bar.
4. **Narrative:** *"In a real enterprise incident, investigators receive fragmented emails, syslogs, EDR json dumps, and proxy CSV logs. TRACE-X ingests all six heterogeneous artifacts in one step."*

---

### Phase 2: Evidence Vault & Cryptographic Verification (Minute 2)
1. Navigate to **Evidence Vault** (`/evidence`).
2. Point out the original filenames, sizes, and SHA-256 digests.
3. Click **Verify Hash** on `phishing_email.eml`.
4. The system re-hashes disk bytes live and displays the cryptographic integrity confirmation modal.
5. **Narrative:** *"TRACE-X preserves original byte streams and lets investigators verify custody integrity at any stage."*

---

### Phase 3: Timeline & Uncertainty Awareness (Minute 3)
1. Navigate to **Incident Timeline** (`/timeline`).
2. Show the chronological progression:
   - Inbound email with urgent reset link
   - User visits proxy gateway to `login-portal.auth-token-verify.net`
   - Authentication service records external IP `198.51.100.45` logging into user `jdoe`
   - Endpoint records Outlook spawning `powershell.exe` with base64 stager
3. Point out the amber **Uncertainty Disclosure** alert:
   - Legacy sensor log entries with missing timestamps are clearly labelled `UNCERTAIN` rather than fabricated into false order.

---

### Phase 4: Cytoscape.js Evidence Graph & Neighborhood Exploration (Minute 4)
1. Navigate to **Investigation Graph** (`/graph`).
2. Click on the central domain node `login-portal.auth-token-verify.net`.
3. Notice how the neighborhood highlights and dims unrelated nodes.
4. Click on the edge connecting the domain to IP `198.51.100.45`:
   - Inspect the explanation drawer: explains why the link exists and gives a 88% confidence rating with supporting evidence IDs.

---

### Phase 5: Findings Workbench & Report Export (Minute 5)
1. Navigate to **AI Findings** (`/findings`).
2. Show finding `FIND-001` (Phishing Email with Malicious Link).
3. Type analyst notes: *"Corroborated with firewall egress timestamps."*
4. Click **Confirm Finding**. The badge immediately updates to Confirmed.
5. Navigate to **Forensic Reports** (`/reports`).
6. Click **Export TXT** or **Export JSON** to download the completed, evidence-backed report.
7. Click **Case & Audit Logs** (`/cases`) to show that every single step was immutably recorded in the audit trail.
