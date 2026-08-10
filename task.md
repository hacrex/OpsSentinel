# OpsSentinel — Implementation Roadmap

> **Goal:** Build an open-source GitOps control plane that unifies CI/CD observability, failure intelligence, infrastructure automation, configuration management, and incident management.

---

## Phase 0 — Critical Bugs & Security Fixes ✅

All items completed.

- [x] Fix retention.js callback bug (db.query returns Promise, not callback)
- [x] Add database indexes on events table (tenant_id, repo_name, created_at)
- [x] Fix webhook.test.js — computeMTTR not exported from webhook.js
- [x] Fix FilterBar.test.jsx — expects "All Conclusions" but component uses "All Status"
- [x] Fix jest.config.js — invalid setupFilesAfterSetup key
- [x] Add WebSocket authentication (verify token on connection)
- [x] Add root .gitignore (exclude node_modules, database.sqlite, dist/)
- [x] Remove committed database.sqlite and frontend/dist/ from repo
- [x] Remove dead code (App.css, react.svg, vite.svg, hero.png)
- [x] Fix Express 5 route syntax (`:tenant_id?` → `{/:tenant_id}`)
- [x] Fix auth.test.js token cache collision between tests

---

## Phase 1 — CI/CD Intelligence Core (P0) 🔴 NEXT

**Goal:** Double down on the CI/CD failure intelligence moat.

### 1.1 Pipeline Health Score
- [ ] Create `GET /api/pipeline-health` endpoint
- [ ] Implement composite health score algorithm:
  - Success rate (weight: 30%)
  - MTTR (weight: 20%)
  - Flakiness index (weight: 20%)
  - Average duration (weight: 15%)
  - Recent failure trend (weight: 15%)
- [ ] Add `pipeline_health` table (tenant_id, repo_name, score, components, calculated_at)
- [ ] Create Health Score card component on Dashboard
- [ ] Add health score to Repo Detail page
- [ ] Score categories: 90-100 (Excellent), 70-89 (Good), 50-69 (Needs Attention), <50 (Critical)

### 1.2 Failure Fingerprinting
- [ ] Create `failure_fingerprints` table:
  - id, tenant_id, signature (hash), category, error_pattern, first_seen, last_seen, occurrence_count, repositories, workflows, likely_cause, suggested_action
- [ ] Implement failure signature generation:
  - Normalize error messages (remove timestamps, IDs, hashes)
  - Extract stack traces
  - Hash normalized content for grouping
- [ ] Create `POST /api/failures/fingerprint` endpoint (trigger fingerprinting)
- [ ] Create `GET /api/failures/fingerprints` endpoint (list fingerprints)
- [ ] Create `GET /api/failures/fingerprints/:id` endpoint (detail view)
- [ ] Add Failure Fingerprints page to frontend
- [ ] Add fingerprint badges to workflow failure rows
- [ ] Categorize failures: dependency, test, build, docker, auth, network, timeout, deployment, config, resource, external, unknown

### 1.3 Enhanced Failure Analysis
- [ ] Extend LLM analysis to include failure fingerprint context
- [ ] Add failure pattern matching to auto-triage
- [ ] Add "Similar Failures" section to failure details
- [ ] Add failure trend analysis (increasing, decreasing, stable)

### 1.4 Dashboard Enhancements
- [ ] Add Pipeline Health Score card to main dashboard
- [ ] Add Failure Fingerprint summary widget
- [ ] Add "Recent Failures" section with fingerprint links
- [ ] Add success/failure trend sparklines per repo

---

## Phase 2 — Incident Management (P1) 🔴 NEXT

**Goal:** Transform workflow failures into operational incidents with full context.

### 2.1 Incident Data Model
- [ ] Create `incidents` table:
  - id, tenant_id, title, description, severity (critical/high/medium/low), status (open/investigating/resolved/closed), root_cause_category, failure_fingerprint_id, affected_repos, affected_workflows, assigned_resolvers, created_by, resolved_by, created_at, updated_at, resolved_at, mttr_seconds
- [ ] Create `incident_events` table (timeline):
  - id, incident_id, event_type, description, actor, created_at

### 2.2 Incident API
- [ ] `POST /api/incidents` — create incident manually
- [ ] `GET /api/incidents` — list incidents with filters (status, severity, repo)
- [ ] `GET /api/incidents/:id` — incident detail with timeline
- [ ] `PUT /api/incidents/:id` — update incident (status, severity, assignment)
- [ ] `POST /api/incidents/:id/comments` — add comment
- [ ] `POST /api/incidents/:id/resolve` — resolve incident

### 2.3 Auto-Incident Creation
- [ ] Implement auto-incident rules:
  - Same failure fingerprint occurs 3+ times across different workflows/repos
  - Failure in production environment
  - Failure affects multiple repositories
- [ ] Create incident from failure fingerprint
- [ ] Link related failures to incident
- [ ] Auto-escalate severity based on impact

### 2.4 Incident Dashboard
- [ ] Create `/dashboard/incidents` page
- [ ] Incident list with status/severity filters
- [ ] Incident detail page with timeline
- [ ] Add incident count to main dashboard
- [ ] Add incident badges to affected workflow rows

### 2.5 GitHub Issues Integration
- [ ] `POST /api/incidents/:id/create-issue` — create GitHub Issue from incident
- [ ] Include incident context: failure type, occurrences, repositories, suggested investigation
- [ ] `POST /api/incidents/:id/close-issue` — auto-close Issue when incident resolves
- [ ] Track Issue link in incident record

---

## Phase 3 — Deployment Tracking (P1) 🔴 NEXT

**Goal:** Track the complete chain from commit to deployment.

### 3.1 Deployment Data Model
- [ ] Create `deployments` table:
  - id, tenant_id, application, version, commit_sha, repository, environment, status (pending/in_progress/success/failed/rolled_back), deployment_duration, initiator, workflow_run_id, infrastructure_changes, health_check_status, created_at, completed_at
- [ ] Create `deployment_events` table:
  - id, deployment_id, event_type, description, created_at

### 3.2 Deployment API
- [ ] `POST /api/deployments` — record deployment
- [ ] `GET /api/deployments` — list deployments with filters
- [ ] `GET /api/deployments/:id` — deployment detail
- [ ] `PUT /api/deployments/:id` — update deployment status
- [ ] `GET /api/deployments/stats` — deployment statistics

### 3.3 Deployment Intelligence
- [ ] Correlate deployment with preceding workflow run
- [ ] Correlate deployment with infrastructure changes (Terraform/OpenTofu runs)
- [ ] Calculate deployment frequency per repo/environment
- [ ] Track deployment success/failure rate per environment

### 3.4 Deployment Dashboard
- [ ] Create `/dashboard/deployments` page
- [ ] Deployment timeline view
- [ ] Environment-based deployment view
- [ ] Deployment frequency chart
- [ ] Add deployment status to Repo Detail page

---

## Phase 4 — DORA Metrics (P1)

**Goal:** Calculate industry-standard engineering metrics.

### 4.1 Metrics Calculation
- [ ] Create `dora_metrics` table:
  - id, tenant_id, repository, period_start, period_end, deployment_frequency, lead_time_for_changes, change_failure_rate, time_to_restore_service
- [ ] Implement deployment frequency calculation (deployments per day/week)
- [ ] Implement lead time calculation (commit timestamp → deployment timestamp)
- [ ] Implement change failure rate (% of deployments causing failure)
- [ ] Implement MTTR from incidents

### 4.2 DORA API
- [ ] `GET /api/dora/metrics` — get DORA metrics with time range
- [ ] `GET /api/dora/metrics/:repo` — per-repo DORA metrics
- [ ] `GET /api/dora/benchmarks` — compare against industry benchmarks

### 4.3 DORA Dashboard
- [ ] Add DORA metrics section to Dashboard
- [ ] Create DORA metrics page with trends
- [ ] Compare against DORA elite/high/medium/low benchmarks
- [ ] Per-repo DORA scorecard

---

## Phase 5 — Infrastructure Automation: OpenTofu (P2)

**Goal:** Integrate OpenTofu for infrastructure provisioning.

### 5.1 OpenTofu Integration
- [ ] Create `infrastructure_projects` table:
  - id, tenant_id, name, path, workspace, environment, engine (opentofu/terraform), last_plan_at, last_apply_at, state_status
- [ ] Create `infrastructure_runs` table:
  - id, project_id, run_type (plan/apply/destroy), status, output, changes_summary, started_at, completed_at, triggered_by
- [ ] Implement OpenTofu CLI wrapper:
  - `tofu init`
  - `tofu plan` (capture output, parse resource changes)
  - `tofu apply` (with approval gate)
  - `tofu destroy` (with confirmation)
  - `tofu state list`
  - `tofu output`
- [ ] Create `/api/infrastructure/opentofu` endpoints
- [ ] Create `/api/infrastructure/opentofu/projects` CRUD
- [ ] Create `/api/infrastructure/opentofu/runs` endpoints
- [ ] Add plan approval workflow
- [ ] Store plan output and parse resource changes

### 5.2 State Management
- [ ] Track state file changes
- [ ] Display current resource inventory
- [ ] State locking integration
- [ ] State history and rollback

### 5.3 Infrastructure Dashboard
- [ ] Create `/dashboard/infrastructure` page
- [ ] Project list with status
- [ ] Run history per project
- [ ] Plan output viewer
- [ ] Resource inventory view

---

## Phase 6 — Infrastructure Automation: Terraform (P2)

**Goal:** Full Terraform support alongside OpenTofu.

### 6.1 Terraform Integration
- [ ] Create Terraform CLI wrapper (similar to OpenTofu):
  - `terraform init`
  - `terraform plan`
  - `terraform apply`
  - `terraform destroy`
  - `terraform state list`
  - `terraform output`
- [ ] Reuse `infrastructure_projects` table with engine=terraform
- [ ] Reuse `infrastructure_runs` table
- [ ] Create `/api/infrastructure/terraform` endpoints
- [ ] Terraform Cloud / HCP Terraform integration (remote runs)
- [ ] Terraform Enterprise integration

### 6.2 Terraform State Integration
- [ ] Support remote backends (S3, GCS, Azure Blob, Terraform Cloud)
- [ ] State file versioning
- [ ] State diff visualization

### 6.3 Terraform Migration Assistant
- [ ] Terraform to OpenTofu migration checker
- [ ] State compatibility verification
- [ ] Provider compatibility checks

---

## Phase 7 — Infrastructure Automation: Pulumi (P2)

**Goal:** Support Pulumi for general-purpose language IaC.

### 7.1 Pulumi Integration
- [ ] Create Pulumi CLI wrapper:
  - `pulumi up` (preview + update)
  - `pulumi preview`
  - `pulumi destroy`
  - `pulumi stack export`
  - `pulumi state`
- [ ] Support languages: TypeScript, Python, Go, C#, Java
- [ ] Create `/api/infrastructure/pulumi` endpoints
- [ ] Stack management
- [ ] Configuration and secret management

### 7.2 Pulumi State Integration
- [ ] Pulumi Cloud backend integration
- [ ] Self-managed backend support (S3, Azure Blob, GCS)
- [ ] Stack references and output sharing

---

## Phase 8 — Configuration Management: Ansible (P2)

**Goal:** Integrate Ansible for server configuration.

### 8.1 Ansible Integration
- [ ] Create `configuration_projects` table:
  - id, tenant_id, name, tool (ansible/chef/puppet/saltstack), inventory_path, playbook_path, last_run_at, environment
- [ ] Create `configuration_runs` table:
  - id, project_id, run_type, status, host_results, output, started_at, completed_at, triggered_by
- [ ] Implement Ansible CLI wrapper:
  - `ansible-playbook` (execute playbook)
  - `ansible-inventory` (list hosts)
  - `ansible ad-hoc` (remote execution)
- [ ] Create `/api/configuration/ansible` endpoints
- [ ] Create `/api/configuration/ansible/projects` CRUD
- [ ] Create `/api/configuration/ansible/runs` endpoints
- [ ] Inventory management (static + dynamic)
- [ ] Playbook execution with approval workflow
- [ ] Host-level result tracking

### 8.2 Ansible Vault Integration
- [ ] Encrypted variable support
- [ ] Vault password management
- [ ] Secret references in playbooks

### 8.3 Configuration Dashboard
- [ ] Create `/dashboard/configuration` page
- [ ] Project list with last run status
- [ ] Run history with host-level results
- [ ] Playbook output viewer

---

## Phase 9 — Configuration Management: Chef & Puppet (P2)

**Goal:** Support Chef and Puppet for enterprise configuration management.

### 9.1 Chef Integration
- [ ] Chef Server API integration
- [ ] Node management
- [ ] Cookbook management
- [ ] Chef Client run monitoring
- [ ] Compliance profiles (InSpec)
- [ ] Create `/api/configuration/chef` endpoints

### 9.2 Puppet Integration
- [ ] Puppet Server / PuppetDB integration
- [ ] Node/agent management
- [ ] Module and manifest management
- [ ] Catalog compilation monitoring
- [ ] Agent run monitoring
- [ ] Compliance reporting
- [ ] Create `/api/configuration/puppet` endpoints

### 9.3 SaltStack Integration
- [ ] Salt Master integration
- [ ] Minion management
- [ ] State management
- [ ] Remote execution
- [ ] Create `/api/configuration/saltstack` endpoints

---

## Phase 10 — Drift Detection (P3)

**Goal:** Detect differences between desired and actual state across all engines.

### 10.1 Infrastructure Drift
- [ ] Create `infrastructure_drift` table:
  - id, project_id, drift_type, expected_state, actual_state, last_change, source_commit, recommended_action, detected_at
- [ ] Scheduled drift detection for all IaC projects
- [ ] Drift detection on webhook events
- [ ] Manual drift check endpoint

### 10.2 Configuration Drift
- [ ] Create `configuration_drift` table:
  - id, project_id, host, resource, expected_state, actual_state, detected_at
- [ ] Ansible `--check` mode integration
- [ ] Chef compliance scan integration
- [ ] Puppet agent run diff integration

### 10.3 Drift Dashboard
- [ ] Drift summary widget on Dashboard
- [ ] Drift detail page with expected vs actual
- [ ] Drift remediation actions
- [ ] Drift history and trends

---

## Phase 11 — Policy Engine (P3)

**Goal:** Policy-driven automation with guardrails.

### 11.1 Policy Framework
- [ ] Create `policies` table:
  - id, tenant_id, name, description, engine, rule_type, rule_config, enabled, created_at
- [ ] Policy types:
  - Approval required for production applies
  - Require successful CI before deployment
  - Require admin approval for destructive operations
  - Audit event on secret access
  - Cost threshold gates
- [ ] Policy evaluation engine
- [ ] Policy enforcement on runs

### 11.2 Policy API
- [ ] `POST /api/policies` — create policy
- [ ] `GET /api/policies` — list policies
- [ ] `PUT /api/policies/:id` — update policy
- [ ] `DELETE /api/policies/:id` — delete policy
- [ ] `GET /api/policies/evaluate` — evaluate policies against a run

### 11.3 Policy Dashboard
- [ ] Policy list page
- [ ] Policy violation history
- [ ] Policy enforcement stats

---

## Phase 12 — Enterprise Features (P4)

**Goal:** Enterprise-grade security and compliance.

### 12.1 Enhanced RBAC
- [ ] Add `operator` and `owner` roles
- [ ] Resource-level permissions
- [ ] Custom role creation
- [ ] Permission inheritance

### 12.2 SSO/SAML
- [ ] Integrate `passport-saml`
- [ ] SSO configuration UI
- [ ] Just-in-time user provisioning
- [ ] Group mapping to roles

### 12.3 Advanced Audit
- [ ] Expanded audit event types
- [ ] Compliance report generation
- [ ] Audit log streaming to external systems
- [ ] Tamper-proof audit storage

---

## Phase 13 — Intelligence Layer (P5)

**Goal:** AI-powered operational intelligence.

### 13.1 Enhanced AI Analysis
- [ ] Feed more context to LLM (commits, PRs, infra changes, deployments)
- [ ] Multi-model support (GPT-4o, Claude 3.5 Sonnet, local models)
- [ ] Analysis confidence scoring
- [ ] Learning from past analyses

### 13.2 Predictive Analytics
- [ ] Failure prediction based on historical patterns
- [ ] Deployment risk scoring
- [ ] Flaky test prediction
- [ ] Anomaly detection in metrics

### 13.3 Automated Remediation
- [ ] Policy-controlled auto-remediation
- [ ] Remediation actions: restart, rerun, rollback, scale
- [ ] Remediation workflow templates
- [ ] All actions auditable

---

## Phase 14 — Additional Integrations

### 14.1 Notification Expansion
- [ ] PagerDuty integration
- [ ] Opsgenie integration
- [ ] Discord integration
- [ ] Google Chat integration
- [ ] Generic webhook notifications

### 14.2 CI/CD Expansion
- [ ] GitLab CI integration
- [ ] Jenkins integration
- [ ] CircleCI integration
- [ ] Azure DevOps integration

### 14.3 Source Control Expansion
- [ ] GitLab webhooks
- [ ] Bitbucket webhooks

---

## Phase 15 — Multi-Tenancy & SaaS (P4)

### 15.1 Tenant Management
- [ ] Tenant management dashboard (admin)
- [ ] Tenant settings page
- [ ] Tenant usage statistics
- [ ] Tenant invitation system

### 15.2 Billing & Subscriptions
- [ ] Stripe integration
- [ ] Usage-based billing
- [ ] Plan management (Free, Pro, Enterprise)
- [ ] Invoice management

---

## Phase 16 — CLI & API Automation

### 16.1 OpsSentinel CLI
- [ ] `opsctl login` — authenticate
- [ ] `opsctl repo list` — list repositories
- [ ] `opsctl workflow list` — list workflows
- [ ] `opsctl workflow run <workflow>` — trigger workflow
- [ ] `opsctl incident list` — list incidents
- [ ] `opsctl tofu plan` — run OpenTofu plan
- [ ] `opsctl ansible run <playbook>` — run Ansible playbook

### 16.2 API Automation
- [ ] Complete REST API documentation (OpenAPI/Swagger)
- [ ] API key authentication
- [ ] Rate limiting per API key
- [ ] Webhook management UI

---

## Phase 17 — Observability & Self-Monitoring

### 17.1 Metrics
- [ ] API latency metrics
- [ ] Webhook processing latency
- [ ] Queue depth
- [ ] Database performance
- [ ] Notification latency

### 17.2 OpenTelemetry
- [ ] Distributed tracing
- [ ] Prometheus metrics export
- [ ] Grafana dashboard templates

---

## Implementation Priority Summary

```
Phase 0:  Critical Bugs & Security     ✅ DONE
Phase 1:  CI/CD Intelligence Core      🔴 START HERE
Phase 2:  Incident Management          🔴 HIGH PRIORITY
Phase 3:  Deployment Tracking          🔴 HIGH PRIORITY
Phase 4:  DORA Metrics                 🔴 HIGH PRIORITY
Phase 5:  OpenTofu Integration         🟡 MEDIUM
Phase 6:  Terraform Integration        🟡 MEDIUM
Phase 7:  Pulumi Integration           🟡 MEDIUM
Phase 8:  Ansible Integration          🟡 MEDIUM
Phase 9:  Chef & Puppet Integration    🟡 MEDIUM
Phase 10: Drift Detection              🟡 MEDIUM
Phase 11: Policy Engine                🟢 LOWER
Phase 12: Enterprise Features          🟢 LOWER
Phase 13: Intelligence Layer           🟢 LOWER
Phase 14: Additional Integrations      🟢 LOWER
Phase 15: Multi-Tenancy & SaaS         🟢 LOWER
Phase 16: CLI & API Automation         🟢 LOWER
Phase 17: Observability & Self-Monitoring 🟢 LOWER
```

---

## Estimated Timeline

| Phase | Description | Effort | Priority |
|-------|-------------|--------|----------|
| Phase 1 | CI/CD Intelligence Core | 2-3 weeks | P0 |
| Phase 2 | Incident Management | 2-3 weeks | P1 |
| Phase 3 | Deployment Tracking | 2 weeks | P1 |
| Phase 4 | DORA Metrics | 1-2 weeks | P1 |
| Phase 5 | OpenTofu Integration | 2-3 weeks | P2 |
| Phase 6 | Terraform Integration | 2 weeks | P2 |
| Phase 7 | Pulumi Integration | 2 weeks | P2 |
| Phase 8 | Ansible Integration | 2-3 weeks | P2 |
| Phase 9 | Chef & Puppet | 2-3 weeks | P2 |
| Phase 10 | Drift Detection | 2 weeks | P3 |
| Phase 11 | Policy Engine | 2 weeks | P3 |
| Phase 12 | Enterprise Features | 3-4 weeks | P4 |
| Phase 13 | Intelligence Layer | 3-4 weeks | P5 |
| Phase 14 | Additional Integrations | 2-3 weeks | P4 |
| Phase 15 | Multi-Tenancy & SaaS | 2-3 weeks | P4 |
| Phase 16 | CLI & API | 2 weeks | P4 |
| Phase 17 | Observability | 1-2 weeks | P5 |

**Total estimated effort: 35-47 weeks (9-12 months)**
