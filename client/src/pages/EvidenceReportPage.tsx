import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import {
  getInterviewEvidenceReport,
  saveRecruiterDecision,
  getCandidateAudioUrl,
} from '../services/api';
import { EvidenceReportDTO } from '../types';

export const EvidenceReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<EvidenceReportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recruiter Decision Form State
  const [decision, setDecision] = useState<'ADVANCE' | 'HOLD' | 'REJECT'>('ADVANCE');
  const [notes, setNotes] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadReport = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getInterviewEvidenceReport(sessionId);
      setReport(res.report);

      // Pre-fill decision if present
      if (res.report.humanDecision.decision) {
        const d = res.report.humanDecision.decision.toUpperCase();
        if (d === 'STRONG_PASS' || d === 'PASS' || d === 'ADVANCE') setDecision('ADVANCE');
        else if (d === 'BORDERLINE' || d === 'HOLD') setDecision('HOLD');
        else if (d === 'FAIL' || d === 'REJECT') setDecision('REJECT');
      }
      if (res.report.humanDecision.notes) {
        setNotes(res.report.humanDecision.notes);
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('recruiter_token');
        navigate('/recruiter/login');
        return;
      }
      setError(err.message || 'Failed to load candidate evidence report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setSavingDecision(true);
    setDecisionSuccess(null);
    try {
      await saveRecruiterDecision(sessionId, decision, notes);
      setDecisionSuccess(`Decision (${decision}) successfully saved.`);
      await loadReport();
    } catch (err: any) {
      setError(err.message || 'Failed to save decision');
    } finally {
      setSavingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header title="Evidence Report" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Loading comprehensive evidence report...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header title="Evidence Report" subtitle="Error" />
        <div className="flex-1 max-w-4xl mx-auto p-6 space-y-4">
          <div className="bg-rose-950/80 border border-rose-700/60 text-rose-300 px-4 py-3 rounded-lg text-sm">
            {error || 'Report not found'}
          </div>
          <Button variant="secondary" onClick={() => navigate('/recruiter/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { candidate, interview, overallEvaluation, skillScores, evaluations, integrityEvents, humanReviewIndicators } =
    report;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        title={`Candidate Evidence Report — ${candidate.name}`}
        subtitle={`Role: ${interview.jobRoleTitle} (${interview.targetLevel})`}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div>
            <div className="text-xl font-bold text-slate-100">{candidate.name}</div>
            <div className="text-xs text-slate-400">{candidate.email} • Session ID: {interview.sessionId}</div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={interview.status === 'COMPLETED' ? 'success' : 'info'}>
              {interview.status}
            </Badge>
            <Button variant="secondary" onClick={() => navigate('/recruiter/dashboard')} className="text-xs">
              Back to List
            </Button>
          </div>
        </div>

        {/* Human Review Required Banner */}
        {humanReviewIndicators.requiresHumanReview && (
          <div className="bg-amber-950/80 border border-amber-700/60 p-4 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <span className="text-lg">⚠️</span> Transparent Human Review Recommended
            </div>
            <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-0.5">
              {humanReviewIndicators.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 1: Overall Score & Weighted Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-center items-center text-center md:col-span-1">
            <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
              Overall Candidate Score
            </div>
            <div className="text-5xl font-black text-indigo-400 my-2">
              {overallEvaluation.overallScore.toFixed(2)}
              <span className="text-lg font-normal text-slate-400"> / 5.0</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-xs">
              Authoritative weighted formula: 35% Tech Depth, 25% Prob Solving, 20% Prac Exp, 20% Comm.
            </p>
          </Card>

          <Card title="Dimension Breakdown" subtitle="Scored from 1.0 to 5.0" className="md:col-span-2">
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-2xl font-bold text-sky-400">{overallEvaluation.technicalDepthScore}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Technical Depth (35%)</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-2xl font-bold text-emerald-400">{overallEvaluation.problemSolvingScore}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Problem Solving (25%)</div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-2xl font-bold text-purple-400">{overallEvaluation.communicationScore}</div>
                <div className="text-xs text-slate-400 uppercase font-semibold mt-1">Communication (20%)</div>
              </div>
            </div>

            {/* Skill Scores Progress */}
            {skillScores.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/60">
                <div className="text-xs font-semibold uppercase text-slate-400 mb-2">Skill Tag Averages</div>
                <div className="space-y-2">
                  {skillScores.map((sk) => (
                    <div key={sk.skill} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-300 w-36 truncate">{sk.skill}</span>
                      <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${(sk.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-200 w-10 text-right">{sk.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Section 2: Question Evaluations & Verbatim Evidence */}
        <Card
          title="Question Evaluations & Direct Quotes"
          subtitle="Verbatim candidate responses, quotes validation, strengths, gaps, and answer audio"
        >
          <div className="space-y-6 mt-4">
            {evaluations.length === 0 ? (
              <div className="text-center py-6 text-slate-400">No question evaluations recorded yet.</div>
            ) : (
              evaluations.map((item, idx) => (
                <div
                  key={item.questionInstanceId}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded">
                          Q{idx + 1} • {item.skillTag} (Level {item.difficultyLevel})
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-100 mt-2">{item.questionText}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase">Scores</div>
                      <div className="text-sm font-bold text-indigo-300 mt-0.5">
                        TD: {item.scores.technicalDepth} | PS: {item.scores.problemSolving} | CC: {item.scores.communication}
                      </div>
                    </div>
                  </div>

                  {/* Candidate Verbatim Transcript */}
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg">
                    <div className="text-xs font-semibold uppercase text-slate-400 mb-1 flex justify-between">
                      <span>Candidate Response Transcript</span>
                      <span className="text-slate-500 font-normal">
                        {item.transcript.wordCount} words • {item.transcript.durationSeconds}s
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {item.transcript.rawText}
                    </p>
                  </div>

                  {/* Verbatim Quotes & Evidence Validation */}
                  {item.evidence.directQuotes.length > 0 && (
                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold uppercase text-slate-400">Verbatim Direct Quotes</span>
                        {item.evidence.isQuotesValid ? (
                          <Badge variant="success">Quotes Verified</Badge>
                        ) : (
                          <Badge variant="warning">Quote Mismatch</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {item.evidence.directQuotes.map((qStr, qIdx) => (
                          <blockquote
                            key={qIdx}
                            className="border-l-2 border-indigo-500 pl-3 italic text-xs text-indigo-200"
                          >
                            "{qStr}"
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {item.strengths.length > 0 && (
                      <div className="bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-lg">
                        <span className="font-bold text-emerald-300 uppercase block mb-1">Key Strengths</span>
                        <ul className="list-disc list-inside text-emerald-200/90 space-y-0.5">
                          {item.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.gaps.length > 0 && (
                      <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-lg">
                        <span className="font-bold text-rose-300 uppercase block mb-1">Identified Gaps</span>
                        <ul className="list-disc list-inside text-rose-200/90 space-y-0.5">
                          {item.gaps.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Audio Playback (if audio asset saved) */}
                  {item.audioAsset && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase">Candidate Answer Audio</span>
                      <audio
                        controls
                        src={getCandidateAudioUrl(interview.sessionId, item.questionInstanceId)}
                        className="h-8 max-w-xs"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Section 3: Integrity Event Log Timeline */}
        <Card
          title="Integrity Event Log"
          subtitle="Objective client-side visual telemetry & system events"
        >
          {integrityEvents.length === 0 ? (
            <div className="text-center py-6 text-slate-400">No integrity events logged during interview session.</div>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs text-slate-200 border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 font-semibold uppercase text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {integrityEvents.map((evt) => (
                    <tr key={evt.id}>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{evt.eventType}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            evt.severity === 'HIGH'
                              ? 'error'
                              : evt.severity === 'MEDIUM'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {evt.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {evt.durationMs ? `${(evt.durationMs / 1000).toFixed(1)}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Section 4: Human Recruiter Placement Decision Panel */}
        <Card
          title="Recruiter Hiring Recommendation & Placement Decision"
          subtitle="Autonomous rejection disabled — human recruiter retains authoritative final decision"
        >
          <form onSubmit={handleSaveDecision} className="space-y-4 mt-2">
            {decisionSuccess && (
              <div className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-4 py-3 rounded-lg text-sm">
                {decisionSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Placement Action
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDecision('ADVANCE')}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-colors ${
                    decision === 'ADVANCE'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  🟢 ADVANCE
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('HOLD')}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-colors ${
                    decision === 'HOLD'
                      ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  🟡 HOLD
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECT')}
                  className={`flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-colors ${
                    decision === 'REJECT'
                      ? 'bg-rose-950 border-rose-500 text-rose-300 shadow-lg'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  🔴 REJECT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Recruiter Notes & Rationale
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add contextual notes regarding your placement decision..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={savingDecision} className="px-6">
                {savingDecision ? 'Saving Decision...' : 'Save Recruiter Decision'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};
