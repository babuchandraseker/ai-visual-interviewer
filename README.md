# AI Visual Interviewer

Enterprise-grade automated platform for conducting consistent, structured, evidence-based technical placement interviews.

---

## Workspace Architecture

```text
ai-visual-interviewer/
├── client/         # Phase 2 — Candidate Pre-Flight & UI Shell (Vite + React + TS + Tailwind)
└── server/         # Phase 1 — Backend Foundation (Node.js + Express + Prisma + TS + Postgres)
```

---

## Quick Start Guide

### 1. Start Backend Server (Phase 1)

```bash
cd server
npm install
npm run prisma:generate
npm run dev
```
Backend API will be running at `http://localhost:4000`.

### 2. Start Candidate Frontend (Phase 2)

```bash
cd client
npm install
npm run dev
```
Candidate UI will be running at `http://localhost:3000`.

---

## Candidate Journey (Phase 2 Complete)

```text
Enter Interview Link (/interview/:token)
            ↓
Validate Token against Phase 1 API (/api/v1/sessions/validate/:token)
            ↓
Read Instructions & Telemetry Notice
            ↓
Run Camera & Microphone Diagnostic Check
            ↓
Verify Pre-flight Summary (All checks passed)
            ↓
Enter Interview Visual UI Shell (/interview/:token/session)
```

---

## Automated Testing

- **Run Server Tests:**
  ```bash
  cd server && npm test
  ```

- **Run Client Tests:**
  ```bash
  cd client && npm test
  ```
