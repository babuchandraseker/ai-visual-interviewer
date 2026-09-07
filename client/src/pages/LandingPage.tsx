import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Bot, ShieldCheck, Sparkles, Video, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const navigate = useNavigate();

  const handleStartWithToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      navigate(`/interview/${encodeURIComponent(tokenInput.trim())}`);
    }
  };

  const handleStartDemo = () => {
    // Navigate to development seed sample token
    navigate('/interview/dev-sample-invite-token-12345');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-950/80 border border-brand-800/60 text-xs font-semibold text-brand-300 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Standardized Placement Interview Platform</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100 max-w-3xl leading-tight">
          Structured, Objective Technical Placement Interviews
        </h1>

        <p className="mt-4 text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
          An AI-powered visual interviewer designed to deliver consistent, non-biased, evidence-based technical assessments for placement drives.
        </p>

        {/* Action Card */}
        <Card className="mt-10 w-full max-w-lg text-left border-slate-800">
          <form onSubmit={handleStartWithToken} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Enter Interview Invitation Token
              </label>
              <input
                id="token"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. dev-sample-invite-token-12345"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <Button type="submit" size="lg" className="w-full justify-center" disabled={!tokenInput.trim()}>
              <span>Validate & Start Interview</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-2 text-slate-500 uppercase">Or test with seed token</span>
            </div>
          </div>

          <Button variant="outline" size="md" className="w-full justify-center" onClick={handleStartDemo}>
            <Bot className="w-4 h-4 mr-2 text-brand-400" />
            <span>Launch Sample Candidate Session</span>
          </Button>
        </Card>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full max-w-4xl">
          <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl space-y-2">
            <Bot className="w-6 h-6 text-brand-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Conversational Interviewer</h3>
            <p className="text-xs text-slate-400">Structured question delivery and adaptive probing without fatigue.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Evidence-Based Evaluation</h3>
            <p className="text-xs text-slate-400">Standardized rubric scoring linked directly to verbatim transcript quotes.</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl space-y-2">
            <Video className="w-6 h-6 text-amber-400" />
            <h3 className="font-semibold text-slate-200 text-sm">Objective Telemetry</h3>
            <p className="text-xs text-slate-400">Lightweight camera presence checks executed 100% locally in browser.</p>
          </div>
        </div>
      </main>
    </div>
  );
};
