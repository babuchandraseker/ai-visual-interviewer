import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
  return (
    <div className={`bg-slate-800/80 border border-slate-700/60 rounded-xl p-6 shadow-xl backdrop-blur-sm ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
