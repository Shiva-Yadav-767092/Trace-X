import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#343440] rounded-xl bg-[#17171D]/50 my-6">
      <div className="p-3 mb-4 rounded-full bg-[#202028] border border-[#343440] text-[#A78BFA]">
        {icon || <ShieldAlert className="w-8 h-8" />}
      </div>
      <h3 className="text-lg font-semibold text-[#F3F4F6] mb-1">{title}</h3>
      <p className="text-sm text-[#A1A1AA] max-w-md mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[#A78BFA] text-[#111116] hover:bg-[#C4B5FD] transition shadow-md"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
