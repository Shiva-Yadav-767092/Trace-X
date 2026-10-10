import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Clock,
  Share2,
  Cpu,
  FileText,
  FolderGit2,
} from 'lucide-react';
import { useCase } from '../context/CaseContext';

export const Sidebar: React.FC = () => {
  const { activeCase } = useCase();

  const navItems = [
    { name: 'Investigation Overview', path: '/', icon: LayoutDashboard },
    { name: 'Evidence Vault', path: '/evidence', icon: Database, count: activeCase?.stats?.evidence_count },
    { name: 'Incident Timeline', path: '/timeline', icon: Clock, count: activeCase?.stats?.event_count },
    { name: 'Investigation Graph', path: '/graph', icon: Share2, count: activeCase?.stats?.relationship_count },
    { name: 'AI Findings', path: '/findings', icon: Cpu, badge: activeCase?.stats?.pending_finding_count ? `${activeCase.stats.pending_finding_count} pending` : undefined },
    { name: 'Forensic Reports', path: '/reports', icon: FileText },
    { name: 'Case & Audit Logs', path: '/cases', icon: FolderGit2 },
  ];

  return (
    <aside className="w-64 bg-[#17171D] border-r border-[#343440] flex flex-col justify-between shrink-0">
      <div className="py-4">
        <div className="px-4 pb-3 mb-2 border-b border-[#343440]/60">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[#A1A1AA] font-mono">
            Forensic Workspace
          </p>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                    isActive
                      ? 'bg-[#A78BFA]/15 text-[#C4B5FD] border border-[#A78BFA]/30 font-semibold'
                      : 'text-[#A1A1AA] hover:text-[#F3F4F6] hover:bg-[#202028]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition group-hover:text-[#A78BFA]" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#202028] text-[#A1A1AA] border border-[#343440]">
                    {item.count}
                  </span>
                )}
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Integrity Notice */}
      <div className="p-4 border-t border-[#343440] bg-[#111116]/50">
        <div className="p-2.5 rounded-lg bg-[#202028] border border-[#343440] text-[11px] text-[#A1A1AA]">
          <p className="font-semibold text-[#F3F4F6] mb-0.5">Integrity Guaranteed</p>
          <p className="leading-tight text-[11px]">
            SHA-256 byte verification & deterministic correlation logic.
          </p>
        </div>
      </div>
    </aside>
  );
};
