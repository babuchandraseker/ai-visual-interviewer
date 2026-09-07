import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useMicrophone } from '../hooks/useMicrophone';
import { Header } from '../components/ui/Header';
import { CameraCheck } from '../components/preflight/CameraCheck';
import { MicrophoneCheck } from '../components/preflight/MicrophoneCheck';
import { PreflightSummary } from '../components/preflight/PreflightSummary';
import { AlertCircle } from 'lucide-react';

export const PreflightPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const camera = useCamera();
  const microphone = useMicrophone();

  // Check browser API compatibility
  const browserSupported = useMemo(() => {
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (window.AudioContext || (window as any).webkitAudioContext)
    );
  }, []);

  // Trigger initial checks on page mount
  useEffect(() => {
    if (browserSupported) {
      camera.startCamera();
      microphone.startMicrophone();
    }
  }, [browserSupported]);

  const handleEnterInterview = () => {
    if (camera.status === 'READY' && microphone.status === 'READY' && browserSupported && token) {
      // Store preflight completion flag in sessionStorage for protected route access
      sessionStorage.setItem(`preflight_passed_${token}`, 'true');
      navigate(`/interview/${token}/session`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Hardware & Media Check</h1>
          <p className="text-xs text-slate-400 mt-1">Verify your camera and microphone functionality before starting.</p>
        </div>

        {!browserSupported && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <div>
              <h4 className="font-bold text-rose-100">Browser Unsupported</h4>
              <p className="text-xs text-rose-300 mt-0.5">
                Your browser does not support the required camera and microphone features. Please use a modern browser such as Chrome, Firefox, Edge, or Safari.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center Column: Live Hardware Feeds */}
          <div className="lg:col-span-2 space-y-6">
            <CameraCheck
              status={camera.status}
              videoRef={camera.videoRef}
              errorMessage={camera.errorMessage}
              onRetry={camera.startCamera}
            />

            <MicrophoneCheck
              status={microphone.status}
              volumeLevel={microphone.volumeLevel}
              errorMessage={microphone.errorMessage}
              onRetry={microphone.startMicrophone}
            />
          </div>

          {/* Right Column: Diagnostic Summary */}
          <div>
            <PreflightSummary
              cameraStatus={camera.status}
              micStatus={microphone.status}
              browserSupported={browserSupported}
              onEnterInterview={handleEnterInterview}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
