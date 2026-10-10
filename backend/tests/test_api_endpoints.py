from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TRACE-X"
    assert data["database"] == "connected"

def test_cases_crud_and_overview():
    # 1. Overview
    res_ov = client.get("/api/v1/cases/overview")
    assert res_ov.status_code == 200
    assert "total_cases" in res_ov.json()

    # 2. Create case
    res_create = client.post("/api/v1/cases", json={
        "title": "Automated Test Incident",
        "description": "Validation test case for TRACE-X suite",
        "investigator": "Test Analyst"
    })
    assert res_create.status_code == 200
    case_data = res_create.json()
    case_id = case_data["id"]
    assert case_data["title"] == "Automated Test Incident"

    # 3. Patch case status
    res_patch = client.patch(f"/api/v1/cases/{case_id}", json={
        "status": "UNDER_REVIEW"
    })
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "UNDER_REVIEW"

    # 4. Audit log exists
    res_audit = client.get(f"/api/v1/cases/{case_id}/audit")
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert len(logs) >= 2 # CASE_CREATED and CASE_STATUS_CHANGED

def test_demo_seed_and_findings_review():
    # Trigger demo seed
    res_seed = client.post("/api/v1/cases/demo-seed")
    assert res_seed.status_code == 200
    seed_data = res_seed.json()
    case_id = seed_data["case_id"]

    # Check evidence list
    res_ev = client.get(f"/api/v1/cases/{case_id}/evidence")
    assert res_ev.status_code == 200
    assert len(res_ev.json()) >= 6

    # Verify integrity of first evidence
    first_ev_id = res_ev.json()[0]["id"]
    res_verify = client.post(f"/api/v1/evidence/{first_ev_id}/verify")
    assert res_verify.status_code == 200
    assert res_verify.json()["matches"] is True

    # Check timeline
    res_tl = client.get(f"/api/v1/cases/{case_id}/timeline")
    assert res_tl.status_code == 200
    assert len(res_tl.json()) > 0

    # Check graph
    res_graph = client.get(f"/api/v1/cases/{case_id}/graph")
    assert res_graph.status_code == 200
    g_data = res_graph.json()
    assert len(g_data["nodes"]) > 0
    assert len(g_data["edges"]) > 0

    # Check findings
    res_find = client.get(f"/api/v1/cases/{case_id}/findings")
    assert res_find.status_code == 200
    findings = res_find.json()
    assert len(findings) >= 3

    # Review first finding
    first_finding_id = findings[0]["id"]
    res_review = client.post(f"/api/v1/findings/{first_finding_id}/review", json={
        "review_status": "CONFIRMED",
        "analyst_notes": "Corroborated by external gateway headers and proxy egress timestamps.",
        "reviewer_id": "Principal Investigator"
    })
    assert res_review.status_code == 200
    assert res_review.json()["review_status"] == "CONFIRMED"

    # Export Report in JSON, TXT, CSV
    res_rep_json = client.get(f"/api/v1/cases/{case_id}/report?format=json")
    assert res_rep_json.status_code == 200
    assert "metadata" in res_rep_json.json()

    res_rep_txt = client.get(f"/api/v1/cases/{case_id}/report?format=txt")
    assert res_rep_txt.status_code == 200
    assert "TRACE-X DIGITAL FORENSICS" in res_rep_txt.text

    res_rep_csv = client.get(f"/api/v1/cases/{case_id}/report?format=csv")
    assert res_rep_csv.status_code == 200
    assert "Timestamp_UTC" in res_rep_csv.text
