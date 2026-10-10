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

const BACKEND_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${BACKEND_URL}/api/v1`;

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
  // Health
  async getHealth() {
    const res = await fetch(`${BACKEND_URL || ''}/health`);
    return handleResponse<any>(res);
  },

  // Overview
  async getOverview(): Promise<OverviewStats> {
    const res = await fetch(`${API_BASE}/cases/overview`);
    return handleResponse<OverviewStats>(res);
  },

  // Demo seeder
  async seedDemoCase(): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/demo-seed`, { method: 'POST' });
    return handleResponse<any>(res);
  },

  // Cases
  async getCases(status?: string): Promise<Case[]> {
    const url = status ? `${API_BASE}/cases?status=${status}` : `${API_BASE}/cases`;
    const res = await fetch(url);
    return handleResponse<Case[]>(res);
  },

  async createCase(data: { title: string; description?: string; investigator?: string; case_number?: string }): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Case>(res);
  },

  async getCase(caseId: string): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${caseId}`);
    return handleResponse<Case>(res);
  },

  async updateCase(caseId: string, data: Partial<Case>): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Case>(res);
  },

  // Evidence
  async getEvidence(caseId: string, status?: string): Promise<Evidence[]> {
    const url = status ? `${API_BASE}/cases/${caseId}/evidence?status=${status}` : `${API_BASE}/cases/${caseId}/evidence`;
    const res = await fetch(url);
    return handleResponse<Evidence[]>(res);
  },

  async uploadEvidence(caseId: string, file: File, notes: string = ''): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', notes);

    const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Evidence>(res);
  },

  async verifyEvidence(evidenceId: string): Promise<EvidenceVerifyResult> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/verify`, {
      method: 'POST',
    });
    return handleResponse<EvidenceVerifyResult>(res);
  },

  getDownloadUrl(evidenceId: string): string {
    return `${API_BASE}/evidence/${evidenceId}/download`;
  },

  async triggerAnalysis(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/analysis`, {
      method: 'POST',
    });
    return handleResponse<any>(res);
  },

  // Timeline
  async getTimeline(caseId: string, params?: { search?: string; category?: string; severity?: string; sort_order?: string }): Promise<ForensicEvent[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.sort_order) query.append('sort_order', params.sort_order);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/cases/${caseId}/timeline${qs}`);
    return handleResponse<ForensicEvent[]>(res);
  },

  // Graph
  async getGraph(caseId: string): Promise<GraphData> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/graph`);
    return handleResponse<GraphData>(res);
  },

  // Findings
  async getFindings(caseId: string): Promise<Finding[]> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/findings`);
    return handleResponse<Finding[]>(res);
  },

  async reviewFinding(findingId: string, data: { review_status: string; analyst_notes?: string; reviewer_id?: string }): Promise<Finding> {
    const res = await fetch(`${API_BASE}/findings/${findingId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Finding>(res);
  },

  // Audit Logs
  async getAuditLogs(caseId: string): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/audit`);
    return handleResponse<AuditLog[]>(res);
  },

  // Reports
  async getReportData(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/report?format=json`);
    return handleResponse<any>(res);
  },

  getReportDownloadUrl(caseId: string, format: 'txt' | 'csv' | 'json'): string {
    return `${API_BASE}/cases/${caseId}/report?format=${format}`;
  },
};
