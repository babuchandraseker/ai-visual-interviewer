import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { InterviewHeader } from '../components/interview/InterviewHeader';
import { InterviewerAvatar } from '../components/interview/InterviewerAvatar';
import { QuestionPanel } from '../components/interview/QuestionPanel';
import { CandidateCameraPreview } from '../components/interview/CandidateCameraPreview';
import { AlertCircle, LogOut } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const InterviewShellPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const camera = useCamera();
  const audioEngine = useAudioEngine();
  const [isPreflightVerified, setIsPreflightVerified] = useState<boolean>(false);

  // Retrieve validated session metadata
  const sessionMetaRaw = token ? sessionStorage.getItem(`session_meta_${token}`) : null;
  const sessionMeta = sessionMetaRaw ? JSON.parse(sessionMetaRaw) : null;

  const candidateName = sessionMeta?.candidateName || 'Alex Chen';
  const templateTitle = sessionMeta?.template?.title || 'Technical Placement Interview';
  const durationMinutes = sessionMeta?.template?.durationMinutes || 30;

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }

    const preflightPassed = sessionStorage.getItem(`preflight_passed_${token}`) === 'true';
    if (!preflightPassed) {
      // Redirect candidate back to preflight check if not completed
      navigate(`/interview/${token}/preflight`, { replace: true });
      return;
    }

    setIsPreflightVerified(true);
    camera.startCamera();
  }, [token, navigate]);

  const handleExitSession = () => {
    camera.stopCamera();
    audioEngine.stopListening();
    audioEngine.stopSpeaking();
    navigate('/');
  };

  const handleTestTTS = () => {
    audioEngine.speakText("Hello " + candidateName + ". I am your AI interviewer. Your speech-to-text and text-to-speech audio pipeline is working successfully.");
  };

  if (!isPreflightVerified) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header Bar */}
      <InterviewHeader
        title={templateTitle}
        durationMinutes={durationMinutes}
        candidateName={candidateName}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Avatar & Candidate Preview */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <InterviewerAvatar isSpeaking={audioEngine.status === 'SPEAKING'} />

          <div className="flex-1 flex flex-col items-center">
            <CandidateCameraPreview stream={camera.stream} candidateName={candidateName} />
          </div>
        </div>

        {/* Right Column: Interactive Question Panel Shell with Audio Engine */}
        <div className="lg:col-span-8 flex flex-col">
          <QuestionPanel
            questionNumber={1}
            totalQuestions={5}
            questionText="Welcome to the AI Visual Interviewer workspace. Use the controls below to test microphone audio capture (STT) and AI voice playback (TTS)."
            audioStatus={audioEngine.status}
            transcript={audioEngine.transcript}
            volumeLevel={audioEngine.volumeLevel}
            errorMessage={audioEngine.errorMessage}
            onStartListening={audioEngine.startListening}
            onStopListening={audioEngine.stopListening}
            onTestTTS={handleTestTTS}
            onStopTTS={audioEngine.stopSpeaking}
          />
        </div>
      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-brand-400" />
          <span>Phase 3 Audio Engine Active • STT / TTS Pipeline Verified.</span>
        </div>

        <Button size="sm" variant="outline" onClick={handleExitSession}>
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          <span>Exit Session</span>
        </Button>
      </footer>
    </div>
  );
};
