import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CaseProvider, useCase } from './context/CaseContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';

import { OverviewPage } from './pages/OverviewPage';
import { EvidencePage } from './pages/EvidencePage';
import { TimelinePage } from './pages/TimelinePage';
import { GraphPage } from './pages/GraphPage';
import { FindingsPage } from './pages/FindingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CasesPage } from './pages/CasesPage';

const AppLayout: React.FC = () => {
  const { notification } = useCase();

  return (
    <div className="min-h-screen bg-[#111116] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#A78BFA]/30 selection:text-white">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/findings" element={<FindingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toast notification={notification} />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <CaseProvider>
        <AppLayout />
      </CaseProvider>
    </BrowserRouter>
  );
}
