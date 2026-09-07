import React from 'react';
import { MicrophoneStatus } from '../../types';
import { Mic, CheckCircle2, XCircle, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface MicrophoneCheckProps {
  status: MicrophoneStatus;
  volumeLevel: number;
  errorMessage: string | null;
  onRetry: () => void;
}

export const MicrophoneCheck: React.FC<MicrophoneCheckProps> = ({
  status,
  volumeLevel,
  errorMessage,
  onRetry,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Mic className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-slate-200">Microphone Check</h3>
        </div>
        {status === 'READY' && (
          <Badge variant="success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audio Signal Detected</span>
          </Badge>
        )}
        {status === 'NO_SIGNAL' && (
          <Badge variant="warning">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Speak to Test Signal</span>
          </Badge>
        )}
        {status === 'CHECKING' && (
          <Badge variant="info">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Initializing...</span>
          </Badge>
        )}
        {(status === 'DENIED' || status === 'ERROR' || status === 'NOT_AVAILABLE') && (
          <Badge variant="error">
            <XCircle className="w-3.5 h-3.5" />
            <span>Check Failed</span>
          </Badge>
        )}
      </div>

      <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 space-y-3">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Audio Output Level</span>
          <span className="font-mono font-medium text-slate-300">{volumeLevel}%</span>
        </div>

        {/* Real-time Visual Volume Meter */}
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex items-center px-0.5">
          <div
            className={`h-2 rounded-full transition-all duration-75 ${
              volumeLevel > 70
                ? 'bg-amber-500'
                : volumeLevel > 20
                ? 'bg-emerald-500'
                : 'bg-brand-500'
            }`}
            style={{ width: `${Math.max(2, volumeLevel)}%` }}
          />
        </div>

        {/* Status Instructions */}
        {status === 'NO_SIGNAL' && (
          <p className="text-xs text-amber-400/90 flex items-center space-x-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Speak into your microphone to verify audio input detection.</span>
          </p>
        )}

        {status === 'READY' && (
          <p className="text-xs text-emerald-400/90 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Microphone is receiving audio properly.</span>
          </p>
        )}

        {(status === 'DENIED' || status === 'ERROR' || status === 'NOT_AVAILABLE') && (
          <div className="pt-2 flex flex-col items-start space-y-2">
            <p className="text-xs text-rose-400 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMessage || 'Microphone access failed.'}</span>
            </p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Try Again</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
