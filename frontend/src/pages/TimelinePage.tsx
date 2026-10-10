import React, { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  ArrowUpDown,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { ForensicEvent } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const TimelinePage: React.FC = () => {
  const { activeCase, notify } = useCase();
  const [events, setEvents] = useState<ForensicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedEvent, setSelectedEvent] = useState<ForensicEvent | null>(null);

  useEffect(() => {
    if (activeCase) {
      loadTimeline();
    } else {
      setEvents([]);
    }
  }, [activeCase, category, severity, sortOrder]);

  const loadTimeline = async () => {
    if (!activeCase) return;
    try {
      setLoading(true);
      const data = await api.getTimeline(activeCase.id, {
        search: search || undefined,
        category: category || undefined,
        severity: severity || undefined,
        sort_order: sortOrder,
      });
      setEvents(data);
    } catch (err: any) {
      notify(`Failed to load timeline: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTimeline();
  };

  const getCategoryVariant = (cat: string) => {
    switch (cat) {
      case 'AUTHENTICATION': return 'amber';
      case 'NETWORK': return 'cyan';
      case 'EXECUTION': return 'rose';
      case 'EMAIL': return 'violet';
      case 'BENIGN': return 'emerald';
      default: return 'gray';
    }
  };

  const getSeverityVariant = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH': return 'rose';
      case 'MEDIUM': return 'amber';
      case 'LOW': return 'cyan';
      default: return 'gray';
    }
  };

  const uncertainCount = events.filter(
    (e) => e.timestamp_precision === 'UNCERTAIN' || e.timestamp_precision === 'UNKNOWN'
  ).length;

  if (!activeCase) {
    return (
      <EmptyState
        title="No Investigation Selected"
        description="Select an existing case to view reconstructed timeline."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#A78BFA]" />
              <span>Incident Timeline</span>
              <span className="text-xs font-mono font-normal text-[#A1A1AA]">
                [{activeCase.case_number}]
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Normalized UTC chronological stream with timezone provenance and precision indicators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#A1A1AA] bg-[#202028] px-3 py-1.5 rounded-lg border border-[#343440]">
              {events.length} event(s) in sequence
            </span>
          </div>
        </div>

        {/* Uncertainty Alert Disclosure */}
        {uncertainCount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-[#FBBF24]/10 border border-[#FBBF24]/30 flex items-start gap-3 text-xs text-[#FBBF24]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Uncertainty Disclosure: </span>
              {uncertainCount} event(s) lack standardized sub-second timestamps or reflect clock skew.
              TRACE-X explicitly marks these with warning badges and avoids fabricating chronological certainty.
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-[#17171D] border border-[#343440]"
      >
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search events, IP, user, command line..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA]"
          />
        </div>

        {/* Category */}
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
          >
            <option value="">All Categories</option>
            <option value="AUTHENTICATION">Authentication</option>
            <option value="NETWORK">Network</option>
            <option value="EXECUTION">Execution</option>
            <option value="EMAIL">Email</option>
            <option value="BENIGN">Benign</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-[#F3F4F6] transition font-medium"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>{sortOrder === 'asc' ? 'Earliest First' : 'Latest First'}</span>
          </button>
        </div>
      </form>

      {/* Timeline Stream */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="Try broadening your search or ingest additional evidence artifacts in Evidence Vault."
        />
      ) : (
        <div className="relative border-l-2 border-[#343440] ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-6">
          {events.map((ev) => {
            const isUncertain =
              ev.timestamp_precision === 'UNCERTAIN' || ev.timestamp_precision === 'UNKNOWN';

            return (
              <div
                key={ev.id}
                className="relative group p-4 rounded-xl bg-[#17171D] border border-[#343440] hover:border-[#A78BFA]/60 transition shadow-md"
              >
                {/* Timeline node pin */}
                <div
                  className={`absolute -left-[27px] sm:-left-[35px] top-5 w-4 h-4 rounded-full border-2 border-[#111116] ${
                    isUncertain
                      ? 'bg-[#FBBF24] ring-4 ring-[#FBBF24]/20'
                      : ev.severity === 'HIGH' || ev.severity === 'CRITICAL'
                      ? 'bg-[#F87171] ring-4 ring-[#F87171]/20'
                      : 'bg-[#A78BFA] ring-4 ring-[#A78BFA]/20'
                  }`}
                />

                {/* Event Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-[#67E8F9]">
                      {ev.normalized_timestamp_utc
                        ? new Date(ev.normalized_timestamp_utc).toUTCString()
                        : 'UNCERTAIN CHRONOLOGY'}
                    </span>

                    {isUncertain && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Precision: {ev.timestamp_precision}</span>
                      </span>
                    )}

                    <Badge label={ev.category} variant={getCategoryVariant(ev.category)} />
                    <Badge label={ev.severity} variant={getSeverityVariant(ev.severity)} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#A1A1AA]">
                      {ev.timezone_provenance}
                    </span>
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="text-xs text-[#A78BFA] hover:text-[#C4B5FD] font-medium"
                    >
                      Inspect
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-[#F3F4F6] font-medium mb-3 leading-relaxed">
                  {ev.description}
                </p>

                {/* Metadata badges & indicators */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#343440]/60 text-xs">
                  <div className="flex items-center gap-1.5 text-[#A1A1AA] font-mono text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Evidence ID: {ev.evidence_id.slice(0, 8)}...</span>
                  </div>

                  {ev.extracted_metadata && (
                    <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] font-mono">
                      {ev.extracted_metadata.source_line && (
                        <span>Line {ev.extracted_metadata.source_line}</span>
                      )}
                      {ev.extracted_metadata.source_row && (
                        <span>Row {ev.extracted_metadata.source_row}</span>
                      )}
                      {ev.extracted_metadata.json_path && (
                        <span>{ev.extracted_metadata.json_path}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#202028] border border-[#343440] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F3F4F6]">
                Event Forensic Telemetry
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#A1A1AA] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                <span className="text-[#A1A1AA]">Description:</span>
                <p className="text-[#F3F4F6] font-medium mt-1">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                  <span className="text-[#A1A1AA]">Observed Timestamp (Source):</span>
                  <p className="font-mono text-[#67E8F9] mt-0.5">
                    {selectedEvent.observed_timestamp || 'N/A'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                  <span className="text-[#A1A1AA]">Normalized Timestamp (UTC):</span>
                  <p className="font-mono text-[#67E8F9] mt-0.5">
                    {selectedEvent.normalized_timestamp_utc
                      ? new Date(selectedEvent.normalized_timestamp_utc).toISOString()
                      : 'Uncertain / Missing'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                <span className="text-[#A1A1AA]">Source Metadata & Line Extraction:</span>
                <pre className="font-mono text-[11px] text-[#F3F4F6] mt-1 overflow-x-auto whitespace-pre-wrap max-h-48">
                  {JSON.stringify(selectedEvent.extracted_metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-lg bg-[#343440] hover:bg-[#4a4a5a] text-[#F3F4F6] font-medium text-xs transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
