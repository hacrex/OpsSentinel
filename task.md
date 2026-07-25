# OpsSentinel Enhancement Plan

## 1. Advanced Analytics & Insights
- [x] Implement MTTR (Mean Time To Recovery) tracking and visualization
- [x] Add Flaky Workflow Detection system (>30% failure rate, 5+ runs)
- [ ] Implement predictive analytics for workflow failure probability
- [ ] Add Pipeline Cost Analysis estimation

## 2. Actionability & Automated Remediation
- [x] Implement 1-Click workflow re-run from Dashboard
- [ ] Add Auto-Triage to assign failures based on `CODEOWNERS` or commits
- [ ] Integrate LLM to parse logs and summarize root causes in notifications

## 3. Reliability & Architectural Scaling
- [x] Migrate database from SQLite to PostgreSQL (dual support)
- [x] Implement WebSockets for real-time dashboard updates
- [x] Set up automated data retention/cleanup policies

## 4. Security & Access Control
- [x] GitHub OAuth integration
- [x] HMAC SHA256 webhook signature verification
- [x] Rate limiting on API and webhook endpoints
- [x] Helmet security headers
- [ ] Implement Role-Based Access Control (RBAC) (Viewer, Developer, Admin)
- [ ] Integrate SSO/SAML Login (e.g., Okta, Google Workspace)
- [ ] Add Audit Logging for system configurations and manual actions

## 5. Multi-Tenancy (SaaS)
- [x] Tenant model with webhook secrets
- [x] Per-tenant data isolation
- [x] SaaS mode toggle via environment variable
- [ ] Tenant management dashboard
- [ ] Billing/subscription integration

## 6. Security & Bug Fixes
- [x] Fix SQL injection in retention.js
- [x] Fix SQLite compatibility (use ? instead of $1)
- [x] Fix trend query params in SaaS mode
- [x] Fix webhook tenant lookup for SQLite

## 7. Testing & Quality
- [x] Backend unit tests (Jest)
- [x] Frontend unit tests (Vitest)
- [ ] Integration tests for webhook processing
- [ ] E2E tests with Playwright

## 8. Product Website
- [x] Create standalone `website/` directory
- [x] Set up Vite + React project structure
- [x] Create page components (Home, Features, Pricing, Docs, NotFound)
- [x] Create Layout component (nav, footer)
- [x] Create design system (CSS)
- [x] Run npm install and verify build
- [x] Deploy to Vercel
- [x] Add light/dark mode toggle
- [x] Add animations and improvements
- [x] Add GitHub stars counter
- [x] Add documentation pages fetching from GitHub
