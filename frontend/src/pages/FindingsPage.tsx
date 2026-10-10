import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { Finding } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const FindingsPage: React.FC = () => {
  const { activeCase, refreshCases, notify } = useCase();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [analystNotes, setAnalystNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeCase) {
      loadFindings();
    } else {
      setFindings([]);
    }
  }, [activeCase]);

  const loadFindings = async () => {
    if (!activeCase) return;
    try {
      setLoading(true);
      const data = await api.getFindings(activeCase.id);
      setFindings(data);
      // Initialize notes state
      const initialNotes: Record<string, string> = {};
      data.forEach((f) => {
        initialNotes[f.id] = f.analyst_notes || '';
      });
      setAnalystNotes(initialNotes);
    } catch (err: any) {
      notify(`Failed to load findings: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (
    findingId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'NEEDS_FURTHER_INVESTIGATION'
  ) => {
    try {
      setSubmittingId(findingId);
      const notes = analystNotes[findingId] || '';
      const updated = await api.reviewFinding(findingId, {
        review_status: status,
        analyst_notes: notes,
        reviewer_id: activeCase?.investigator || 'Principal Forensic Analyst',
      });
      notify(
        `Finding ${updated.finding_number} status set to ${status}. Recorded in case audit log.`,
        status === 'CONFIRMED' ? 'success' : 'info'
      );
      await loadFindings();
      await refreshCases();
    } catch (err: any) {
      notify(`Review action failed: ${err.message}`, 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'emerald';
      case 'REJECTED': return 'rose';
      case 'NEEDS_FURTHER_INVESTIGATION': return 'amber';
      default: return 'violet';
    }
  };

  if (!activeCase) {
    return (
      <EmptyState
        title="No Investigation Selected"
        description="Select an existing investigation case to review evidence findings."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#A78BFA]" />
              <span>AI & Correlation Findings Workbench</span>
              <span className="text-xs font-mono font-normal text-[#A1A1AA]">
                [{activeCase.case_number}]
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Evidence-backed findings with explicit uncertainty disclosures and full analyst review workflows.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] text-[#34D399]">
              {findings.filter((f) => f.review_status === 'CONFIRMED').length} Confirmed
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] text-[#FBBF24]">
              {findings.filter((f) => f.review_status === 'PENDING_REVIEW').length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : findings.length === 0 ? (
        <EmptyState
          title="No Findings Derived Yet"
          description="Trigger correlation analysis or seed the hackathon scenario to generate evidence findings."
        />
      ) : (
        <div className="space-y-6">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="p-6 rounded-xl bg-[#17171D] border border-[#343440] hover:border-[#A78BFA]/50 transition space-y-4 shadow-xl"
            >
              {/* Finding Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#343440]/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#A78BFA] bg-[#202028] px-2.5 py-1 rounded border border-[#343440]">
                    {finding.finding_number}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-[#F3F4F6]">
                      {finding.title}
                    </h2>
                    <p className="text-[11px] text-[#A1A1AA] font-mono mt-0.5">
                      Type: {finding.finding_type} • Derivation: {finding.derivation_method}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[#34D399] bg-[#34D399]/10 px-2 py-1 rounded border border-[#34D399]/30">
                    Confidence: {Math.round(finding.confidence * 100)}%
                  </span>
                  <Badge label={finding.review_status} variant={getStatusVariant(finding.review_status)} />
                </div>
              </div>

              {/* Detailed Explanation */}
              <div>
                <h3 className="text-xs font-semibold uppercase text-[#A1A1AA] font-mono mb-1">
                  Observed Pattern & Reconstruction
                </h3>
                <p className="text-sm text-[#F3F4F6] leading-relaxed">
                  {finding.description}
                </p>
              </div>

              {/* Confidence explanation */}
              <div className="p-3 rounded-lg bg-[#202028] border border-[#343440] text-xs">
                <span className="font-semibold text-[#A78BFA] font-mono">Derivation Methodology: </span>
                <span className="text-[#A1A1AA]">{finding.confidence_explanation}</span>
              </div>

              {/* Limitations & Uncertainties */}
              <div className="p-3 rounded-lg bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-xs text-[#FBBF24] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Uncertainties & Forensic Limitations: </span>
                  <span className="leading-relaxed">{finding.limitations}</span>
                </div>
              </div>

              {/* Supporting Evidence Items */}
              {finding.supporting_evidence_items && finding.supporting_evidence_items.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase text-[#A1A1AA] font-mono mb-2">
                    Grounded Supporting Artifacts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {finding.supporting_evidence_items.map((supp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#202028] border border-[#343440] text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-[#F3F4F6] truncate flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#67E8F9]" />
                            {supp.filename}
                          </p>
                          <p className="text-[10px] font-mono text-[#A1A1AA] truncate">
                            SHA256: {supp.sha256}
                          </p>
                        </div>
                        <Badge label={supp.support_type} variant="cyan" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyst Review Section */}
              <div className="pt-3 border-t border-[#343440]/60 space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-[#A1A1AA] block mb-1">
                    Analyst Assessment & Verification Notes:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter investigator observations, directory verification steps, or mitigation notes..."
                    value={analystNotes[finding.id] || ''}
                    onChange={(e) =>
                      setAnalystNotes((prev) => ({
                        ...prev,
                        [finding.id]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-[#A1A1AA] font-mono">
                    {finding.reviewed_at ? (
                      <span className="flex items-center gap-1.5 text-[#34D399]">
                        <UserCheck className="w-3.5 h-3.5" />
                        Reviewed by {finding.reviewer_id} on {new Date(finding.reviewed_at).toUTCString()}
                      </span>
                    ) : (
                      <span>Awaiting investigator determination</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReview(finding.id, 'CONFIRMED')}
                      disabled={submittingId === finding.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#34D399]/20 hover:bg-[#34D399]/30 text-[#34D399] border border-[#34D399]/40 text-xs font-semibold transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Finding</span>
                    </button>

                    <button
                      onClick={() => handleReview(finding.id, 'NEEDS_FURTHER_INVESTIGATION')}
                      disabled={submittingId === finding.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBBF24]/20 hover:bg-[#FBBF24]/30 text-[#FBBF24] border border-[#FBBF24]/40 text-xs font-semibold transition disabled:opacity-50"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Needs Further Review</span>
                    </button>

                    <button
                      onClick={() => handleReview(finding.id, 'REJECTED')}
                      disabled={submittingId === finding.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] border border-[#F87171]/40 text-xs font-semibold transition disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Finding</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
