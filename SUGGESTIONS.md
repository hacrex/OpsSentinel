# Suggestions for OpsSentinel

Based on a review of the current codebase and project structure, here are several suggestions to improve **OpsSentinel** as a professional open-source product.

---

## Technical Improvements

### 1. Add Test Suite
- Add unit tests for backend (Jest) and frontend (Vitest)
- Add integration tests for webhook processing and auth flows
- Set up CI pipeline to run tests on every PR

### 2. Database Migrations
- Current: Tables are created on startup with `CREATE TABLE IF NOT EXISTS`
- Improvement: Use a migration tool (like Knex.js or Drizzle ORM) to manage schema changes reliably as the project grows

### 3. Input Validation
- Add schema validation for webhook payloads (e.g., using Zod or Joi)
- Validate all user inputs on backend routes

### 4. Error Handling
- Add request ID tracking for debugging
- Add graceful shutdown handling (SIGTERM/SIGINT)
- Add database connection health checks

---

## Feature Enhancements

### 1. Advanced Filtering
- Add date range filtering to events
- Add workflow name filtering
- Add search bar for quick navigation through large event streams

### 2. Detailed Failure View
- Allow users to click on a failed run to see a summary of the error logs directly in the dashboard (using the GitHub API)
- Add log streaming for in-progress runs

### 3. User Preferences
- Allow users to toggle specific notification channels (Slack, Email, Teams) per repository
- Add webhook configuration UI (currently requires .env changes)

### 4. Webhook Replay
- Add ability to replay/retry failed webhook deliveries
- Add webhook delivery log with status and timestamps

---

## Project Health & Community

### 1. Documentation
- Add API documentation (OpenAPI/Swagger)
- Add architecture diagram
- Consolidate documentation into a `docs/` folder structure
- Add CHANGELOG.md

### 2. CI/CD
- Set up `.github/workflows/ci.yml` to automatically run linting and tests on every Pull Request
- Add automated dependency updates (Dependabot/Renovate)

### 3. Code Quality
- Extract shared utilities (formatTs, etc.) to reduce duplication
- Move inline styles to CSS modules or styled-components
- Add TypeScript for type safety

### 4. Monitoring
- Add Prometheus metrics endpoint
- Add structured logging with request correlation IDs
- Add health check endpoint with database connectivity status

---

## Security Hardening

### 1. Auth Improvements
- Move auth tokens from localStorage to HttpOnly cookies
- Add token refresh mechanism
- Add session management and logout everywhere

### 2. API Security
- Add CORS restrictions for production
- Add Content Security Policy headers
- Add API key authentication for webhook endpoints (alternative to signature)

### 3. Data Security
- Encrypt sensitive data at rest (SMTP credentials, etc.)
- Add audit logging for all state-changing operations
- Add rate limiting per tenant in SaaS mode
