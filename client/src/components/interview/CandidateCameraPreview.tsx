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
  const [isLiveTrack, setIsLiveTrack] = useState<boolean>(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(() => {});
    }

    const checkTrackState = () => {
      const tracks = stream ? stream.getVideoTracks() : [];
      const live = Boolean(
        tracks.length > 0 && tracks[0].readyState === 'live' && tracks[0].enabled
      );
      setIsLiveTrack(live);
    };

    checkTrackState();
    const interval = setInterval(checkTrackState, 1000);
    return () => clearInterval(interval);
  }, [stream]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative aspect-video max-w-md w-full shadow-lg">
      {stream && isLiveTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 space-y-2 p-4 text-center">
          <VideoOff className="w-10 h-10 text-rose-400/80" />
          <span className="text-xs font-medium text-slate-300">Camera Feed Inactive / Unavailable</span>
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
        <Camera className={`w-3.5 h-3.5 ${isLiveTrack ? 'text-emerald-400' : 'text-rose-400'}`} />
        <span>
          {candidateName} ({isLiveTrack ? 'Live Local Stream' : 'Camera Disconnected'})
        </span>
      </div>
    </div>
  );
};
