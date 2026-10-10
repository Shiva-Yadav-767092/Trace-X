import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, FolderSearch, Activity, Server, X } from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { Badge } from './Badge';
import { api, getBackendBaseUrl, setBackendBaseUrl } from '../api/client';

export const Navbar: React.FC = () => {
  const { activeCase, setActiveCase, cases, seedDemo, refreshCases, notify } = useCase();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendHealth, setBackendHealth] = useState<{ status: string; note?: string }>({ status: 'checking' });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const checkHealth = async () => {
    try {
      const h = await api.getHealth();
      setBackendHealth(h);
    } catch {
      setBackendHealth({ status: 'preview_mode' });
    }
  };

  useEffect(() => {
    checkHealth();
    setCustomUrlInput(getBackendBaseUrl());
  }, []);

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

  const handleSaveBackendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendBaseUrl(customUrlInput);
    notify('Updated backend target URL. Testing connection...', 'info');
    await checkHealth();
    await refreshCases();
    setShowConfigModal(false);
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

  const isLive = backendHealth.status === 'healthy';

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

        {/* Explicit Backend Health Status Badge */}
        <button
          onClick={() => setShowConfigModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition cursor-pointer ${
            isLive
              ? 'bg-[#111116] border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/10'
              : 'bg-[#202028] border-[#FBBF24]/40 text-[#FBBF24] hover:bg-[#FBBF24]/10'
          }`}
          title="Click to view backend connection settings"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-[#34D399] animate-pulse' : 'bg-[#FBBF24]'
            }`}
          ></span>
          <span className="font-mono">
            {isLive ? 'API Online' : 'Static Preview Mode'}
          </span>
        </button>
      </div>

      {/* Connection & Backend Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#17171D] border border-[#343440] rounded-xl max-w-md w-full p-6 shadow-2xl relative text-[#F3F4F6]">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-[#A1A1AA] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#A78BFA]/20 border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Backend Architecture & Status</h3>
                <p className="text-xs text-[#A1A1AA]">TRACE-X API Connectivity</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#202028] border border-[#343440]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#A1A1AA]">Current Status:</span>
                  <span className={`font-semibold ${isLive ? 'text-[#34D399]' : 'text-[#FBBF24]'}`}>
                    {isLive ? 'Connected to Live FastAPI' : 'GitHub Pages Static Preview'}
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                  {isLive
                    ? 'All cryptographic SHA-256 verification and correlation calculations are running live on the Python FastAPI server.'
                    : 'GitHub Pages hosts static assets only (no Python runtime). TRACE-X is displaying the interactive demo scenario with client-side Web Crypto verification.'}
                </p>
              </div>

              <form onSubmit={handleSaveBackendUrl} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#C4B5FD] mb-1">
                    Connect Live Backend URL (Optional):
                  </label>
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="e.g. https://trace-x.onrender.com or http://127.0.0.1:8000"
                    className="w-full px-3 py-2 rounded-lg bg-[#111116] border border-[#343440] text-sm text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
                  />
                  <p className="text-[10px] text-[#A1A1AA] mt-1">
                    Leave blank to use default relative path or static demo fallback.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput('');
                      setBackendBaseUrl('');
                      checkHealth();
                      refreshCases();
                      setShowConfigModal(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#343440] text-xs hover:bg-[#202028]"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#A78BFA] text-[#111116] font-semibold text-xs hover:bg-[#C4B5FD]"
                  >
                    Save & Reconnect
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
