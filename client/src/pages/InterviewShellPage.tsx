import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';
import { useInterviewFSM } from '../hooks/useInterviewFSM';
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
  
  // Retrieve validated session metadata
  const sessionMetaRaw = token ? sessionStorage.getItem(`session_meta_${token}`) : null;
  const sessionMeta = sessionMetaRaw ? JSON.parse(sessionMetaRaw) : null;

  const candidateName = sessionMeta?.candidateName || 'Alex Chen';
  const templateTitle = sessionMeta?.template?.title || 'Technical Placement Interview';

  const fsm = useInterviewFSM('sess_default', candidateName);
  const [isPreflightVerified, setIsPreflightVerified] = useState<boolean>(false);

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
    fsm.resetInterview();
    navigate('/');
  };

  if (!isPreflightVerified) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header Bar with Countdown Timer */}
      <InterviewHeader
        title={templateTitle}
        remainingSeconds={fsm.context.remainingSeconds}
        candidateName={candidateName}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Avatar & Candidate Preview */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <InterviewerAvatar
            isSpeaking={fsm.state === 'INTRO' || fsm.state === 'ASKING' || fsm.state === 'WRAPUP'}
          />

          <div className="flex-1 flex flex-col items-center">
            <CandidateCameraPreview stream={camera.stream} candidateName={candidateName} />
          </div>
        </div>

        {/* Right Column: Deterministic Question Panel Controlled by FSM */}
        <div className="lg:col-span-8 flex flex-col">
          <QuestionPanel
            fsmState={fsm.state}
            currentQuestion={fsm.context.currentQuestion}
            questionNumber={fsm.context.currentQuestionIndex}
            totalQuestions={fsm.context.config.maxQuestions}
            audioStatus={fsm.audioEngine.status}
            transcript={fsm.audioEngine.transcript}
            volumeLevel={fsm.audioEngine.volumeLevel}
            errorMessage={fsm.audioEngine.errorMessage || fsm.context.lastError}
            onStartInterview={() => fsm.startInterview()}
            onFinishInterview={fsm.finishInterview}
            onStopListening={fsm.audioEngine.stopListening}
          />
        </div>
      </main>

      {/* Bottom Footer Status Bar */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-brand-400" />
          <span>
            Phase 4 Deterministic FSM Active • Current State: [{fsm.state}]
          </span>
        </div>

        <Button size="sm" variant="outline" onClick={handleExitSession}>
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          <span>Exit Session</span>
        </Button>
      </footer>
    </div>
  );
};
