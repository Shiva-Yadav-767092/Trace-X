import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldAlert,
  Clock,
  FileCheck,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const ReportsPage: React.FC = () => {
  const { activeCase, notify } = useCase();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCase) {
      loadReport();
    } else {
      setReportData(null);
    }
  }, [activeCase]);

  const loadReport = async () => {
    if (!activeCase) return;
    try {
      setLoading(true);
      const data = await api.getReportData(activeCase.id);
      setReportData(data);
    } catch (err: any) {
      notify(`Failed to generate report: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeCase) {
    return (
      <EmptyState
        title="No Investigation Selected"
        description="Select an existing investigation case to compile report."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden during browser print) */}
      <div className="print:hidden p-6 rounded-xl bg-[#17171D] border border-[#343440] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F3F4F6] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#A78BFA]" />
            <span>Structured Forensic Reports</span>
            <span className="text-xs font-mono font-normal text-[#A1A1AA]">
              [{activeCase.case_number}]
            </span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Cryptographically grounded incident documentation distinguishing facts, correlations, and review determinations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={api.getReportDownloadUrl(activeCase.id, 'json')}
            download={`TRACE_X_Report_${activeCase.case_number}.json`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#67E8F9] text-xs font-medium text-[#67E8F9] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </a>

          <a
            href={api.getReportDownloadUrl(activeCase.id, 'txt')}
            download={`TRACE_X_Report_${activeCase.case_number}.txt`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#A78BFA] text-xs font-medium text-[#C4B5FD] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export TXT</span>
          </a>

          <a
            href={api.getReportDownloadUrl(activeCase.id, 'csv')}
            download={`TRACE_X_Timeline_${activeCase.case_number}.csv`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202028] border border-[#343440] hover:border-[#34D399] text-xs font-medium text-[#34D399] transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#A78BFA] text-[#111116] hover:bg-[#C4B5FD] text-xs font-semibold transition shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF View</span>
          </button>
        </div>
      </div>

      {/* Main Report Document Sheet */}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : !reportData ? (
        <EmptyState
          title="Report Not Available"
          description="Unable to compile case report. Ensure evidence artifacts exist."
        />
      ) : (
        <div className="p-8 rounded-xl bg-[#17171D] border border-[#343440] shadow-2xl space-y-8 font-sans print:bg-white print:text-black print:p-0 print:border-none">
          {/* Header */}
          <div className="border-b border-[#343440] pb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#A78BFA] print:text-purple-700">
                  TRACE-X DIGITAL FORENSICS PLATFORM
                </span>
                <h1 className="text-2xl font-bold text-[#F3F4F6] print:text-black mt-1">
                  Incident Reconstruction & Evidence Correlation Report
                </h1>
              </div>

              <div className="text-right font-mono text-xs text-[#A1A1AA] print:text-gray-600">
                <p>Report ID: {reportData.metadata.report_id}</p>
                <p>Generated: {new Date(reportData.metadata.generated_at).toUTCString()}</p>
              </div>
            </div>

            {/* Case Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-4 rounded-lg bg-[#202028] print:bg-gray-100 border border-[#343440] print:border-gray-300 text-xs">
              <div>
                <span className="text-[#A1A1AA] print:text-gray-500 font-mono">Case Number:</span>
                <p className="font-semibold text-[#F3F4F6] print:text-black mt-0.5">{reportData.case.case_number}</p>
              </div>
              <div>
                <span className="text-[#A1A1AA] print:text-gray-500 font-mono">Case Status:</span>
                <p className="font-semibold text-[#67E8F9] print:text-blue-700 mt-0.5">{reportData.case.status}</p>
              </div>
              <div>
                <span className="text-[#A1A1AA] print:text-gray-500 font-mono">Lead Investigator:</span>
                <p className="font-semibold text-[#F3F4F6] print:text-black mt-0.5">{reportData.case.investigator}</p>
              </div>
              <div>
                <span className="text-[#A1A1AA] print:text-gray-500 font-mono">Artifacts Total:</span>
                <p className="font-semibold text-[#F3F4F6] print:text-black mt-0.5">{reportData.evidence_inventory.length} items</p>
              </div>
            </div>
          </div>

          {/* Methodology & Disclaimer */}
          <div className="p-4 rounded-lg bg-[#202028] print:bg-gray-100 border border-[#343440] print:border-gray-300 text-xs space-y-1">
            <h3 className="font-semibold uppercase tracking-wider font-mono text-[#A78BFA] print:text-purple-700">
              Methodology & Legal Disclaimer
            </h3>
            <p className="text-[#A1A1AA] print:text-gray-700 leading-relaxed">
              {reportData.metadata.disclaimer} Observational facts are anchored directly to stored file bytes.
              Relationships and finding ratings are derived algorithmically and must be independently corroborated.
            </p>
          </div>

          {/* Section 1: Evidence Inventory & SHA-256 Digests */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F4F6] print:text-black font-mono flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#A78BFA]" />
              <span>1. Evidence Inventory & Cryptographic Hashes (SHA-256)</span>
            </h2>

            <div className="overflow-x-auto rounded-lg border border-[#343440] print:border-gray-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#202028] print:bg-gray-200 border-b border-[#343440] print:border-gray-300 font-mono text-[#A1A1AA] print:text-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Filename</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">SHA-256 Digest</th>
                    <th className="py-2.5 px-3">Processing</th>
                    <th className="py-2.5 px-3">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#343440] print:divide-gray-300">
                  {reportData.evidence_inventory.map((ev: any) => (
                    <tr key={ev.id}>
                      <td className="py-2 px-3 font-medium text-[#F3F4F6] print:text-black">{ev.original_filename}</td>
                      <td className="py-2 px-3 font-mono text-[#A1A1AA] print:text-gray-600">{ev.size_bytes} bytes</td>
                      <td className="py-2 px-3 font-mono text-[#C4B5FD] print:text-purple-800 text-[11px]">{ev.sha256}</td>
                      <td className="py-2 px-3">{ev.processing_status}</td>
                      <td className="py-2 px-3 font-semibold text-[#34D399] print:text-green-700">{ev.verification_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Findings & Review Determinations */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F4F6] print:text-black font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#A78BFA]" />
              <span>2. Incident Findings & Review Determinations</span>
            </h2>

            <div className="space-y-4">
              {reportData.findings.map((f: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-[#202028] print:bg-gray-50 border border-[#343440] print:border-gray-300 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono font-bold text-[#A78BFA] print:text-purple-700">
                      [{f.finding_number}] {f.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#34D399] print:text-green-700 font-semibold">
                        Confidence: {Math.round(f.confidence * 100)}%
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded bg-[#17171D] border border-[#343440] print:border-gray-400 font-bold">
                        Status: {f.review_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[#F3F4F6] print:text-black leading-relaxed">{f.description}</p>
                  <p className="text-[#A1A1AA] print:text-gray-600 italic">Methodology: {f.confidence_explanation}</p>
                  <p className="text-[#FBBF24] print:text-amber-800">Forensic Limitations: {f.limitations}</p>

                  {f.analyst_notes && (
                    <div className="p-2 rounded bg-[#17171D] print:bg-gray-100 border border-[#343440] print:border-gray-300">
                      <span className="font-mono font-semibold text-[#A78BFA] print:text-purple-700">Analyst Notes: </span>
                      <span className="text-[#F3F4F6] print:text-black">{f.analyst_notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Chronological Timeline Highlights */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#F3F4F6] print:text-black font-mono flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A78BFA]" />
              <span>3. Chronological Reconstruction Timeline (Sampled)</span>
            </h2>

            <div className="overflow-x-auto rounded-lg border border-[#343440] print:border-gray-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#202028] print:bg-gray-200 border-b border-[#343440] print:border-gray-300 font-mono text-[#A1A1AA] print:text-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#343440] print:divide-gray-300 font-mono text-[11px]">
                  {reportData.timeline.slice(0, 10).map((ev: any) => (
                    <tr key={ev.id}>
                      <td className="py-1.5 px-3 text-[#67E8F9] print:text-blue-800">{ev.normalized_timestamp_utc}</td>
                      <td className="py-1.5 px-3 font-semibold">{ev.category}</td>
                      <td className="py-1.5 px-3">{ev.severity}</td>
                      <td className="py-1.5 px-3 text-[#F3F4F6] print:text-black font-sans">{ev.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sign-Off Block */}
          <div className="pt-6 border-t border-[#343440] print:border-gray-400 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <p className="text-[#A1A1AA] print:text-gray-600 mb-6">Investigator Signature / Authentication:</p>
              <div className="border-b border-[#343440] print:border-black w-48 mb-1"></div>
              <p className="text-[#F3F4F6] print:text-black font-semibold">{reportData.case.investigator}</p>
            </div>
            <div className="text-right">
              <p className="text-[#A1A1AA] print:text-gray-600 mb-6">Certification Date:</p>
              <p className="text-[#F3F4F6] print:text-black font-semibold">
                {new Date(reportData.metadata.generated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
