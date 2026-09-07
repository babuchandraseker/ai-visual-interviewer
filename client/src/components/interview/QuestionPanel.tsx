import React from 'react';
import { HelpCircle, Mic, Volume2, AlertCircle, RefreshCw, Square, MessageSquare, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InterviewState, InterviewQuestion } from '../../fsm/types';
import { AudioEngineStatus, TranscriptMetadata } from '../../types';

interface QuestionPanelProps {
  fsmState: InterviewState;
  currentQuestion: InterviewQuestion | null;
  questionNumber?: number;
  totalQuestions?: number;
  audioStatus?: AudioEngineStatus;
  transcript?: TranscriptMetadata | null;
  volumeLevel?: number;
  errorMessage?: string | null;
  onStartInterview?: () => void;
  onFinishInterview?: () => void;
  onStopListening?: () => void;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  fsmState,
  currentQuestion,
  questionNumber = 1,
  totalQuestions = 5,
  audioStatus = 'READY',
  transcript = null,
  volumeLevel = 0,
  errorMessage = null,
  onStartInterview,
  onFinishInterview,
  onStopListening,
}) => {
  const isListening = fsmState === 'LISTENING';
  const isAsking = fsmState === 'ASKING';
  const isEvaluating = fsmState === 'EVALUATING' || fsmState === 'ADAPTING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between h-full space-y-6">
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-brand-400">
            <HelpCircle className="w-5 h-5" />
            <span className="font-semibold text-xs uppercase tracking-wider">
              {currentQuestion ? `Question ${questionNumber} of ${totalQuestions}` : 'Interview Session'}
            </span>
          </div>

          {/* FSM State Badge */}
          <div className="flex items-center space-x-2">
            {fsmState === 'IDLE' && <Badge variant="neutral">FSM: IDLE</Badge>}
            {fsmState === 'INTRO' && <Badge variant="info" className="animate-pulse">FSM: INTRO</Badge>}
            {fsmState === 'QUESTION_SELECT' && <Badge variant="info">FSM: SELECTING</Badge>}
            {fsmState === 'ASKING' && <Badge variant="info" className="animate-pulse">FSM: ASKING</Badge>}
            {fsmState === 'LISTENING' && (
              <Badge variant="success" className="animate-pulse">
                <Mic className="w-3.5 h-3.5" /> FSM: LISTENING ({volumeLevel}%)
              </Badge>
            )}
            {isEvaluating && (
              <Badge variant="warning">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> FSM: {fsmState}
              </Badge>
            )}
            {fsmState === 'WRAPUP' && <Badge variant="warning">FSM: WRAPUP</Badge>}
            {fsmState === 'COMPLETED' && (
              <Badge variant="success">
                <CheckCircle2 className="w-3.5 h-3.5" /> FSM: COMPLETED
              </Badge>
            )}
          </div>
        </div>

        {/* Question Text & Skill Tag */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-5 space-y-3">
          {currentQuestion && (
            <div className="flex items-center space-x-2">
              <span className="bg-brand-950 border border-brand-800 text-brand-300 px-2.5 py-0.5 rounded text-xs font-semibold">
                {currentQuestion.skill}
              </span>
              <span className="text-slate-500 text-xs font-mono">
                ID: {currentQuestion.id} • Difficulty: L{currentQuestion.difficulty}
              </span>
            </div>
          )}

          <p className="text-slate-100 font-medium leading-relaxed text-base">
            {currentQuestion
              ? currentQuestion.text
              : fsmState === 'IDLE'
              ? "Click 'Start Interview' to initiate the deterministic FSM state machine."
              : fsmState === 'INTRO'
              ? "The AI Interviewer is introducing the session requirements."
              : fsmState === 'COMPLETED'
              ? "Interview session has finished. Thank you for participating!"
              : "Orchestrating interview state..."}
          </p>
        </div>

        {/* Live Audio Volume Meter during Listening */}
        {isListening && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Mic className="w-3.5 h-3.5" /> Candidate Answer Recording Active
              </span>
              <span className="font-mono text-slate-300">{volumeLevel}%</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${Math.max(2, volumeLevel)}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcript Container */}
        {transcript && (
          <div className="bg-slate-950 border border-brand-900/60 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs text-brand-400 font-semibold uppercase tracking-wider">
              <span>Recorded Answer Transcript</span>
              <span className="text-slate-500 font-normal">STT Provider: {transcript.provider}</span>
            </div>
            <p className="text-slate-200 text-sm italic font-sans leading-relaxed">
              "{transcript.transcript}"
            </p>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* FSM Actions Footer */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {fsmState === 'IDLE' && (
              <Button size="md" variant="primary" onClick={onStartInterview}>
                <Play className="w-4 h-4 mr-2" />
                <span>Start Deterministic Interview</span>
              </Button>
            )}

            {isListening && (
              <Button size="md" variant="danger" onClick={onStopListening}>
                <Square className="w-4 h-4 mr-2" />
                <span>Submit Answer Early</span>
              </Button>
            )}

            {fsmState !== 'IDLE' && fsmState !== 'COMPLETED' && (
              <Button size="md" variant="outline" onClick={onFinishInterview}>
                <span>End Interview Early</span>
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-md p-2.5 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <span>
            Phase 4 Deterministic FSM: Interview lifecycle state transitions, timer countdown, and question orchestration are 100% deterministic (0 LLM intelligence).
          </span>
        </div>
      </div>
    </div>
  );
};
