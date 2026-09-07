import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/ui/Header';
import { loginRecruiter } from '../services/api';

export const RecruiterLoginPage: React.FC = () => {
  const [email, setEmail] = useState('recruiter@acme.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginRecruiter(email, password);
      navigate('/recruiter/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header title="Recruiter Portal" subtitle="Evidence-First AI Interview Assessment" />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card title="Recruiter Sign In" subtitle="Access candidate evidence reports & decisions">
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {error && (
                <div className="bg-rose-950/80 border border-rose-700/60 text-rose-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="recruiter@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" variant="primary" disabled={loading} className="w-full mt-6 justify-center">
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
