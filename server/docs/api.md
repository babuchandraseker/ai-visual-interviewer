# AI Visual Interviewer — API Specifications (Phase 1)

Base URL: `http://localhost:4000/api/v1`

---

## 1. Public Health Check

### `GET /health`
Returns baseline health and uptime of the backend service and database connection.

* **Authentication Required:** None
* **Success Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-07T13:20:00.000Z",
  "uptime": 124.5,
  "database": "connected"
}
```
* **Degraded Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "timestamp": "2026-09-07T13:20:00.000Z",
  "uptime": 124.5,
  "database": "disconnected"
}
```

---

## 2. Authentication

### `POST /api/v1/auth/login`
Authenticates a recruiter or system admin using email and password, returning a cryptographically signed JWT.

* **Authentication Required:** None
* **Rate Limit:** 10 requests per 15 minutes per IP.
* **Request Body:**
```json
{
  "email": "recruiter@techcorp.com",
  "password": "RecruiterPassword123!"
}
```
* **Success Response (200 OK):**
```json
{
  "user": {
    "id": "usr_99x11z",
    "email": "recruiter@techcorp.com",
    "name": "Jane Recruiter",
    "role": "RECRUITER",
    "organizationId": "org_77a22b"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
* **Error Response (400 Bad Request - Validation Failure):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed for request data",
    "details": [
      { "field": "email", "message": "Invalid email address format" }
    ]
  }
}
```
* **Error Response (401 Unauthorized - Invalid Credentials):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

## 3. Recruiter Interface

### `GET /api/v1/recruiter/dashboard`
Fetches high-level metrics scoped strictly to the authenticated user's Organization ID.

* **Authentication Required:** Yes (`Bearer <token>`)
* **Role Required:** `RECRUITER` or `ADMIN`
* **Success Response (200 OK):**
```json
{
  "message": "Recruiter dashboard overview",
  "organizationId": "org_77a22b",
  "metrics": {
    "totalJobRoles": 4,
    "totalTemplates": 2,
    "totalSessions": 12
  }
}
```
* **Error Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication token missing or malformed"
  }
}
```
* **Error Response (403 Forbidden):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access restricted to roles: RECRUITER, ADMIN"
  }
}
```

---

## 4. Candidate Session Token Validation

### `GET /api/v1/sessions/validate/:token`
Validates a candidate's single-use invite token prior to starting an interview session.

* **Authentication Required:** None (Token in URL path)
* **Success Response (200 OK):**
```json
{
  "valid": true,
  "candidateName": "Alex Chen",
  "template": {
    "title": "Backend L4 Technical Interview",
    "durationMinutes": 30,
    "targetDifficulty": 2
  },
  "status": "PENDING"
}
```
* **Error Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Invalid candidate invite token"
  }
}
```
