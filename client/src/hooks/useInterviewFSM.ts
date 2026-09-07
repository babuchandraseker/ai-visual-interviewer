import { useState, useEffect, useRef, useCallback } from 'react';
import {
  InterviewState,
  InterviewContext,
  InterviewEvent,
  InterviewConfig,
} from '../fsm/types';
import { transition, initialContext } from '../fsm/interviewFSM';
import { DeterministicQuestionOrchestrator } from '../orchestrator/questionOrchestrator';
import { InterviewTimer } from '../services/interviewTimer';
import { useAudioEngine } from './useAudioEngine';
import { evaluateSessionTranscript } from '../services/api';

export interface UseInterviewFSMReturn {
  state: InterviewState;
  context: InterviewContext;
  audioEngine: ReturnType<typeof useAudioEngine>;
  startInterview: (config?: Partial<InterviewConfig>) => void;
  finishInterview: () => void;
  resetInterview: () => void;
}

export const useInterviewFSM = (
  sessionId: string = 'sess_default',
  candidateName: string = 'Alex Chen'
): UseInterviewFSMReturn => {
  const [state, setState] = useState<InterviewState>('IDLE');
  const [context, setContext] = useState<InterviewContext>({
    ...initialContext,
    sessionId,
    candidateName,
  });

  const audioEngine = useAudioEngine();
  const orchestratorRef = useRef(new DeterministicQuestionOrchestrator());
  const timerRef = useRef<InterviewTimer | null>(null);

  // Dispatch FSM event helper
  const dispatch = useCallback((event: InterviewEvent) => {
    setState((prevState) => {
      setContext((prevContext) => {
        const result = transition(prevState, event, prevContext);
        
        // Execute side-effect action if present
        if (result.action) {
          handleAction(result.action, result.nextContext);
        }

        return result.nextContext;
      });

      const nextResult = transition(prevState, event, context);
      return nextResult.nextState;
    });
  }, [context]);

  // Handle FSM actions deterministically
  const handleAction = (action: any, currentCtx: InterviewContext) => {
    switch (action.type) {
      case 'PLAY_INTRO': {
        audioEngine.speakText(action.text);
        break;
      }
      case 'SELECT_NEXT_QUESTION': {
        const nextQ = orchestratorRef.current.getNextQuestion(currentCtx);
        if (nextQ) {
          dispatch({ type: 'QUESTION_SELECTED', question: nextQ });
        } else {
          dispatch({ type: 'ADAPTATION_COMPLETE' });
        }
        break;
      }
      case 'PLAY_QUESTION': {
        audioEngine.speakText(action.question.text);
        break;
      }
      case 'START_RECORDING_ANSWER': {
        audioEngine.startListening();
        break;
      }
      case 'PROCESS_EVALUATION_PLACEHOLDER': {
        const rawTranscript = audioEngine.transcript?.transcript || '';
        const durationSec = Math.round((audioEngine.transcript?.durationMs || 0) / 1000);
        evaluateSessionTranscript(currentCtx.sessionId, {
          skillTag: currentCtx.currentQuestion?.skill || 'General',
          difficultyLevel: currentCtx.currentQuestion?.difficulty || 2,
          questionText: currentCtx.currentQuestion?.text || '',
          rawTranscript,
          durationSeconds: durationSec,
        }).then((res) => {
          dispatch({
            type: 'EVALUATION_READY',
            result: { questionId: action.questionId, completed: true, evaluation: res.evaluation, adaptation: res.adaptation },
          });
        }).catch(() => {
          // Fallback on network error to allow FSM progression
          dispatch({
            type: 'EVALUATION_READY',
            result: { questionId: action.questionId, completed: true },
          });
        });
        break;
      }
      case 'EXECUTE_ADAPTATION': {
        setTimeout(() => {
          dispatch({ type: 'ADAPTATION_COMPLETE' });
        }, 200);
        break;
      }
      case 'PLAY_WRAPUP': {
        audioEngine.speakText(action.text);
        break;
      }
      case 'CLEANUP_AND_FINALIZE': {
        if (timerRef.current) {
          timerRef.current.stop();
        }
        audioEngine.stopListening();
        audioEngine.stopSpeaking();
        break;
      }
    }
  };

  // Monitor Audio Engine State Transitions to drive FSM
  useEffect(() => {
    if (state === 'INTRO' && audioEngine.status === 'READY' && context.startedAt) {
      // Intro TTS finished -> advance to QUESTION_SELECT
      dispatch({ type: 'INTRO_DELIVERED' });
    }

    if (state === 'ASKING' && audioEngine.status === 'READY' && context.currentQuestion) {
      // Question TTS finished -> advance to LISTENING
      dispatch({ type: 'QUESTION_DELIVERED' });
    }

    if (state === 'LISTENING' && audioEngine.status === 'TRANSCRIPT_READY' && audioEngine.transcript) {
      // Candidate answer captured -> advance to EVALUATING
      dispatch({
        type: 'ANSWER_CAPTURED',
        transcript: audioEngine.transcript.transcript,
        durationMs: audioEngine.transcript.durationMs,
      });
    }

    if (state === 'WRAPUP' && audioEngine.status === 'READY') {
      // Wrapup TTS finished -> advance to COMPLETED
      dispatch({ type: 'INTRO_DELIVERED' });
    }
  }, [state, audioEngine.status, audioEngine.transcript, context, dispatch]);

  // Start Interview Command
  const startInterview = useCallback((customConfig?: Partial<InterviewConfig>) => {
    const mergedConfig: InterviewConfig = {
      ...initialContext.config,
      ...customConfig,
    };

    // Initialize Timer
    if (!timerRef.current) {
      timerRef.current = new InterviewTimer({
        durationSeconds: mergedConfig.durationSeconds,
        onTick: (elapsed, remaining) => {
          setContext((prev) => ({
            ...prev,
            elapsedSeconds: elapsed,
            remainingSeconds: remaining,
          }));
        },
        onExpire: () => {
          dispatch({ type: 'INTERVIEW_TIME_EXPIRED' });
        },
      });
    }

    timerRef.current.start(mergedConfig.durationSeconds);
    dispatch({ type: 'START_INTERVIEW' });
    dispatch({ type: 'SETUP_COMPLETE', config: mergedConfig });
  }, [dispatch]);

  // Finish Interview Command
  const finishInterview = useCallback(() => {
    dispatch({ type: 'FINISH_INTERVIEW' });
  }, [dispatch]);

  // Reset Interview Command
  const resetInterview = useCallback(() => {
    if (timerRef.current) {
      timerRef.current.stop();
    }
    audioEngine.stopListening();
    audioEngine.stopSpeaking();
    setState('IDLE');
    setContext({
      ...initialContext,
      sessionId,
      candidateName,
    });
  }, [sessionId, candidateName, audioEngine]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        timerRef.current.stop();
      }
    };
  }, []);

  return {
    state,
    context,
    audioEngine,
    startInterview,
    finishInterview,
    resetInterview,
  };
};
