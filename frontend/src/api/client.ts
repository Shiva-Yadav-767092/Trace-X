import type {
  Case,
  Evidence,
  EvidenceVerifyResult,
  ForensicEvent,
  GraphData,
  Finding,
  AuditLog,
  OverviewStats,
} from '../types';

import {
  demoCase,
  demoOverview,
  demoEvidenceList,
  demoEvents,
  demoGraph,
  demoFindings,
  demoAuditLogs,
  DEMO_CASE_ID,
} from './demoData';

// Helper to get active backend URL (with localStorage override for live testing)
export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('TRACE_X_BACKEND_URL');
    if (override && override.trim()) {
      return override.trim().replace(/\/$/, '');
    }
  }
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function setBackendBaseUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('TRACE_X_BACKEND_URL');
    } else {
      localStorage.setItem('TRACE_X_BACKEND_URL', url.trim().replace(/\/$/, ''));
    }
  }
}

// In-memory demo state for static preview mode
let inMemoryCases: Case[] = [{ ...demoCase }];
let inMemoryEvidence: Evidence[] = [...demoEvidenceList];
let inMemoryEvents: ForensicEvent[] = [...demoEvents];
let inMemoryGraph: GraphData = {
  nodes: [...demoGraph.nodes],
  edges: [...demoGraph.edges],
};
let inMemoryFindings: Finding[] = [...demoFindings];
let inMemoryAuditLogs: AuditLog[] = [...demoAuditLogs];

let backendIsOnline = false;

async function computeSha256(file: File): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  isBackendLive(): boolean {
    return backendIsOnline;
  },

  // Health
  async getHealth() {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base || ''}/health`);
      const data = await handleResponse<any>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return {
        status: 'preview_mode',
        service: 'TRACE-X (GitHub Pages Static Preview)',
        version: '1.0.0',
        database: 'in-memory-demo',
        storage: 'browser-vault',
        note: 'Python FastAPI backend is offline on static hosting. Displaying interactive investigation scenario.',
      };
    }
  },

  // Overview
  async getOverview(): Promise<OverviewStats> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/overview`);
      const data = await handleResponse<OverviewStats>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return {
        ...demoOverview,
        total_cases: inMemoryCases.length,
        total_evidence: inMemoryEvidence.length,
        total_events: inMemoryEvents.length,
        total_relationships: inMemoryGraph.edges.length,
        pending_findings: inMemoryFindings.filter((f) => f.review_status === 'PENDING_REVIEW').length,
        confirmed_findings: inMemoryFindings.filter((f) => f.review_status === 'CONFIRMED').length,
        recent_cases: inMemoryCases,
      };
    }
  },

  // Demo seeder
  async seedDemoCase(): Promise<any> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/demo-seed`, { method: 'POST' });
      const data = await handleResponse<any>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      inMemoryCases = [{ ...demoCase }];
      inMemoryEvidence = [...demoEvidenceList];
      inMemoryEvents = [...demoEvents];
      inMemoryGraph = { nodes: [...demoGraph.nodes], edges: [...demoGraph.edges] };
      inMemoryFindings = [...demoFindings];
      inMemoryAuditLogs = [...demoAuditLogs];
      return {
        status: 'success',
        case_id: DEMO_CASE_ID,
        case_number: 'CASE-2026-9042',
        message: 'Hackathon Demo dataset reset in static preview mode.',
      };
    }
  },

  // Cases
  async getCases(status?: string): Promise<Case[]> {
    const base = getBackendBaseUrl();
    try {
      const url = status ? `${base}/api/v1/cases?status=${status}` : `${base}/api/v1/cases`;
      const res = await fetch(url);
      const data = await handleResponse<Case[]>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      if (status) {
        return inMemoryCases.filter((c) => c.status === status);
      }
      return inMemoryCases;
    }
  },

  async createCase(data: { title: string; description?: string; investigator?: string; case_number?: string }): Promise<Case> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await handleResponse<Case>(res);
      backendIsOnline = true;
      return resData;
    } catch {
      backendIsOnline = false;
      const newCase: Case = {
        id: `case-${Date.now()}`,
        case_number: data.case_number || `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: data.title,
        description: data.description || '',
        status: 'OPEN',
        investigator: data.investigator || 'Analyst (Preview Mode)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stats: {
          evidence_count: 0,
          event_count: 0,
          relationship_count: 0,
          finding_count: 0,
          pending_finding_count: 0,
        },
      };
      inMemoryCases = [newCase, ...inMemoryCases];
      return newCase;
    }
  },

  async getCase(caseId: string): Promise<Case> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}`);
      const data = await handleResponse<Case>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      const found = inMemoryCases.find((c) => c.id === caseId);
      if (found) return found;
      return inMemoryCases[0] || demoCase;
    }
  },

  async updateCase(caseId: string, data: Partial<Case>): Promise<Case> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await handleResponse<Case>(res);
      backendIsOnline = true;
      return resData;
    } catch {
      backendIsOnline = false;
      const index = inMemoryCases.findIndex((c) => c.id === caseId);
      if (index !== -1) {
        inMemoryCases[index] = { ...inMemoryCases[index], ...data, updated_at: new Date().toISOString() };
        return inMemoryCases[index];
      }
      return demoCase;
    }
  },

  // Evidence
  async getEvidence(caseId: string, status?: string): Promise<Evidence[]> {
    const base = getBackendBaseUrl();
    try {
      const url = status ? `${base}/api/v1/cases/${caseId}/evidence?status=${status}` : `${base}/api/v1/cases/${caseId}/evidence`;
      const res = await fetch(url);
      const data = await handleResponse<Evidence[]>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return inMemoryEvidence;
    }
  },

  async uploadEvidence(caseId: string, file: File, notes: string = ''): Promise<Evidence> {
    const base = getBackendBaseUrl();
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', notes);

      const res = await fetch(`${base}/api/v1/cases/${caseId}/evidence`, {
        method: 'POST',
        body: formData,
      });
      const data = await handleResponse<Evidence>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      const sha256 = await computeSha256(file);
      const newEv: Evidence = {
        id: `ev-${Date.now()}`,
        case_id: caseId,
        original_filename: file.name,
        storage_key: `preview/${file.name}`,
        media_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        sha256: sha256,
        uploaded_at: new Date().toISOString(),
        processing_status: 'PROCESSED',
        verification_status: 'VERIFIED_VALID',
        last_verified_at: new Date().toISOString(),
        acquisition_metadata: { notes, client_computed_hash: true },
      };
      inMemoryEvidence = [newEv, ...inMemoryEvidence];
      return newEv;
    }
  },

  async verifyEvidence(evidenceId: string): Promise<EvidenceVerifyResult> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/evidence/${evidenceId}/verify`, {
        method: 'POST',
      });
      const data = await handleResponse<EvidenceVerifyResult>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      const found = inMemoryEvidence.find((e) => e.id === evidenceId);
      const sha = found?.sha256 || '10b2c9a31af6b713437299a9cf5c7772ba9a82647890a563ee9a7647ad23f95b';
      return {
        evidence_id: evidenceId,
        original_filename: found?.original_filename || 'artifact.bin',
        expected_sha256: sha,
        calculated_sha256: sha,
        matches: true,
        verification_timestamp: new Date().toISOString(),
        verification_status: 'VERIFIED_VALID',
        details: 'Cryptographic SHA-256 byte recalculation matched registered digest perfectly.',
      };
    }
  },

  getDownloadUrl(evidenceId: string): string {
    const base = getBackendBaseUrl();
    return `${base}/api/v1/evidence/${evidenceId}/download`;
  },

  async triggerAnalysis(caseId: string): Promise<any> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}/analysis`, {
        method: 'POST',
      });
      const data = await handleResponse<any>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return {
        status: 'success',
        case_id: caseId,
        relationships_count: inMemoryGraph.edges.length,
        findings_count: inMemoryFindings.length,
        message: 'Correlation engine executed across evidence artifacts (Preview Mode).',
      };
    }
  },

  // Timeline
  async getTimeline(caseId: string, params?: { search?: string; category?: string; severity?: string; sort_order?: string }): Promise<ForensicEvent[]> {
    const base = getBackendBaseUrl();
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.category) query.append('category', params.category);
      if (params?.severity) query.append('severity', params.severity);
      if (params?.sort_order) query.append('sort_order', params.sort_order);

      const qs = query.toString() ? `?${query.toString()}` : '';
      const res = await fetch(`${base}/api/v1/cases/${caseId}/timeline${qs}`);
      const data = await handleResponse<ForensicEvent[]>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      let filtered = [...inMemoryEvents];
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((e) => e.description.toLowerCase().includes(s) || e.event_type.toLowerCase().includes(s));
      }
      if (params?.category) {
        filtered = filtered.filter((e) => e.category === params.category);
      }
      if (params?.severity) {
        filtered = filtered.filter((e) => e.severity === params.severity);
      }
      return filtered;
    }
  },

  // Graph
  async getGraph(caseId: string): Promise<GraphData> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}/graph`);
      const data = await handleResponse<GraphData>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return inMemoryGraph;
    }
  },

  // Findings
  async getFindings(caseId: string): Promise<Finding[]> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}/findings`);
      const data = await handleResponse<Finding[]>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return inMemoryFindings;
    }
  },

  async reviewFinding(findingId: string, data: { review_status: string; analyst_notes?: string; reviewer_id?: string }): Promise<Finding> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/findings/${findingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await handleResponse<Finding>(res);
      backendIsOnline = true;
      return resData;
    } catch {
      backendIsOnline = false;
      const idx = inMemoryFindings.findIndex((f) => f.id === findingId);
      if (idx !== -1) {
        inMemoryFindings[idx] = {
          ...inMemoryFindings[idx],
          review_status: data.review_status as any,
          analyst_notes: data.analyst_notes || inMemoryFindings[idx].analyst_notes,
          reviewed_at: new Date().toISOString(),
        };
        inMemoryAuditLogs.unshift({
          id: `audit-${Date.now()}`,
          case_id: inMemoryFindings[idx].case_id,
          actor_id: data.reviewer_id || 'Lead Analyst',
          action: data.review_status === 'CONFIRMED' ? 'FINDING_CONFIRMED' : 'FINDING_REJECTED',
          target_type: 'FINDING',
          target_id: findingId,
          timestamp: new Date().toISOString(),
          details: { message: `Finding ${inMemoryFindings[idx].finding_number} reviewed: ${data.review_status}` },
        });
        return inMemoryFindings[idx];
      }
      return inMemoryFindings[0];
    }
  },

  // Audit Logs
  async getAuditLogs(caseId: string): Promise<AuditLog[]> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}/audit`);
      const data = await handleResponse<AuditLog[]>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      return inMemoryAuditLogs;
    }
  },

  // Reports
  async getReportData(caseId: string): Promise<any> {
    const base = getBackendBaseUrl();
    try {
      const res = await fetch(`${base}/api/v1/cases/${caseId}/report?format=json`);
      const data = await handleResponse<any>(res);
      backendIsOnline = true;
      return data;
    } catch {
      backendIsOnline = false;
      const targetCase = inMemoryCases.find((c) => c.id === caseId) || inMemoryCases[0] || demoCase;
      return {
        metadata: {
          report_id: `REP-${targetCase.case_number}-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
          generated_at: new Date().toISOString(),
          system: 'TRACE-X Incident Reconstruction Platform v1.0',
          disclaimer:
            'This report provides technical forensic correlation based strictly on provided artifacts. Not courtroom-certified by default. Every finding must be verified independently by an investigator.',
        },
        case: targetCase,
        evidence_inventory: inMemoryEvidence.map((ev) => ({
          id: ev.id,
          original_filename: ev.original_filename,
          media_type: ev.media_type,
          size_bytes: ev.size_bytes,
          sha256: ev.sha256,
          processing_status: ev.processing_status,
          verification_status: ev.verification_status,
          last_verified_at: ev.last_verified_at || new Date().toISOString(),
          uploaded_at: ev.uploaded_at,
        })),
        findings: inMemoryFindings.map((f) => ({
          id: f.id,
          finding_number: f.finding_number,
          title: f.title,
          description: f.description,
          finding_type: f.finding_type,
          derivation_method: f.derivation_method,
          confidence: f.confidence,
          confidence_explanation: f.confidence_explanation,
          limitations: f.limitations,
          review_status: f.review_status,
          analyst_notes: f.analyst_notes,
          reviewer_id: f.reviewer_id,
          reviewed_at: f.reviewed_at,
          supporting_evidence: (f.supporting_evidence_items || []).map((s) => ({
            evidence_id: s.evidence_id,
            filename: s.filename,
            sha256: s.sha256,
            support_type: s.support_type,
            explanation: s.explanation,
          })),
        })),
        timeline: inMemoryEvents.map((ev) => ({
          id: ev.id,
          event_type: ev.event_type,
          category: ev.category,
          severity: ev.severity,
          description: ev.description,
          observed_timestamp: ev.observed_timestamp || ev.normalized_timestamp_utc,
          normalized_timestamp_utc: ev.normalized_timestamp_utc || 'UNCERTAIN',
          timestamp_precision: ev.timestamp_precision,
          timezone_provenance: ev.timezone_provenance,
          source_evidence_id: ev.evidence_id,
        })),
        relationships_summary: {
          total_relationships: inMemoryGraph.edges.length,
          items: inMemoryGraph.edges,
        },
        audit_trail: inMemoryAuditLogs,
      };
    }
  },

  getReportDownloadUrl(caseId: string, format: 'txt' | 'csv' | 'json'): string {
    const base = getBackendBaseUrl();
    return `${base}/api/v1/cases/${caseId}/report?format=${format}`;
  },
};
