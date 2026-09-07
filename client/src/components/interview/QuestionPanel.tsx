import React from 'react';
import { HelpCircle, Mic, Volume2, AlertCircle, RefreshCw, Square, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioEngineStatus, TranscriptMetadata } from '../../types';

interface QuestionPanelProps {
  questionNumber?: number;
  totalQuestions?: number;
  questionText?: string;
  audioStatus?: AudioEngineStatus;
  transcript?: TranscriptMetadata | null;
  volumeLevel?: number;
  errorMessage?: string | null;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onTestTTS?: () => void;
  onStopTTS?: () => void;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  questionNumber = 1,
  totalQuestions = 5,
  questionText = "Welcome to your AI Visual Interview session. Click 'Start Speaking' to test your microphone transcription or 'Test AI Speech' to test voice synthesis.",
  audioStatus = 'READY',
  transcript = null,
  volumeLevel = 0,
  errorMessage = null,
  onStartListening,
  onStopListening,
  onTestTTS,
  onStopTTS,
}) => {
  const isListening = audioStatus === 'LISTENING';
  const isSpeaking = audioStatus === 'SPEAKING';
  const isBusy = audioStatus === 'PROCESSING' || audioStatus === 'TRANSCRIBING' || audioStatus === 'INITIALIZING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between h-full space-y-6">
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-brand-400">
            <HelpCircle className="w-5 h-5" />
            <span className="font-semibold text-xs uppercase tracking-wider">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>

          {/* Audio Engine Status Badge */}
          <div className="flex items-center space-x-2">
            {audioStatus === 'LISTENING' && (
              <Badge variant="success" className="animate-pulse">
                <Mic className="w-3.5 h-3.5" />
                <span>Listening... ({volumeLevel}%)</span>
              </Badge>
            )}

            {audioStatus === 'SPEAKING' && (
              <Badge variant="info" className="animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>AI Speaking</span>
              </Badge>
            )}

            {isBusy && (
              <Badge variant="warning">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{audioStatus}...</span>
              </Badge>
            )}

            {audioStatus === 'TRANSCRIPT_READY' && (
              <Badge variant="success">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Transcript Generated</span>
              </Badge>
            )}

            {audioStatus === 'ERROR' && (
              <Badge variant="error">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Audio Engine Error</span>
              </Badge>
            )}

            {(audioStatus === 'READY' || audioStatus === 'IDLE') && (
              <Badge variant="neutral">
                <span>Audio Pipeline Ready</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Question Text Box */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-5">
          <p className="text-slate-100 font-medium leading-relaxed text-base">
            {questionText}
          </p>
        </div>

        {/* Live Audio Volume Meter during Listening */}
        {isListening && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Mic className="w-3.5 h-3.5" /> Voice Capture Active
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

        {/* Live Transcript Container */}
        {transcript && (
          <div className="bg-slate-950 border border-brand-900/60 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-xs text-brand-400 font-semibold uppercase tracking-wider">
              <span>Candidate Speech Transcript</span>
              <span className="text-slate-500 font-normal">Provider: {transcript.provider}</span>
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

      {/* Audio Engine Interactive Controls */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {!isListening ? (
              <Button
                size="md"
                variant="primary"
                onClick={onStartListening}
                disabled={isBusy || isSpeaking}
              >
                <Mic className="w-4 h-4 mr-2" />
                <span>Start Speaking</span>
              </Button>
            ) : (
              <Button size="md" variant="danger" onClick={onStopListening}>
                <Square className="w-4 h-4 mr-2" />
                <span>Stop & Transcribe</span>
              </Button>
            )}

            {!isSpeaking ? (
              <Button
                size="md"
                variant="outline"
                onClick={onTestTTS}
                disabled={isBusy || isListening}
              >
                <Volume2 className="w-4 h-4 mr-2 text-brand-400" />
                <span>Test AI Speech Output</span>
              </Button>
            ) : (
              <Button size="md" variant="danger" onClick={onStopTTS}>
                <Square className="w-4 h-4 mr-2" />
                <span>Stop AI Speech</span>
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-md p-2.5 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <span>
            Phase 3 Audio Engine integration: Candidate speech is captured & transcribed via STT; AI voice playback is synthesized via TTS.
          </span>
        </div>
      </div>
    </div>
  );
};
