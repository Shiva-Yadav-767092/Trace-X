import React, { useState } from 'react';
import { Shield, Sparkles, FolderSearch, Activity } from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { Badge } from './Badge';
import { api } from '../api/client';

export const Navbar: React.FC = () => {
  const { activeCase, setActiveCase, cases, seedDemo, refreshCases, notify } = useCase();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    if (!activeCase) return;
    try {
      setIsAnalyzing(true);
      notify('Executing correlation engine across evidence artifacts...', 'info');
      const res = await api.triggerAnalysis(activeCase.id);
      notify(`Correlation pipeline completed: ${res.relationships_count} relationships, ${res.findings_count} findings generated!`, 'success');
      await refreshCases();
    } catch (err: any) {
      notify(`Analysis failed: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'OPEN': return 'cyan';
      case 'IN_PROGRESS': return 'violet';
      case 'UNDER_REVIEW': return 'amber';
      case 'CLOSED': return 'emerald';
      default: return 'gray';
    }
  };

  return (
    <header className="h-16 border-b border-[#343440] bg-[#17171D] px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#A78BFA]/20 border border-[#A78BFA]/50 flex items-center justify-center text-[#A78BFA] shadow-[0_0_15px_rgba(167,139,250,0.25)]">
          <Shield className="w-5 h-5 text-[#A78BFA]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wider text-[#F3F4F6] font-mono">TRACE-X</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#A78BFA]/15 text-[#C4B5FD] border border-[#A78BFA]/30">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] hidden sm:block">
            Threat Reconstruction, Artifact Correlation & Evidence eXplorer
          </p>
        </div>
      </div>

      {/* Center: Case Context Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440]">
          <FolderSearch className="w-4 h-4 text-[#A78BFA]" />
          <span className="text-xs text-[#A1A1AA] hidden md:inline">Investigation:</span>
          <select
            value={activeCase?.id || ''}
            onChange={(e) => {
              const selected = cases.find((c) => c.id === e.target.value);
              if (selected) setActiveCase(selected);
            }}
            className="bg-transparent text-sm text-[#F3F4F6] font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
          >
            {cases.length === 0 && <option value="">No investigations</option>}
            {cases.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#202028] text-[#F3F4F6]">
                {c.case_number} — {c.title}
              </option>
            ))}
          </select>

          {activeCase && (
            <Badge label={activeCase.status} variant={getStatusVariant(activeCase.status)} size="sm" />
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {activeCase && (
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-xs font-medium text-[#F3F4F6] hover:text-[#C4B5FD] transition disabled:opacity-50"
            title="Run deterministic correlation across current case evidence"
          >
            <Activity className={`w-3.5 h-3.5 text-[#67E8F9] ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Correlate Evidence</span>
          </button>
        )}

        {/* 1-Click Demo Loader */}
        <button
          onClick={seedDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] text-[#111116] hover:brightness-110 font-semibold text-xs shadow-md transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Demo Scenario</span>
        </button>

        {/* System Health Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111116] border border-[#343440] text-[11px] text-[#A1A1AA]">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
          <span>Engine Online</span>
        </div>
      </div>
    </header>
  );
};
