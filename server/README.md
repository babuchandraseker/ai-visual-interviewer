# AI Visual Interviewer — Backend Server (Phase 1 Foundation)

Enterprise-grade backend foundation for the AI Visual Interviewer system, built with Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, and JWT Authentication.

---

## 1. Architecture & Design Principles

This Phase 1 backend establishes a secure, modular foundation for upcoming AI interview phases:
- **Multi-Tenant Isolation:** All candidate invites, job roles, interview templates, and sessions are strictly scoped by `organizationId`. A recruiter in Organization A cannot access data from Organization B.
- **Strict Role-Based Access Control (RBAC):** Middleware enforces `RECRUITER` and `ADMIN` privileges. Candidate access uses cryptographically generated single-use tokens.
- **Robust Error Handling:** Centralized Express error handler catches domain errors (`ApiError`) and formats clean, predictable JSON responses.

---

## 2. Prerequisites & Environment Setup

- **Node.js:** `v20.x` or higher
- **npm:** `v10.x` or higher
- **PostgreSQL:** `v14.x` or higher (running locally or via Cloud/Docker)

### Installation

```bash
cd server
npm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update variables as needed:
```ini
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_interviewer?schema=public
JWT_SECRET=super-secret-development-key-change-in-production
JWT_EXPIRES_IN=24h
```

---

## 3. Database Migration & Seeding

1. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

2. **Run Database Migrations:**
   ```bash
   npm run prisma:migrate
   ```

3. **Seed Database with Sample Data:**
   ```bash
   npm run prisma:seed
   ```

### Development Seed Credentials
- **Admin Account:** `admin@techcorp.com` / `AdminPassword123!`
- **Recruiter Account:** `recruiter@techcorp.com` / `RecruiterPassword123!`
- **Sample Candidate Token:** `dev-sample-invite-token-12345`

---

## 4. Development & Testing Commands

- **Run Server in Development Mode (Live Reload):**
  ```bash
  npm run dev
  ```

- **Run Automated Jest Test Suite:**
  ```bash
  npm test
  ```

- **Build TypeScript for Production:**
  ```bash
  npm run build
  ```

- **Start Production Server:**
  ```bash
  npm start
  ```

---

## 5. Directory Structure

```text
server/
├── docs/
│   └── api.md             # API specifications and route descriptions
├── prisma/
│   ├── schema.prisma      # Prisma schema defining 11 entities & enums
│   └── seed.ts            # Development database seed script
├── src/
│   ├── config/            # Environment variables & configuration
│   ├── controllers/       # Route controllers (Auth, Health, Recruiter, Sessions)
│   ├── middleware/        # Auth, RBAC, Validation, Error Handler, Request Logger
│   ├── routes/            # Express Routers
│   ├── services/          # Business logic & Prisma DB operations
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # JWT, Password Hashing, ApiError, Logger
│   ├── app.ts             # Express app setup & security middleware pipeline
│   └── server.ts          # Graceful HTTP server entrypoint
├── tests/                 # Jest + Supertest automated test suite
├── .env.example
├── jest.config.js
├── package.json
└── tsconfig.json
```
