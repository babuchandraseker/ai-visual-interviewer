import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle2, Shield, Eye, Wifi, ArrowRight } from 'lucide-react';

export const InstructionsPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Retrieve validated session metadata from session storage if present
  const sessionMetaRaw = token ? sessionStorage.getItem(`session_meta_${token}`) : null;
  const sessionMeta = sessionMetaRaw ? JSON.parse(sessionMetaRaw) : null;

  const candidateName = sessionMeta?.candidateName || 'Candidate';
  const templateTitle = sessionMeta?.template?.title || 'Technical Placement Interview';
  const duration = sessionMeta?.template?.durationMinutes || 30;

  const handleContinue = () => {
    navigate(`/interview/${token}/preflight`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Welcome Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider">Interview Preparation</span>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">Welcome, {candidateName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{templateTitle} • Duration: ~{duration} Minutes</p>
          </div>

          <div className="inline-flex items-center space-x-2 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Secure Candidate Session</span>
          </div>
        </div>

        <Card title="Before You Begin" subtitle="Please review the requirements for a smooth interview experience.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Quiet Environment</h4>
                <p className="text-xs text-slate-400 mt-1">Select a well-lit space free from ambient noise and background interruptions.</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex items-start space-x-3">
              <Wifi className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Stable Connection</h4>
                <p className="text-xs text-slate-400 mt-1">Ensure a reliable internet connection. Avoid refreshing the page during Q&A.</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Hardware Verification</h4>
                <p className="text-xs text-slate-400 mt-1">You must grant camera and microphone access during the upcoming pre-flight check.</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg flex items-start space-x-3">
              <Eye className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Camera Position</h4>
                <p className="text-xs text-slate-400 mt-1">Keep your face clearly visible within the camera preview frame throughout the interview.</p>
              </div>
            </div>
          </div>

          {/* Environmental Telemetry Disclosure */}
          <div className="mt-6 bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              Objective Environmental Telemetry Notice
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              During the interview session, the system performs basic technical and environmental checks (such as camera availability and face presence detection).
            </p>
            <p className="text-xs text-slate-500 italic">
              Note: The system does NOT grade facial expressions, emotion, confidence, eye contact, or stress metrics. Evaluations are based strictly on the semantic correctness of your technical answers.
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <Button size="lg" onClick={handleContinue}>
              <span>Continue to Device Check</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};
