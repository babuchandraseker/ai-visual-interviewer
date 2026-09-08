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
  const [fsm, setFsm] = useState<{ state: InterviewState; context: InterviewContext }>({
    state: 'IDLE',
    context: {
      ...initialContext,
      sessionId,
      candidateName,
    },
  });

  const fsmRef = useRef(fsm);
  fsmRef.current = fsm;

  const audioEngine = useAudioEngine();
  const orchestratorRef = useRef(new DeterministicQuestionOrchestrator());
  const timerRef = useRef<InterviewTimer | null>(null);
  const isEvaluatingRef = useRef(false);
  const isSelectingQuestionRef = useRef(false);

  // Dispatch FSM event helper with synchronous ref update and single action execution
  const dispatch = useCallback((event: InterviewEvent) => {
    const prev = fsmRef.current;
    const now = new Date().toISOString().substring(11, 23);
    console.log(`[FSM Dispatch ${now}] event: ${event.type} | current state: ${prev.state}`);

    const result = transition(prev.state, event, prev.context);

    // Update synchronously in ref so any immediate downstream calls see updated state
    fsmRef.current = {
      state: result.nextState,
      context: result.nextContext,
    };

    // Update React state for UI rendering
    setFsm(fsmRef.current);

    // Execute side-effect action ONCE deterministically
    if (result.action) {
      handleAction(result.action, result.nextContext);
    }
  }, []);

  // Handle FSM actions deterministically
  const handleAction = (action: any, currentCtx: InterviewContext) => {
    switch (action.type) {
      case 'PLAY_INTRO': {
        audioEngine.speakText(action.text, () => {
          if (fsmRef.current.state === 'INTRO') {
            dispatch({ type: 'INTRO_DELIVERED' });
          }
        });
        break;
      }
      case 'SELECT_NEXT_QUESTION': {
        if (fsmRef.current.state !== 'QUESTION_SELECT' || isSelectingQuestionRef.current) {
          return;
        }
        isSelectingQuestionRef.current = true;
        try {
          audioEngine.resetTranscript();
          const nextQ = orchestratorRef.current.getNextQuestion(currentCtx);
          if (nextQ) {
            if (fsmRef.current.state === 'QUESTION_SELECT') {
              dispatch({ type: 'QUESTION_SELECTED', question: nextQ });
            }
          } else {
            if (fsmRef.current.state === 'QUESTION_SELECT') {
              dispatch({ type: 'ADAPTATION_COMPLETE' });
            }
          }
        } finally {
          isSelectingQuestionRef.current = false;
        }
        break;
      }
      case 'PLAY_QUESTION': {
        audioEngine.resetTranscript();
        audioEngine.speakText(action.question.text, () => {
          if (fsmRef.current.state === 'ASKING') {
            dispatch({ type: 'QUESTION_DELIVERED' });
          }
        });
        break;
      }
      case 'START_RECORDING_ANSWER': {
        audioEngine.resetTranscript();
        audioEngine.startListening();
        break;
      }
      case 'PROCESS_EVALUATION_PLACEHOLDER': {
        if (fsmRef.current.state !== 'EVALUATING' || isEvaluatingRef.current) return;
        isEvaluatingRef.current = true;

        const rawTranscript = (action.transcript || '').trim();
        const durationSec = Math.round((audioEngine.transcript?.durationMs || 0) / 1000);

        evaluateSessionTranscript(currentCtx.sessionId, {
          skillTag: currentCtx.currentQuestion?.skill || 'General',
          difficultyLevel: currentCtx.currentQuestion?.difficulty || 2,
          questionText: currentCtx.currentQuestion?.text || '',
          rawTranscript,
          durationSeconds: durationSec,
        })
          .then((res) => {
            if (fsmRef.current.state === 'EVALUATING') {
              dispatch({
                type: 'EVALUATION_READY',
                result: {
                  questionId: action.questionId,
                  completed: true,
                  evaluation: res.evaluation,
                  adaptation: res.adaptation,
                },
              });
            }
          })
          .catch(() => {
            if (fsmRef.current.state === 'EVALUATING') {
              dispatch({
                type: 'EVALUATION_READY',
                result: { questionId: action.questionId, completed: true },
              });
            }
          })
          .finally(() => {
            isEvaluatingRef.current = false;
          });
        break;
      }
      case 'EXECUTE_ADAPTATION': {
        if (fsmRef.current.state === 'ADAPTING') {
          dispatch({ type: 'ADAPTATION_COMPLETE' });
        }
        break;
      }
      case 'PLAY_WRAPUP': {
        audioEngine.stopListening();
        audioEngine.speakText(action.text, () => {
          if (fsmRef.current.state === 'WRAPUP') {
            dispatch({ type: 'INTRO_DELIVERED' });
          }
        });
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

  // Monitor Audio Engine State Transitions ONLY for Candidate Answer Recording
  useEffect(() => {
    const currentState = fsm.state;
    const currentAudioStatus = audioEngine.status;

    if (currentState === 'LISTENING' && currentAudioStatus === 'TRANSCRIPT_READY') {
      const rawText = (audioEngine.transcript?.transcript || '').trim();
      const durMs = audioEngine.transcript?.durationMs || 0;
      dispatch({
        type: 'ANSWER_CAPTURED',
        transcript: rawText,
        durationMs: durMs,
      });
    }
  }, [
    fsm.state,
    audioEngine.status,
    audioEngine.transcript,
    dispatch,
  ]);

  // Start Interview Command
  const startInterview = useCallback(
    (customConfig?: Partial<InterviewConfig>) => {
      const mergedConfig: InterviewConfig = {
        ...initialContext.config,
        ...customConfig,
      };

      // Initialize Timer
      if (!timerRef.current) {
        timerRef.current = new InterviewTimer({
          durationSeconds: mergedConfig.durationSeconds,
          onTick: (elapsed, remaining) => {
            setFsm((prev) => ({
              ...prev,
              context: {
                ...prev.context,
                elapsedSeconds: elapsed,
                remainingSeconds: remaining,
              },
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
    },
    [dispatch]
  );

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
    audioEngine.resetTranscript();
    setFsm({
      state: 'IDLE',
      context: {
        ...initialContext,
        sessionId,
        candidateName,
      },
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
    state: fsm.state,
    context: fsm.context,
    audioEngine,
    startInterview,
    finishInterview,
    resetInterview,
  };
};
