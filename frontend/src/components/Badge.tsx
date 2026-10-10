import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'gray';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const variantStyles = {
    default: 'bg-[#202028] text-[#F3F4F6] border-[#343440]',
    violet: 'bg-[#A78BFA]/15 text-[#C4B5FD] border-[#A78BFA]/30',
    cyan: 'bg-[#67E8F9]/15 text-[#67E8F9] border-[#67E8F9]/30',
    emerald: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
    amber: 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30',
    rose: 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30',
    gray: 'bg-[#17171D] text-[#A1A1AA] border-[#343440]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium font-mono rounded-md border ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {label}
    </span>
  );
};
