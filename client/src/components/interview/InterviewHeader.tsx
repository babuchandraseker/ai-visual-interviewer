import React from 'react';
import { Clock, Shield } from 'lucide-react';

interface InterviewHeaderProps {
  title?: string;
  durationMinutes?: number;
  candidateName?: string;
  remainingSeconds?: number;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  title = 'Technical Placement Interview',
  candidateName = 'Alex Chen',
  remainingSeconds = 1800,
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm">
          AI
        </div>
        <div>
          <h2 className="font-bold text-slate-100 text-sm leading-tight">{title}</h2>
          <p className="text-xs text-slate-400">Candidate: {candidateName}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-200">
          <Clock className="w-3.5 h-3.5 text-brand-400" />
          <span>Remaining: {formattedTime}</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          <span>FSM Orchestrated</span>
        </div>
      </div>
    </header>
  );
};
