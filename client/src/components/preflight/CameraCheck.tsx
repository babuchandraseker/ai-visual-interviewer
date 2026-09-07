import React from 'react';
import { CameraStatus } from '../../types';
import { Camera, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface CameraCheckProps {
  status: CameraStatus;
  videoRef: React.RefObject<HTMLVideoElement>;
  errorMessage: string | null;
  onRetry: () => void;
}

export const CameraCheck: React.FC<CameraCheckProps> = ({
  status,
  videoRef,
  errorMessage,
  onRetry,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Camera className="w-5 h-5 text-brand-500" />
          <h3 className="font-semibold text-slate-200">Camera Check</h3>
        </div>
        {status === 'READY' && (
          <Badge variant="success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Camera Ready</span>
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

      {/* Video Preview Box */}
      <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            status === 'READY' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
          }`}
        />

        {status !== 'READY' && (
          <div className="text-center p-6 space-y-3 max-w-sm">
            {status === 'CHECKING' && (
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                <p className="text-sm text-slate-400">Requesting camera access...</p>
              </div>
            )}

            {(status === 'DENIED' || status === 'ERROR' || status === 'NOT_AVAILABLE') && (
              <div className="flex flex-col items-center space-y-2">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-sm font-medium text-rose-300">
                  {errorMessage || 'Camera access failed.'}
                </p>
                <p className="text-xs text-slate-400">
                  Ensure your webcam is connected and allowed in browser permissions.
                </p>
                <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Try Again</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
