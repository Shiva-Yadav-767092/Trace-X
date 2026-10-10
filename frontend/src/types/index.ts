export interface CaseStats {
  evidence_count: number;
  event_count: number;
  relationship_count: number;
  finding_count: number;
  pending_finding_count: number;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'CLOSED';
  investigator: string;
  created_at: string;
  updated_at: string;
  stats?: CaseStats;
}

export interface Evidence {
  id: string;
  case_id: string;
  original_filename: string;
  storage_key: string;
  media_type: string;
  size_bytes: number;
  sha256: string;
  acquisition_metadata?: Record<string, any>;
  uploaded_at: string;
  processing_status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'ERROR' | 'UNSUPPORTED';
  processing_error?: string;
  last_verified_at?: string;
  verification_status: 'UNVERIFIED' | 'VERIFIED_VALID' | 'VERIFIED_CORRUPTED';
}

export interface EvidenceVerifyResult {
  evidence_id: string;
  original_filename: string;
  expected_sha256: string;
  calculated_sha256: string;
  matches: boolean;
  verification_timestamp: string;
  verification_status: string;
  details: string;
}

export interface ForensicEvent {
  id: string;
  case_id: string;
  evidence_id: string;
  event_type: string;
  category: 'AUTHENTICATION' | 'NETWORK' | 'EXECUTION' | 'EMAIL' | 'SYSTEM' | 'BENIGN' | 'GENERAL';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  observed_timestamp?: string;
  normalized_timestamp_utc?: string;
  timestamp_precision: 'EXACT_SECOND' | 'MINUTE' | 'HOUR' | 'DATE_ONLY' | 'UNCERTAIN' | 'UNKNOWN';
  timezone_provenance: string;
  extracted_metadata?: Record<string, any>;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  data: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship_type: string;
  derivation_method: string;
  confidence: number;
  explanation: string;
  supporting_evidence?: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SupportingEvidenceItem {
  evidence_id: string;
  filename: string;
  sha256: string;
  support_type: string;
  explanation: string;
}

export interface Finding {
  id: string;
  case_id: string;
  finding_number: string;
  title: string;
  description: string;
  finding_type: string;
  derivation_method: string;
  confidence: number;
  confidence_explanation: string;
  limitations: string;
  review_status: 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED' | 'NEEDS_FURTHER_INVESTIGATION';
  analyst_notes?: string;
  relevant_events?: string[];
  relevant_entities?: string[];
  created_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  supporting_evidence_items?: SupportingEvidenceItem[];
}

export interface AuditLog {
  id: string;
  case_id?: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ProcessingJob {
  id: string;
  case_id: string;
  job_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error_summary?: string;
  progress_pct: number;
  details?: Record<string, any>;
}

export interface OverviewStats {
  total_cases: number;
  total_evidence: number;
  total_events: number;
  total_relationships: number;
  pending_findings: number;
  confirmed_findings: number;
  evidence_by_type: Record<string, number>;
  events_by_category: Record<string, number>;
  recent_cases: Case[];
  recent_jobs: ProcessingJob[];
}
