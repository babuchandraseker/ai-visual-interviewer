# AI Visual Interviewer — Production Architecture & Engineering Specification

> **Structured Automated Assessment Platform with Evidence-First AI Evaluation, Objective Visual Presence Telemetry, Private Audio Persistence, and Authoritative Human Recruiter Governance.**

---

## 1. System Architecture Overview

The **AI Visual Interviewer** is designed around 7 foundational engineering principles:

1. **Deterministic State Machine (FSM):** The interview lifecycle (`SETUP` → `INTRO` → `QUESTION_SELECT` → `ASKING` → `LISTENING` → `EVALUATING` → `ADAPTING` → `WRAPUP` → `COMPLETED`) is strictly governed by a server-side state machine. The LLM cannot mutate application state.
2. **Evidence-First AI Evaluation:** Category scores (`1.0–5.0`) are generated alongside verbatim direct quotes copied from the candidate's answer. Unverified or fabricated quotes are automatically caught and flagged.
3. **Objective Client Visual Telemetry:** Client-side MediaPipe face detection produces only objective presence metadata (`NO_FACE_DETECTED`, `MULTIPLE_FACES_DETECTED`, `CAMERA_DISCONNECTED`). Zero raw video frames, images, embeddings, or subjective emotion/biometric inferences are transmitted or stored.
4. **Private Audio Persistence & Short-Lived Signed URLs:** Candidate voice recordings are stored in private object storage (`AWS S3` / `MinIO` / `MockStorage`) with SHA-256 checksums and DB metadata tracking. Access is gated by organization authorization and short-lived (15-min) signed URLs. Audio binary data is **never** stored in PostgreSQL.
5. **Human Recruiter Decision Governance:** The system **never** performs automated candidate rejections or computes arbitrary "cheating scores". The human recruiter retains exclusive final placement decision authority (`ADVANCE`, `HOLD`, `REJECT`).
6. **Strict Multi-Tenant & RBAC Isolation:** Every API endpoint verifies `req.user.organizationId === session.organizationId`. Candidate JWT tokens are barred from recruiter endpoints.
7. **Adversarial Resilience & Prompt Injection Defense:** Candidate transcripts are sandboxed inside `<untrusted_candidate_transcript>` tags. Inputs are sanitized against path traversal, XSS, and payload pollution.

---

## 2. Directory Structure

```text
ai-visual-interviewer/
├── client/                      # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/          # UI Components (Preflight, Interview, Recruiter)
│   │   ├── fsm/                 # Client FSM State Definitions
│   │   ├── hooks/               # Custom React Hooks (useAudioEngine, useCamera, useInterviewFSM)
│   │   ├── pages/               # Application Pages (Landing, Preflight, Shell, Recruiter Portal)
│   │   ├── services/            # API Client, Audio Engine, Visual Telemetry Detector
│   │   ├── test/                # Frontend Vitest Test Suites
│   │   └── types/               # TypeScript Type Definitions
│   ├── package.json
│   └── vite.config.ts
├── server/                      # Express.js + Prisma ORM + TypeScript Backend
│   ├── prisma/                  # Prisma Schema & Database Migrations
│   ├── src/
│   │   ├── config/              # Environment Variable Hardening & Startup Validation
│   │   ├── controllers/         # API Endpoint Controllers
│   │   ├── middleware/          # Auth, RBAC, Validation, Error Handler, Logger
│   │   ├── routes/              # Express API Routes (/auth, /sessions, /recruiter, /audio)
│   │   ├── services/            # Storage, AI Evaluation, Adaptation Services
│   │   └── utils/               # JWT, Logger, API Error Classes
│   ├── tests/                   # Jest Backend Integration, Security, Anti-Bias & E2E Suites
│   └── package.json
├── Dockerfile                   # Multi-Stage Production Docker Build
├── .dockerignore
└── README.md
```

---

## 3. Environment Variables & Hardening

Create a `.env` file inside the `server/` directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=http://localhost:3000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_interviewer?schema=public"

# Authentication (Must be >= 16 chars in production)
JWT_SECRET="replace-with-a-secure-random-secret-key-at-least-16-chars"
JWT_EXPIRES_IN="24h"

# Optional Cloud AI & Storage Credentials (Falls back to Mock Providers if empty)
OPENAI_API_KEY=""
DEEPGRAM_API_KEY=""
ELEVENLABS_API_KEY=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET="ai-visual-interviewer-audio"
```

> **Security Note:** In production (`NODE_ENV=production`), startup validation in `server/src/config/env.ts` will throw a fatal error if default development JWT secrets are used.

---

## 4. Setup & Local Development

### Prerequisites
- Node.js `v20.x` or higher
- PostgreSQL `v14.x` or higher (or Docker PostgreSQL container)

### Step 1: Install Dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 2: Database Migration & Schema Generation
```bash
cd ../server
npx prisma migrate dev --name init
npx prisma generate
```

### Step 3: Run Development Servers
```bash
# In server directory:
npm run dev

# In client directory:
npm run dev
```

---

## 5. Automated Test Suites

### Backend Integration & Security Tests (Jest)
```bash
cd server
npm test
```
*Executes all 14 test suites (63 tests) covering API endpoints, JWT security, BOLA/IDOR, path traversal, visual telemetry privacy guards, prompt injection, AI anti-bias audit, and full E2E lifecycle.*

### Frontend Tests (Vitest)
```bash
cd client
npm test
```
*Executes all 9 test files (34 tests) covering React hooks, audio engine, timer, and recruiter dashboard components.*

---

## 6. Production Builds & Docker Containerization

### Compiling TypeScript Production Builds
```bash
# Build server
cd server
npm run build

# Build client
cd ../client
npm run build
```

### Containerized Deployment with Docker
Build minimal non-root production Docker container:
```bash
docker build -t ai-visual-interviewer:latest .
```

Run container:
```bash
docker run -d \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="production-secure-secret-key-string" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  ai-visual-interviewer:latest
```

---

## 7. Production Operations & Best Practices

### Database Backup & Disaster Recovery Strategy
1. **PostgreSQL Snapshots:** Execute automated `pg_dump` or cloud managed database daily snapshots (e.g. AWS RDS Automated Backups with 30-day retention).
2. **Object Storage Replication:** Enable S3 Cross-Region Replication (CRR) and S3 Versioning on candidate audio buckets to prevent accidental deletion.

### Data Retention & Privacy Considerations
- **Telemetry Retention:** Presence telemetry logs are metadata-only and should be purged 90 days post-interview.
- **Audio Asset Lifecycle:** Candidate answer audio files stored in private object storage should be bound to S3 Lifecycle expiration rules (e.g., auto-archive to Glacier after 30 days, purge after 180 days according to organizational compliance requirements).

---

## 8. Final Verification Matrix

| Subsystem | Status | Verification Detail |
| :--- | :--- | :--- |
| **Authentication & RBAC** | ✅ PASSED | `HS256` token validation, role checks, and secret log redaction verified. |
| **Tenant Isolation** | ✅ PASSED | Organization boundary enforced on all routes (403 Forbidden on cross-tenant requests). |
| **Deterministic FSM** | ✅ PASSED | 100% deterministic question progression & difficulty adaptation. |
| **Evidence Validation** | ✅ PASSED | Direct quotes verified against raw transcript text. |
| **Visual Telemetry** | ✅ PASSED | Metadata-only presence presence events; visual binary/emotion data rejected. |
| **Audio Persistence** | ✅ PASSED | Object storage upload + 15-min signed access URLs verified. |
| **Recruiter Dashboard** | ✅ PASSED | Comprehensive evidence report rendering & human placement decisions (`ADVANCE`, `HOLD`, `REJECT`). |
| **AI Anti-Bias Audit** | ✅ PASSED | Scoring invariance verified across synthetic names, grammar styles, and identity statements. |
| **E2E Integration** | ✅ PASSED | Complete lifecycle verified from invite token validation to recruiter decision. |
