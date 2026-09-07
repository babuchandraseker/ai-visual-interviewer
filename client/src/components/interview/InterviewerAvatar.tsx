import React from 'react';
import { Bot, Volume2 } from 'lucide-react';

interface InterviewerAvatarProps {
  isSpeaking?: boolean;
}

export const InterviewerAvatar: React.FC<InterviewerAvatarProps> = ({ isSpeaking = false }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-4 text-center h-full min-h-[260px]">
      <div className="relative">
        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 border-2 border-brand-400/50 flex items-center justify-center text-white shadow-2xl ${
          isSpeaking ? 'animate-pulse ring-4 ring-brand-500/40' : ''
        }`}>
          <Bot className="w-12 h-12" />
        </div>
        {isSpeaking && (
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 rounded-full p-1.5 shadow-lg animate-bounce">
            <Volume2 className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-slate-100 text-base">AI Technical Interviewer</h3>
        <p className="text-xs text-slate-400 mt-0.5">Automated Interview Host</p>
      </div>

      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs text-slate-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Interviewer Ready</span>
      </div>
    </div>
  );
};
