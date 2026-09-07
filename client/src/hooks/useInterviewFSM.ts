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

  // Handle FSM actions deterministically
  const handleAction = useCallback(
    (action: any, currentCtx: InterviewContext) => {
      switch (action.type) {
        case 'PLAY_INTRO': {
          audioEngine.speakText(action.text);
          break;
        }
        case 'SELECT_NEXT_QUESTION': {
          audioEngine.resetTranscript();
          const nextQ = orchestratorRef.current.getNextQuestion(currentCtx);
          if (nextQ) {
            dispatch({ type: 'QUESTION_SELECTED', question: nextQ });
          } else {
            dispatch({ type: 'ADAPTATION_COMPLETE' });
          }
          break;
        }
        case 'PLAY_QUESTION': {
          audioEngine.resetTranscript();
          audioEngine.speakText(action.question.text);
          break;
        }
        case 'START_RECORDING_ANSWER': {
          audioEngine.resetTranscript();
          audioEngine.startListening();
          break;
        }
        case 'PROCESS_EVALUATION_PLACEHOLDER': {
          if (isEvaluatingRef.current) return;
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
              // Ensure we only dispatch if still in EVALUATING state
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
              // Fallback to allow FSM progression without getting stuck
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
          setTimeout(() => {
            if (fsmRef.current.state === 'ADAPTING') {
              dispatch({ type: 'ADAPTATION_COMPLETE' });
            }
          }, 200);
          break;
        }
        case 'PLAY_WRAPUP': {
          audioEngine.stopListening();
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
    },
    [audioEngine]
  );

  // Dispatch FSM event helper with atomic state updates
  const dispatch = useCallback(
    (event: InterviewEvent) => {
      setFsm((prev) => {
        const result = transition(prev.state, event, prev.context);

        // Execute side-effect action asynchronously outside state updater
        if (result.action) {
          const action = result.action;
          const nextCtx = result.nextContext;
          queueMicrotask(() => {
            handleAction(action, nextCtx);
          });
        }

        return {
          state: result.nextState,
          context: result.nextContext,
        };
      });
    },
    [handleAction]
  );

  // Monitor Audio Engine State Transitions to drive FSM
  useEffect(() => {
    const currentState = fsm.state;
    const currentAudioStatus = audioEngine.status;

    if (currentState === 'INTRO' && currentAudioStatus === 'READY' && fsm.context.startedAt) {
      // Intro TTS finished -> advance to QUESTION_SELECT
      dispatch({ type: 'INTRO_DELIVERED' });
    }

    if (currentState === 'ASKING' && currentAudioStatus === 'READY' && fsm.context.currentQuestion) {
      // Question TTS finished -> advance to LISTENING
      dispatch({ type: 'QUESTION_DELIVERED' });
    }

    if (currentState === 'LISTENING' && currentAudioStatus === 'TRANSCRIPT_READY') {
      // Candidate answer captured -> advance to EVALUATING
      const rawText = (audioEngine.transcript?.transcript || '').trim();
      const durMs = audioEngine.transcript?.durationMs || 0;
      dispatch({
        type: 'ANSWER_CAPTURED',
        transcript: rawText,
        durationMs: durMs,
      });
    }

    if (currentState === 'WRAPUP' && currentAudioStatus === 'READY') {
      // Wrapup TTS finished -> advance to COMPLETED
      dispatch({ type: 'INTRO_DELIVERED' });
    }
  }, [
    fsm.state,
    audioEngine.status,
    audioEngine.transcript,
    fsm.context.startedAt,
    fsm.context.currentQuestion,
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
