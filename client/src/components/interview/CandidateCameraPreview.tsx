import React, { useEffect, useRef } from 'react';
import { Camera, User } from 'lucide-react';

interface CandidateCameraPreviewProps {
  stream: MediaStream | null;
  candidateName?: string;
}

export const CandidateCameraPreview: React.FC<CandidateCameraPreviewProps> = ({
  stream,
  candidateName = 'Candidate',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative aspect-video max-w-md w-full shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 space-y-2">
          <User className="w-12 h-12 text-slate-600" />
          <span className="text-xs">Camera Feed Inactive</span>
        </div>
      )}

      {/* Overlay Badge */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1 rounded-md flex items-center space-x-2 text-xs font-medium text-slate-200">
        <Camera className="w-3.5 h-3.5 text-brand-400" />
        <span>{candidateName} (Live Local Stream)</span>
      </div>
    </div>
  );
};
