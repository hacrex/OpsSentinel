# OpenObserve Codebase Improvements — TODO

**Source:** [openobserve/openobserve](https://github.com/openobserve/openobserve)
**Generated:** 2026-11-10
**Purpose:** Track suggested improvements for adding/embedding observability into your product, using OpenObserve as reference architecture.

---

## 1. Architecture Snapshot (for context)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language / Runtime | Rust 2024 edition, Tokio | Single binary, memory-safe |
| API | Axum (HTTP), Tonic (gRPC) | REST + OTLP ingestion |
| Storage | Parquet + Object Store (S3/Azure/GCP) + Tantivy | Columnar, 140× lower cost claim |
| Query Engine | DataFusion + Arrow + SQLParser | SQL for logs/traces, PromQL for metrics |
| Metadata DB | Sea-ORM (SQLite/PostgreSQL) | Orgs, users, dashboards, alerts |
| Ingestion | WAL + Ingester + Compaction | Write-ahead log → Parquet |
| Frontend | TypeScript/React (`web/`) | Logs, traces, dashboards, RUM |
| Enterprise | `#[cfg(feature = "enterprise")]` | SSO, RBAC, audit, redaction, federated search |
| AI / LLM | rquickjs, tiktoken-rs, MCP | AI assistant, LLM evals, agent tools |

**Monolithic files to watch:** `users.rs` (106 KB), `anomaly_detection.rs` (362 KB), `downtimes.rs` (118 KB), `trial_quota.rs` (120 KB), `organization.rs` (67 KB).

---

## 2. Code Maintainability (High Priority)

- [ ] **Split monolithic source files**
  - Break `src/core/src/users.rs` into domain submodules (auth, profile, org-membership, SCIM, API keys)
  - Break `src/core/src/anomaly_detection.rs` into detector/rule/alert submodules
  - Break `src/core/src/downtimes.rs`, `src/core/src/trial_quota.rs`, `src/core/src/organization.rs` similarly

- [ ] **Replace `anyhow` with typed errors**
  - Many functions return `anyhow::Error`
  - Migrate to `thiserror` / `snafu` (already in Cargo.toml) for structured error enums
  - Enables caller-side pattern matching and better API contracts

- [ ] **Extract enterprise code behind trait interface**
  - Reduce pervasive `#[cfg(feature = "enterprise")]` in core
  - Define traits in core, implement in enterprise crate
  - Makes OSS core easier to reason about and test

- [ ] **Add Architectural Decision Records (ADRs)**
  - Why DataFusion over raw SQL
  - Why Tantivy (vs quickwit) for full-text
  - Why three separate Tokio runtimes (job / gRPC / HTTP)
  - Why Parquet + S3-native design

---

## 3. Performance (High Priority)

- [ ] **Re-evaluate multi-runtime design**
  - Three Tokio runtimes coordinated via `oneshot` channels (`src/main.rs`)
  - Option A: Unify into one runtime with dedicated thread pools (CPU vs I/O)
  - Option B: Document the isolation rationale clearly in `AGENTS.md` / docs
  - Watch for head-of-line blocking if one runtime stalls

- [ ] **Expand query result caching**
  - `src/core/src/cache.rs` is only 985 bytes — minimal
  - Add LRU/TinyLFU cache for repeated SQL/PromQL queries with TTL
  - Invalidate on new ingestion per stream/org

- [ ] **Enable DataFusion predicate pushdown verification**
  - Ensure scans skip Parquet row groups where possible
  - Expose `EXPLAIN ANALYZE` in the UI/query editor

- [ ] **Memory-mapped reads for hot partitions**
  - `mmap` local cache for frequently accessed recent data
  - Avoids S3 round-trips for hot streams

---

## 4. Observability of OpenObserve Itself (High Priority)

- [ ] **Internal slow-query log**
  - Log queries exceeding configurable threshold (duration, rows scanned, bytes read)
  - Include user/org context and stack traces
  - Surface in admin dashboard

- [ ] **Per-tenant resource quotas**
  - CPU / memory / query concurrency limits per organization
  - Enterprise QoS exists; make it more granular and configurable via UI

- [ ] **End-to-end distributed tracing**
  - Propagate `traceparent` from ingestion → storage → query → response
  - Enables SREs to debug a single customer request across the pipeline

- [ ] **Health check endpoints**
  - `/live` — process is running
  - `/ready` — can serve requests
  - `/deep-health` — checks S3 connectivity, DB migration status, WAL lag, compaction queue depth

---

## 5. Security & Compliance (High Priority)

- [ ] **Record-level redaction / tombstoning**
  - Data is immutable per FAQ (cannot edit/delete individual records)
  - Add soft-delete/tombstone layer at query layer so PII is excluded from search results
  - Required for GDPR right-to-erasure and HIPAA

- [ ] **Secret scanning at ingest**
  - Detect and redact AWS keys, DB passwords, JWTs, private keys at ingestion time
  - Leverage existing VRL pipeline transforms; add built-in PII/secret detectors

- [ ] **Immutable audit trails**
  - Enterprise audit logs should be append-only (WAL or signed entries)
  - Prevents tampering for compliance audits (SOC 2, ISO 27001)

- [ ] **Input validation hardening**
  - DataFusion parameterized queries protect against SQL injection
  - Sandbox custom VRL transforms and user-defined functions
  - Validate stream schemas on ingest; route mismatches to dead-letter stream

---

## 6. Multi-Tenancy & Isolation (Medium Priority)

- [ ] **Storage-level tenant prefixes**
  - Enforce S3 key prefixes per org (defense in depth beyond SQL `WHERE` clauses)
  - Prevents accidental cross-org object reads

- [ ] **Query timeout per tenant**
  - Org admins set max query duration and result row limits
  - Prevents noisy-neighbor queries from starving the cluster

- [ ] **Stream-level schema enforcement**
  - Reject or quarantine ingested logs that don't match declared stream schema

---

## 7. Frontend / UX (Medium Priority)

- [ ] **Internal design system / component library**
  - Extract shared UI components (tables, filters, date pickers, chart wrappers)
  - Reduce duplication across logs, traces, dashboards, RUM pages

- [ ] **Bundle size optimization**
  - Code-split by route (logs vs traces vs dashboards)
  - Lighter initial load for single-purpose users

- [ ] **Visual query builder**
  - SQL/PromQL builder with autocomplete and schema discovery
  - Addresses the learning curve mentioned in OpenObserve FAQ

- [ ] **Offline / local-first mode**
  - Cache dashboards and recent queries in IndexedDB
  - View during platform outages

---

## 8. Operations & Deployment (Medium Priority)

- [ ] **Backup / restore CLI tool**
  - Export org metadata + point-in-time Parquet snapshots from S3
  - `o2ctl backup` / `o2ctl restore` commands

- [ ] **Zero-downtime upgrade runbook**
  - Document rolling upgrade procedure for HA clusters
  - Current `src/main.rs` shows coordinated shutdown across runtimes — formalize it

- [ ] **Infrastructure-as-Code provider**
  - Terraform / Pulumi provider for orgs, streams, dashboards, alerts
  - Manage observability as code

- [ ] **Disaster recovery runbook**
  - Document RPO/RTO testing for S3-backed stateless architecture

---

## 9. AI / LLM Observability (Emerging / Optional)

- [ ] **LLM evaluation & hallucination scoring**
  - Store eval results alongside traces; alert on score drops

- [ ] **Prompt injection detection**
  - Scan user inputs and model outputs at ingest time

- [ ] **Semantic search over traces**
  - Vector embeddings of trace spans for natural-language incident search

---

## 10. Prioritized Roadmap (First 3 Months)

### Month 1 — Stability & Maintainability
| # | Task | Effort | Owner |
|---|------|--------|-------|
| 1.1 | Split `users.rs` into submodules | Medium | Backend |
| 1.2 | Split `anomaly_detection.rs` | Medium | Backend |
| 1.3 | Replace `anyhow` with typed errors in core APIs | Medium | Backend |
| 1.4 | Internal slow-query log | Low | Backend |
| 1.5 | Health check endpoints (`/live`, `/ready`, `/deep-health`) | Low | Backend |

### Month 2 — Security & Compliance
| # | Task | Effort | Owner |
|---|------|--------|-------|
| 2.1 | PII tombstoning at query layer | High | Backend + Security |
| 2.2 | Secret redaction at ingest (VRL built-ins) | Medium | Backend |
| 2.3 | Immutable audit trail (append-only WAL) | Medium | Enterprise |
| 2.4 | Storage-level tenant prefixes | Low | Backend |

### Month 3 — Performance & Ops
| # | Task | Effort | Owner |
|---|------|--------|-------|
| 3.1 | Query result cache with TTL | Medium | Backend |
| 3.2 | Per-tenant query quotas and timeouts | Medium | Backend |
| 3.3 | Backup / restore CLI | Medium | DevOps |
| 3.4 | Terraform provider (orgs, streams, dashboards) | Medium | Platform |

---

## 11. How to Use This File

1. Copy this file into your product repo (e.g., `docs/observability-todo.md` or `OBSERVABILITY_TODO.md`)
2. Assign owners and due dates to each checkbox
3. Move completed items to a `## Done` section at the bottom
4. Review weekly during sprint planning

---

## 12. Done

_(Move completed items here with date)_

---