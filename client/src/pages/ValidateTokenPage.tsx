import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateInterviewToken } from '../services/api';
import { CandidateInviteValidation } from '../types';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Loader2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export const ValidateTokenPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [validation, setValidation] = useState<CandidateInviteValidation | null>(null);
  const [errorState, setErrorState] = useState<{
    type: 'EXPIRED' | 'USED' | 'INVALID' | 'SERVER_ERROR';
    message: string;
  } | null>(null);

  const performValidation = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setErrorState({
        type: 'INVALID',
        message: 'No interview token provided in URL.',
      });
      return;
    }

    setIsLoading(true);
    setErrorState(null);

    try {
      const data = await validateInterviewToken(token);
      setValidation(data);
      setIsLoading(false);

      if (data.status === 'EXPIRED') {
        setErrorState({
          type: 'EXPIRED',
          message: 'This interview invitation has expired.',
        });
      } else if (data.status === 'USED') {
        setErrorState({
          type: 'USED',
          message: 'This interview invitation has already been used.',
        });
      } else if (data.valid) {
        // Store validation payload in sessionStorage for flow state
        sessionStorage.setItem(`session_meta_${token}`, JSON.stringify(data));
        navigate(`/interview/${token}/instructions`, { replace: true });
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err.status === 404) {
        setErrorState({
          type: 'INVALID',
          message: 'This interview invitation is invalid.',
        });
      } else {
        setErrorState({
          type: 'SERVER_ERROR',
          message: "We couldn't verify your interview invitation. Please check your connection and try again.",
        });
      }
    }
  }, [token, navigate]);

  useEffect(() => {
    performValidation();
  }, [performValidation]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        {isLoading && (
          <Card className="max-w-md w-full text-center space-y-4 py-8">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-100">Verifying Invitation...</h2>
            <p className="text-xs text-slate-400">Validating your single-use interview token.</p>
          </Card>
        )}

        {!isLoading && errorState && (
          <Card className="max-w-md w-full text-center space-y-5 py-6">
            <div className="flex justify-center">
              {errorState.type === 'EXPIRED' && <Clock className="w-12 h-12 text-amber-500" />}
              {errorState.type === 'USED' && <AlertTriangle className="w-12 h-12 text-amber-500" />}
              {errorState.type === 'INVALID' && <XCircle className="w-12 h-12 text-rose-500" />}
              {errorState.type === 'SERVER_ERROR' && <AlertTriangle className="w-12 h-12 text-rose-500" />}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Verification Failed</h2>
              <p className="text-sm text-slate-300">{errorState.message}</p>
            </div>

            <div className="pt-2">
              {errorState.type === 'SERVER_ERROR' ? (
                <Button onClick={performValidation} className="w-full justify-center">
                  Try Again
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/')} className="w-full justify-center">
                  Return to Home
                </Button>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};
