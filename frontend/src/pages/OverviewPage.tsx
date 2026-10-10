import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  FileCode,
  Layers,
  Network,
  AlertTriangle,
  Sparkles,
  Plus,
  Upload,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { OverviewStats } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const PIE_COLORS = ['#A78BFA', '#67E8F9', '#34D399', '#FBBF24', '#F87171', '#C084FC'];

export const OverviewPage: React.FC = () => {
  const { activeCase, seedDemo, setActiveCase } = useCase();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [activeCase]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const data = await api.getOverview();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const evidenceChartData = stats?.evidence_by_type
    ? Object.entries(stats.evidence_by_type).map(([name, value]) => ({
        name: name.split('/')[1] || name,
        value,
      }))
    : [];

  const eventCategoryData = stats?.events_by_category
    ? Object.entries(stats.events_by_category).map(([name, count]) => ({
        name,
        count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-gradient-to-r from-[#202028] to-[#17171D] border border-[#343440] shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-[#F3F4F6] mb-1">
            Investigation Command Center
          </h1>
          <p className="text-sm text-[#A1A1AA]">
            Automated multi-artifact correlation, chronological timeline reconstruction, and grounded finding synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-sm font-medium text-[#F3F4F6] transition"
          >
            <Plus className="w-4 h-4 text-[#A78BFA]" />
            <span>Create Case</span>
          </button>
          <button
            onClick={() => navigate('/evidence')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#67E8F9] text-sm font-medium text-[#F3F4F6] transition"
          >
            <Upload className="w-4 h-4 text-[#67E8F9]" />
            <span>Upload Artifacts</span>
          </button>
          <button
            onClick={seedDemo}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#A78BFA] text-[#111116] hover:bg-[#C4B5FD] text-sm font-semibold transition shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Demo Scenario</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#A1A1AA] uppercase">Total Cases</span>
                <FolderKanban className="w-4 h-4 text-[#A78BFA]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#F3F4F6]">{stats?.total_cases || 0}</div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">Active forensic cases</p>
            </div>

            <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#A1A1AA] uppercase">Artifacts Ingested</span>
                <FileCode className="w-4 h-4 text-[#67E8F9]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#F3F4F6]">{stats?.total_evidence || 0}</div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">SHA-256 byte preserved</p>
            </div>

            <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#A1A1AA] uppercase">Extracted Events</span>
                <Layers className="w-4 h-4 text-[#34D399]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#F3F4F6]">{stats?.total_events || 0}</div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">Normalized UTC telemetry</p>
            </div>

            <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#A1A1AA] uppercase">Correlations</span>
                <Network className="w-4 h-4 text-[#C084FC]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#F3F4F6]">{stats?.total_relationships || 0}</div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">Explainable graph edges</p>
            </div>

            <div className="p-4 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#A1A1AA] uppercase">Pending Findings</span>
                <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
              </div>
              <div className="text-2xl font-bold font-mono text-[#FBBF24]">{stats?.pending_findings || 0}</div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">Awaiting analyst confirmation</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Category Volume */}
            <div className="p-5 rounded-xl bg-[#17171D] border border-[#343440]">
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1">
                Event Volume by Forensic Category
              </h3>
              <p className="text-xs text-[#A1A1AA] mb-4">
                Telemetry breakdown across execution, network, auth, and system logs.
              </p>
              <div className="h-64 w-full">
                {eventCategoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#A1A1AA]">
                    No events extracted yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventCategoryData}>
                      <XAxis dataKey="name" stroke="#A1A1AA" fontSize={11} />
                      <YAxis stroke="#A1A1AA" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#202028',
                          borderColor: '#343440',
                          borderRadius: '8px',
                          color: '#F3F4F6',
                        }}
                      />
                      <Bar dataKey="count" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Evidence Distribution */}
            <div className="p-5 rounded-xl bg-[#17171D] border border-[#343440]">
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1">
                Evidence Format Distribution
              </h3>
              <p className="text-xs text-[#A1A1AA] mb-4">
                Heterogeneous artifacts ingested (.eml, .log, .json, .csv, .txt).
              </p>
              <div className="h-64 w-full flex items-center justify-center">
                {evidenceChartData.length === 0 ? (
                  <div className="text-xs text-[#A1A1AA]">No evidence artifacts loaded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={evidenceChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${Math.round((percent ?? 0) * 100)}%)`}
                        labelLine={false}
                      >
                        {evidenceChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#202028',
                          borderColor: '#343440',
                          borderRadius: '8px',
                          color: '#F3F4F6',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Recent Investigations & Processing Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Cases */}
            <div className="lg:col-span-2 p-5 rounded-xl bg-[#17171D] border border-[#343440]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F3F4F6]">Recent Investigations</h3>
                <button
                  onClick={() => navigate('/cases')}
                  className="text-xs text-[#A78BFA] hover:text-[#C4B5FD] flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {stats?.recent_cases && stats.recent_cases.length > 0 ? (
                  stats.recent_cases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveCase(c);
                        navigate('/evidence');
                      }}
                      className="p-3 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold text-[#A78BFA]">{c.case_number}</span>
                          <span className="text-xs text-[#A1A1AA]">•</span>
                          <span className="text-xs font-medium text-[#F3F4F6] truncate">{c.title}</span>
                        </div>
                        <p className="text-[11px] text-[#A1A1AA] truncate">{c.description || 'No description'}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge label={c.status} variant={c.status === 'IN_PROGRESS' ? 'violet' : 'cyan'} />
                        <span className="text-xs text-[#A1A1AA] font-mono">
                          {c.stats?.evidence_count || 0} files
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#A1A1AA] py-4 text-center">No investigations recorded yet.</p>
                )}
              </div>
            </div>

            {/* Jobs Status */}
            <div className="p-5 rounded-xl bg-[#17171D] border border-[#343440]">
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-4">Engine Processing Pipeline</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-[#F3F4F6]">Parser Registry</span>
                    <Badge label="5 PARSERS" variant="emerald" />
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    EML, JSON, CSV, LOG, and TXT modules active with line-level provenance.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-[#F3F4F6]">Correlation Engine</span>
                    <Badge label="DETERMINISTIC" variant="violet" />
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Exact indicators, shared hashes, IP pivots, and temporal proximity windowing.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                  <div className="flex items-center justify-between text-xs font-medium mb-1">
                    <span className="text-[#F3F4F6]">Byte Integrity</span>
                    <Badge label="SHA-256" variant="cyan" />
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Live re-hashing verification for acquisition integrity proof.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
