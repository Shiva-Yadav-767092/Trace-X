import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { Case, AuditLog } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const CasesPage: React.FC = () => {
  const { cases, activeCase, setActiveCase, refreshCases, notify } = useCase();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newInvestigator, setNewInvestigator] = useState('Lead Forensic Analyst');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeCase) {
      loadAuditLogs();
    } else {
      setAuditLogs([]);
    }
  }, [activeCase]);

  const loadAuditLogs = async () => {
    if (!activeCase) return;
    try {
      setLoadingAudits(true);
      const data = await api.getAuditLogs(activeCase.id);
      setAuditLogs(data);
    } catch (err: any) {
      notify(`Failed to load audit logs: ${err.message}`, 'error');
    } finally {
      setLoadingAudits(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await api.createCase({
        title: newTitle,
        description: newDesc,
        case_number: newCaseNumber || undefined,
        investigator: newInvestigator,
      });
      notify(`Case ${created.case_number} created successfully!`, 'success');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewCaseNumber('');
      await refreshCases();
      setActiveCase(created);
    } catch (err: any) {
      notify(`Failed to create case: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (caseItem: Case, newStatus: string) => {
    try {
      await api.updateCase(caseItem.id, { status: newStatus as any });
      notify(`Case ${caseItem.case_number} status updated to ${newStatus}.`, 'success');
      await refreshCases();
      await loadAuditLogs();
    } catch (err: any) {
      notify(`Failed to update status: ${err.message}`, 'error');
    }
  };


  const getActionVariant = (act: string) => {
    if (act.includes('CREATED')) return 'cyan';
    if (act.includes('VERIFIED')) return 'emerald';
    if (act.includes('REVIEWED')) return 'violet';
    if (act.includes('EXECUTED')) return 'amber';
    return 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-[#A78BFA]" />
            <span>Case Management & Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Investigation lifecycle state machines, case-scoped access controls, and auditable action logs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#A78BFA] text-[#111116] hover:bg-[#C4B5FD] text-xs font-semibold transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] font-mono">
          All Forensic Investigations ({cases.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => {
            const isSelected = activeCase?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCase(c)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#202028] border-[#A78BFA] shadow-[0_0_15px_rgba(167,139,250,0.15)]'
                    : 'bg-[#17171D] border-[#343440] hover:border-[#A78BFA]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#A78BFA]">{c.case_number}</span>
                    {isSelected && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
                        Active Workspace
                      </span>
                    )}
                  </div>

                  <select
                    value={c.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleStatusChange(c, e.target.value)}
                    className="px-2 py-0.5 text-xs rounded bg-[#17171D] border border-[#343440] text-[#F3F4F6] font-mono focus:outline-none"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1">{c.title}</h3>
                <p className="text-xs text-[#A1A1AA] mb-3 line-clamp-2">{c.description || 'No description provided.'}</p>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#343440]/60 font-mono text-[#A1A1AA]">
                  <span>Lead: {c.investigator}</span>
                  <span>{c.stats?.evidence_count || 0} Artifacts • {c.stats?.finding_count || 0} Findings</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Case Audit Logs Section */}
      <div className="p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#34D399]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F4F6] font-mono">
              Audit Trail for Active Case [{activeCase?.case_number || 'N/A'}]
            </h2>
          </div>
          <span className="text-xs font-mono text-[#A1A1AA]">{auditLogs.length} logged record(s)</span>
        </div>

        {loadingAudits ? (
          <LoadingSkeleton rows={4} />
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-[#A1A1AA] py-6 text-center">No audit records logged for this case.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-[#202028] border border-[#343440] text-xs transition"
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#67E8F9] text-[11px]">
                        {new Date(log.timestamp).toUTCString()}
                      </span>
                      <Badge label={log.action} variant={getActionVariant(log.action)} />
                      <span className="text-[#F3F4F6] font-medium">Actor: {log.actor_id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#A1A1AA]">
                      <span className="font-mono text-[10px]">Target: {log.target_type}</span>
                      {log.details && (
                        isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {isExpanded && log.details && (
                    <div className="mt-2 pt-2 border-t border-[#343440] text-[11px]">
                      <pre className="font-mono text-[#C4B5FD] whitespace-pre-wrap overflow-x-auto bg-[#17171D] p-2.5 rounded border border-[#343440]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={handleCreateCase}
            className="w-full max-w-md rounded-xl bg-[#202028] border border-[#343440] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#343440]">
              <h3 className="text-base font-bold text-[#F3F4F6]">
                Initiate New Investigation Case
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#A1A1AA] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#A1A1AA] font-mono block mb-1">Investigation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operation ShadowDrift Investigation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#17171D] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
                />
              </div>

              <div>
                <label className="text-[#A1A1AA] font-mono block mb-1">Case Number (Auto if blank)</label>
                <input
                  type="text"
                  placeholder="e.g. CASE-2026-0042"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#17171D] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
                />
              </div>

              <div>
                <label className="text-[#A1A1AA] font-mono block mb-1">Lead Investigator Name</label>
                <input
                  type="text"
                  value={newInvestigator}
                  onChange={(e) => setNewInvestigator(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#17171D] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
                />
              </div>

              <div>
                <label className="text-[#A1A1AA] font-mono block mb-1">Investigation Scope & Description</label>
                <textarea
                  rows={3}
                  placeholder="Detail the trigger incident, involved systems, and initial observables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#17171D] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#343440] hover:bg-[#4a4a5a] text-[#F3F4F6] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-[#A78BFA] hover:bg-[#C4B5FD] text-[#111116] text-xs font-semibold transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Case'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
