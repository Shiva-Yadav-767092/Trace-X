import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileCheck2,
  AlertOctagon,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  FileText,
  Info,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import type { Evidence, EvidenceVerifyResult } from '../types';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const EvidencePage: React.FC = () => {
  const { activeCase, refreshCases, notify } = useCase();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collectorNotes, setCollectorNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [verifyResult, setVerifyResult] = useState<EvidenceVerifyResult | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeCase) {
      loadEvidence();
    } else {
      setEvidenceList([]);
    }
  }, [activeCase, statusFilter]);

  const loadEvidence = async () => {
    if (!activeCase) return;
    try {
      setLoading(true);
      const data = await api.getEvidence(activeCase.id, statusFilter || undefined);
      setEvidenceList(data);
    } catch (err: any) {
      notify(`Failed to load evidence: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeCase) return;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await api.uploadEvidence(activeCase.id, file, collectorNotes);
        successCount++;
      } catch (err: any) {
        notify(`Failed to upload ${file.name}: ${err.message}`, 'error');
      }
    }

    setUploading(false);
    setCollectorNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (successCount > 0) {
      notify(`Successfully ingested and hashed ${successCount} artifact(s)!`, 'success');
      loadEvidence();
      refreshCases();
    }
  };

  const handleVerify = async (ev: Evidence) => {
    try {
      setVerifyingId(ev.id);
      const res = await api.verifyEvidence(ev.id);
      setVerifyResult(res);
      notify(
        res.matches
          ? `Integrity Verified: SHA-256 for ${ev.original_filename} matches acquisition digest.`
          : `CRITICAL INTEGRITY FAILURE: Stored bytes for ${ev.original_filename} do not match recorded hash!`,
        res.matches ? 'success' : 'error'
      );
      loadEvidence();
    } catch (err: any) {
      notify(`Verification error: ${err.message}`, 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEvidence = evidenceList.filter((e) =>
    e.original_filename.toLowerCase().includes(search.toLowerCase()) ||
    e.sha256.toLowerCase().includes(search.toLowerCase())
  );

  if (!activeCase) {
    return (
      <EmptyState
        title="No Investigation Selected"
        description="Select an existing case or create a new investigation to manage evidence."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Upload Box */}
      <div className="p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
              <span>Evidence Vault</span>
              <span className="text-xs font-mono font-normal text-[#A1A1AA]">
                [{activeCase.case_number}]
              </span>
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Secure chain of custody, cryptographic SHA-256 integrity digests, and forensic format extraction.
            </p>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-[#343440] hover:border-[#A78BFA] transition rounded-xl p-6 bg-[#202028]/60 text-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 rounded-full bg-[#17171D] border border-[#343440] text-[#A78BFA]">
              <Upload className={`w-6 h-6 ${uploading ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F3F4F6]">
                {uploading ? 'Ingesting and computing SHA-256 digests...' : 'Click or drag forensic artifacts to upload'}
              </p>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Supported formats: <span className="font-mono text-[#C4B5FD]">.EML, .LOG, .TXT, .CSV, .JSON</span> (Max 50MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* Collector notes input */}
        <div className="mt-3 flex items-center gap-3">
          <input
            type="text"
            placeholder="Acquisition provenance / collector notes (optional)..."
            value={collectorNotes}
            onChange={(e) => setCollectorNotes(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA]"
          />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[#17171D] border border-[#343440]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by filename or SHA-256..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#A1A1AA]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#202028] border border-[#343440] text-[#F3F4F6] focus:outline-none focus:border-[#A78BFA]"
          >
            <option value="">All Processing States</option>
            <option value="PROCESSED">Processed</option>
            <option value="PROCESSING">Processing</option>
            <option value="ERROR">Error</option>
            <option value="UNSUPPORTED">Unsupported Format</option>
          </select>
        </div>
      </div>

      {/* Evidence Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : filteredEvidence.length === 0 ? (
        <EmptyState
          title="No Artifacts in Evidence Vault"
          description="Upload email files, syslog captures, proxy logs, or host activity artifacts to start investigation."
        />
      ) : (
        <div className="rounded-xl border border-[#343440] bg-[#17171D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#202028] border-b border-[#343440] text-[#A1A1AA] font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Artifact Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Digest</th>
                  <th className="py-3 px-4">Processing</th>
                  <th className="py-3 px-4">Integrity Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#343440]/60">
                {filteredEvidence.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#202028]/50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#A78BFA] shrink-0" />
                        <div>
                          <p className="font-medium text-[#F3F4F6]">{ev.original_filename}</p>
                          <p className="text-[10px] text-[#A1A1AA] font-mono">{ev.media_type}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#A1A1AA]">
                      {ev.size_bytes > 1024 * 1024
                        ? `${(ev.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                        : `${(ev.size_bytes / 1024).toFixed(1)} KB`}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#C4B5FD] bg-[#202028] px-2 py-1 rounded border border-[#343440] max-w-fit">
                        <span>{ev.sha256.slice(0, 16)}...{ev.sha256.slice(-8)}</span>
                        <button
                          onClick={() => copyToClipboard(ev.sha256)}
                          className="hover:text-white transition"
                          title="Copy full SHA-256"
                        >
                          {copiedHash === ev.sha256 ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        label={ev.processing_status}
                        variant={
                          ev.processing_status === 'PROCESSED'
                            ? 'emerald'
                            : ev.processing_status === 'UNSUPPORTED'
                            ? 'amber'
                            : ev.processing_status === 'ERROR'
                            ? 'rose'
                            : 'violet'
                        }
                      />
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        label={
                          ev.verification_status === 'VERIFIED_VALID'
                            ? 'VERIFIED'
                            : ev.verification_status === 'VERIFIED_CORRUPTED'
                            ? 'CORRUPTED'
                            : 'UNVERIFIED'
                        }
                        variant={
                          ev.verification_status === 'VERIFIED_VALID'
                            ? 'emerald'
                            : ev.verification_status === 'VERIFIED_CORRUPTED'
                            ? 'rose'
                            : 'gray'
                        }
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Verify Hash */}
                        <button
                          onClick={() => handleVerify(ev)}
                          disabled={verifyingId === ev.id}
                          className="px-2.5 py-1 rounded bg-[#202028] border border-[#343440] hover:border-[#34D399] text-[#34D399] text-[11px] font-medium transition disabled:opacity-50"
                          title="Recalculate SHA-256 on stored disk bytes"
                        >
                          {verifyingId === ev.id ? 'Hashing...' : 'Verify Hash'}
                        </button>

                        {/* Download Original */}
                        <a
                          href={api.getDownloadUrl(ev.id)}
                          download={ev.original_filename}
                          className="p-1 rounded bg-[#202028] border border-[#343440] hover:border-[#67E8F9] text-[#67E8F9] transition"
                          title="Download original preserved bytes"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {/* Details Modal */}
                        <button
                          onClick={() => setSelectedEvidence(ev)}
                          className="p-1 rounded bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-[#A1A1AA] hover:text-[#F3F4F6] transition"
                          title="Inspect acquisition provenance"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verification Result Dialog */}
      {verifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#202028] border border-[#343440] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              {verifyResult.matches ? (
                <FileCheck2 className="w-8 h-8 text-[#34D399]" />
              ) : (
                <AlertOctagon className="w-8 h-8 text-[#F87171]" />
              )}
              <div>
                <h3 className="text-base font-bold text-[#F3F4F6]">
                  {verifyResult.matches ? 'Cryptographic Integrity Confirmed' : 'Integrity Verification Failed'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Target file: {verifyResult.original_filename}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-[#17171D] p-4 rounded-lg border border-[#343440]">
              <div>
                <span className="text-[#A1A1AA]">Recorded Acquisition SHA-256:</span>
                <p className="font-mono text-[#F3F4F6] break-all">{verifyResult.expected_sha256}</p>
              </div>
              <div>
                <span className="text-[#A1A1AA]">Recomputed Disk Bytes SHA-256:</span>
                <p className="font-mono text-[#F3F4F6] break-all">{verifyResult.calculated_sha256}</p>
              </div>
              <div>
                <span className="text-[#A1A1AA]">Technical Assessment:</span>
                <p className="text-[#F3F4F6] mt-0.5">{verifyResult.details}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setVerifyResult(null)}
                className="px-4 py-1.5 rounded-lg bg-[#A78BFA] text-[#111116] font-semibold text-xs hover:bg-[#C4B5FD] transition"
              >
                Close Verification Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Details Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#202028] border border-[#343440] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F3F4F6]">
                Artifact Metadata & Provenance
              </h3>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="text-[#A1A1AA] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                <span className="text-[#A1A1AA]">Original File:</span>
                <p className="font-medium text-[#F3F4F6]">{selectedEvidence.original_filename}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                <span className="text-[#A1A1AA]">Full SHA-256 Digest:</span>
                <p className="font-mono text-[#C4B5FD] break-all">{selectedEvidence.sha256}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                  <span className="text-[#A1A1AA]">Media Type:</span>
                  <p className="font-mono text-[#F3F4F6]">{selectedEvidence.media_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                  <span className="text-[#A1A1AA]">Byte Size:</span>
                  <p className="font-mono text-[#F3F4F6]">{selectedEvidence.size_bytes} bytes</p>
                </div>
              </div>

              {selectedEvidence.processing_error && (
                <div className="p-3 rounded-lg bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]">
                  <span className="font-semibold">Parser Diagnostic:</span>
                  <p className="mt-1">{selectedEvidence.processing_error}</p>
                </div>
              )}

              {selectedEvidence.acquisition_metadata && (
                <div className="p-3 rounded-lg bg-[#17171D] border border-[#343440]">
                  <span className="text-[#A1A1AA]">Acquisition Provenance:</span>
                  <pre className="font-mono text-[11px] text-[#F3F4F6] mt-1 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedEvidence.acquisition_metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-1.5 rounded-lg bg-[#343440] hover:bg-[#4a4a5a] text-[#F3F4F6] font-medium text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
