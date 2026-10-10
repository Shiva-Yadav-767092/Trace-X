import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
}

export const Toast: React.FC<ToastProps> = ({ notification }) => {
  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl bg-[#202028] border-[#343440] text-[#F3F4F6] animate-in fade-in slide-in-from-bottom-3 duration-200">
      {isSuccess && <CheckCircle className="w-5 h-5 text-[#34D399]" />}
      {isError && <AlertCircle className="w-5 h-5 text-[#F87171]" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-[#67E8F9]" />}
      <span className="text-sm font-medium">{notification.message}</span>
    </div>
  );
};
