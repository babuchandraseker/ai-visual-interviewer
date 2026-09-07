import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ValidateTokenPage } from './pages/ValidateTokenPage';
import { InstructionsPage } from './pages/InstructionsPage';
import { PreflightPage } from './pages/PreflightPage';
import { InterviewShellPage } from './pages/InterviewShellPage';
import { RecruiterLoginPage } from './pages/RecruiterLoginPage';
import { RecruiterDashboardPage } from './pages/RecruiterDashboardPage';
import { EvidenceReportPage } from './pages/EvidenceReportPage';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview/:token" element={<ValidateTokenPage />} />
        <Route path="/interview/:token/instructions" element={<InstructionsPage />} />
        <Route path="/interview/:token/preflight" element={<PreflightPage />} />
        <Route path="/interview/:token/session" element={<InterviewShellPage />} />
        <Route path="/recruiter/login" element={<RecruiterLoginPage />} />
        <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
        <Route path="/recruiter/report/:sessionId" element={<EvidenceReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
