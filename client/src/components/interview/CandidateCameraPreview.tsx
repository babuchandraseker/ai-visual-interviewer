import React, { useEffect, useRef, useState } from 'react';
import { Camera, User, AlertCircle, VideoOff } from 'lucide-react';

interface CandidateCameraPreviewProps {
  stream: MediaStream | null;
  candidateName?: string;
  warningMessage?: string | null;
}

export const CandidateCameraPreview: React.FC<CandidateCameraPreviewProps> = ({
  stream,
  candidateName = 'Candidate',
  warningMessage,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoRendering, setIsVideoRendering] = useState<boolean>(false);
  const [hasValidTrack, setHasValidTrack] = useState<boolean>(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.muted = true;
      videoEl.playsInline = true;

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: any) => {
          // Ignore AbortError caused by rapid media re-evaluations
          if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.warn('[CandidateCameraPreview] Camera play warning:', err.message);
          }
        });
      }
    } else {
      videoEl.srcObject = null;
      setIsVideoRendering(false);
    }

    const checkTrackState = () => {
      const tracks = stream ? (stream.getVideoTracks ? stream.getVideoTracks() : stream.getTracks()) : [];
      const validTrack = Boolean(
        tracks.length > 0 && tracks[0].readyState === 'live' && tracks[0].enabled
      );
      setHasValidTrack(validTrack);

      if (videoEl && validTrack) {
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && !videoEl.paused) {
          setIsVideoRendering(true);
        }
      } else {
        setIsVideoRendering(false);
      }
    };

    checkTrackState();
    const interval = setInterval(checkTrackState, 500);
    return () => clearInterval(interval);
  }, [stream]);

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      setIsVideoRendering(true);
    }
  };

  const isLive = hasValidTrack && (isVideoRendering || (stream !== null && stream.active));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative aspect-video max-w-md w-full shadow-lg">
      {/* Permanent Video Element in DOM to prevent destruction/re-creation during FSM transitions */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
          isLive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
        }`}
      />

      {/* Fallback Display when Camera Feed is Inactive */}
      {!isLive && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 space-y-2 p-4 text-center">
          <VideoOff className="w-10 h-10 text-rose-400/80 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">Camera Feed Inactive / Initializing</span>
          <span className="text-[11px] text-slate-500 max-w-xs">
            Verify browser camera permissions or reconnect webcam hardware.
          </span>
        </div>
      )}

      {/* Operational Warning Banner */}
      {warningMessage && (
        <div className="absolute top-3 left-3 right-3 bg-amber-500/90 backdrop-blur text-slate-950 font-medium text-xs px-3 py-1.5 rounded-md flex items-center space-x-2 shadow-md transition-all z-10">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Overlay Status Badge */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1 rounded-md flex items-center space-x-2 text-xs font-medium text-slate-200 z-10">
        <Camera className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-400' : 'text-rose-400'}`} />
        <span>
          {candidateName} ({isLive ? 'Live Local Stream' : 'Camera Disconnected'})
        </span>
      </div>
    </div>
  );
};
