import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Header } from '../components/ui/Header';
import { getRecruiterDashboardMetrics, getRecruiterInterviews } from '../services/api';
import { RecruiterMetrics, RecruiterInterviewItem } from '../types';

export const RecruiterDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<RecruiterMetrics | null>(null);
  const [interviews, setInterviews] = useState<RecruiterInterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<string>('desc');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, interviewsRes] = await Promise.all([
        getRecruiterDashboardMetrics(),
        getRecruiterInterviews({
          page,
          limit: 10,
          status: statusFilter || undefined,
          candidateName: candidateSearch || undefined,
          sortBy,
          order,
        }),
      ]);

      setMetrics(metricsRes.metrics);
      setInterviews(interviewsRes.interviews);
      setTotalPages(interviewsRes.pagination.totalPages);
      setTotalCount(interviewsRes.pagination.total);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('recruiter_token');
        navigate('/recruiter/login');
        return;
      }
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter, sortBy, order]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('recruiter_token');
    navigate('/recruiter/login');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        title="Recruiter Dashboard"
        subtitle="AI Visual Interviewer Evidence & Assessment Console"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top Bar with Logout */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Candidate Sessions Overview</h2>
            <p className="text-xs text-slate-400">
              Inspect verified candidate transcripts, evaluation scores, and integrity logs
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout} className="text-sm">
            Sign Out
          </Button>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-700/60 text-rose-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Metrics Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="text-center">
              <div className="text-3xl font-extrabold text-indigo-400">{metrics.totalInterviews}</div>
              <div className="text-xs font-medium uppercase text-slate-400 mt-1">Total Sessions</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-extrabold text-emerald-400">{metrics.completedInterviews}</div>
              <div className="text-xs font-medium uppercase text-slate-400 mt-1">Completed</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-extrabold text-amber-400">{metrics.inProgressInterviews}</div>
              <div className="text-xs font-medium uppercase text-slate-400 mt-1">In Progress</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-extrabold text-sky-400">{metrics.pendingInvites}</div>
              <div className="text-xs font-medium uppercase text-slate-400 mt-1">Pending Invites</div>
            </Card>
            <Card className="text-center col-span-2 md:col-span-1">
              <div className="text-3xl font-extrabold text-purple-400">
                {metrics.averageScore > 0 ? `${metrics.averageScore} / 5.0` : 'N/A'}
              </div>
              <div className="text-xs font-medium uppercase text-slate-400 mt-1">Avg Score</div>
            </Card>
          </div>
        )}

        {/* Filter and Search Bar */}
        <Card>
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Candidate Search
              </label>
              <input
                type="text"
                placeholder="Search candidate name..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="overallScore">Overall Score</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1 justify-center text-sm">
                Apply Filters
              </Button>
            </div>
          </form>
        </Card>

        {/* Interviews Table */}
        <Card title="Candidate Interviews" subtitle={`Showing ${interviews.length} of ${totalCount} sessions`}>
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading candidate sessions...</div>
          ) : interviews.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No interview sessions found matching criteria.</div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm text-slate-200 border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-xs font-semibold uppercase text-slate-400 bg-slate-900/60">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Job Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Overall Score</th>
                    <th className="py-3 px-4">Questions</th>
                    <th className="py-3 px-4">Integrity Events</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {interviews.map((item) => (
                    <tr key={item.sessionId} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <div className="text-slate-100 font-semibold">{item.candidateName}</div>
                        <div className="text-xs text-slate-400">{item.candidateEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">{item.jobRoleTitle}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-300">
                        {item.overallScore !== null ? `${item.overallScore.toFixed(1)} / 5.0` : '-'}
                      </td>
                      <td className="py-3.5 px-4">{item.questionCount}</td>
                      <td className="py-3.5 px-4">
                        {item.integrityEventCount > 0 ? (
                          <span className="text-amber-400 font-semibold">{item.integrityEventCount} events</span>
                        ) : (
                          <span className="text-slate-500">0 events</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Button
                          variant="primary"
                          className="text-xs py-1 px-3"
                          onClick={() => navigate(`/recruiter/report/${item.sessionId}`)}
                        >
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>
              <span className="text-xs text-slate-400">
                Page <strong className="text-slate-200">{page}</strong> of{' '}
                <strong className="text-slate-200">{totalPages}</strong>
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
