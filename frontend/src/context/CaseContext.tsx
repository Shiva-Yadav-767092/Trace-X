import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Case } from '../types';
import { api } from '../api/client';

interface CaseContextType {
  activeCase: Case | null;
  setActiveCase: (c: Case | null) => void;
  cases: Case[];
  refreshCases: () => Promise<void>;
  isLoadingCases: boolean;
  seedDemo: () => Promise<void>;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const refreshCases = async () => {
    try {
      setIsLoadingCases(true);
      const data = await api.getCases();
      setCases(data);
      if (data.length > 0) {
        // Keep active case if still exists, otherwise choose first
        setActiveCase((prev) => {
          if (!prev) return data[0];
          const found = data.find((c) => c.id === prev.id);
          return found || data[0];
        });
      } else {
        setActiveCase(null);
      }
    } catch (err: any) {
      notify(`Failed to fetch cases: ${err.message}`, 'error');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const seedDemo = async () => {
    try {
      notify('Loading Hackathon Synthetic Investigation Scenario...', 'info');
      const res = await api.seedDemoCase();
      await refreshCases();
      if (res.case_id) {
        const fullCase = await api.getCase(res.case_id);
        setActiveCase(fullCase);
      }
      notify('Demo dataset loaded! 6 artifacts ingested, parsed, and correlated.', 'success');
    } catch (err: any) {
      notify(`Demo seed failed: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    refreshCases();
  }, []);

  return (
    <CaseContext.Provider
      value={{
        activeCase,
        setActiveCase,
        cases,
        refreshCases,
        isLoadingCases,
        seedDemo,
        notification,
        notify,
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export const useCase = () => {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
};
