import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    error: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
    info: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
