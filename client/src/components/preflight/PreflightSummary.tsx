import React from 'react';
import { CameraStatus, MicrophoneStatus } from '../../types';
import { CheckCircle2, XCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface PreflightSummaryProps {
  cameraStatus: CameraStatus;
  micStatus: MicrophoneStatus;
  browserSupported: boolean;
  onEnterInterview: () => void;
}

export const PreflightSummary: React.FC<PreflightSummaryProps> = ({
  cameraStatus,
  micStatus,
  browserSupported,
  onEnterInterview,
}) => {
  const isCameraReady = cameraStatus === 'READY';
  const isMicReady = micStatus === 'READY';
  const allPassed = isCameraReady && isMicReady && browserSupported;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
        <ShieldCheck className="w-6 h-6 text-brand-500" />
        <div>
          <h2 className="font-bold text-slate-100 text-lg">Diagnostic Summary</h2>
          <p className="text-xs text-slate-400">All requirements must pass before starting</p>
        </div>
      </div>

      {/* Verification Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-sm">
          <span className="text-slate-300 font-medium">Camera Feed</span>
          {isCameraReady ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Ready
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Action Required
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-sm">
          <span className="text-slate-300 font-medium">Microphone Signal</span>
          {isMicReady ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Ready
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Action Required
            </span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-sm">
          <span className="text-slate-300 font-medium">Browser Capabilities</span>
          {browserSupported ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Supported
            </span>
          ) : (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Unsupported Browser
            </span>
          )}
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <Button
          size="lg"
          className="w-full justify-center"
          disabled={!allPassed}
          onClick={onEnterInterview}
        >
          <span>Enter Interview</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        {!allPassed && (
          <p className="text-xs text-amber-400/90 text-center mt-3">
            Please resolve hardware checks above to enable interview entry.
          </p>
        )}
      </div>
    </div>
  );
};
