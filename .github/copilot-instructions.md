---
applyTo: "**"
---

# Cloud ManagementAI — Agent Instructions

## Project Overview

Cloud ManagementAI is an AI-powered multi-cloud management platform (AWS / Azure / GCP).

- **Backend**: Node.js 20 + Express 4, Sequelize ORM (PostgreSQL), BullMQ (Redis), JWT auth
- **Frontend**: React 18 + Material UI 5 + Recharts, React Router 6
- **Infrastructure**: Terraform (AWS EKS/RDS/S3, Azure AKS/VNet, GCP GKE), Ansible, Kubernetes
- **Monitoring**: Prometheus + Grafana
- **CI**: GitHub Actions (`.github/workflows/ci.yml`)

---

## Directory Map

```
backend/src/
  controllers/   — request handlers (business logic)
  middleware/    — auth.js, authorize.js, auditLogger.js, errorHandler.js, permissions.js
  models/        — Sequelize models: User, Resource, Recommendation, AuditLog
  queue/         — BullMQ queue, inline fallback, result cache, job names
  jobs/          — costSyncJob, providerHealthRefreshJob, recommendationRefreshJob
  routes/        — Express routers
  services/      — awsService, azureService, gcpService, costService, metricsService, recommendationEngine
  utils/         — config.js (validateConfig), db.js, logger.js, providerHealth.js
  workers/       — queueWorker.js (standalone process)
  tests/         — Jest + Supertest

frontend/src/
  components/    — Layout.js, MetricCard.js
  context/       — AuthContext.js
  pages/         — Dashboard, Resources, Analytics, Providers, AuditLog, Settings, Login
  services/      — Axios API client (api.js)

infrastructure/
  terraform/environments/dev|prod
  terraform/modules/aws|azure|gcp
  ansible/playbooks/ + roles/ + inventory/

kubernetes/
  backend/ frontend/ monitoring/  — Deployments, HPAs, Services
  ingress.yaml  namespace.yaml  secrets.yaml

monitoring/
  prometheus/prometheus.yml  alert_rules.yml
  grafana/dashboards/  provisioning/
```

---

## Coding Conventions

### General
- All JS files begin with `'use strict';`
- CommonJS (`require` / `module.exports`) — no ESM in backend
- Errors are passed to Express `next(err)` for centralized `errorHandler`
- Never swallow errors silently; always log via Winston (`logger`) before passing forward
- Never log secrets or full request bodies containing credentials

### Security (OWASP Top 10 compliance required)
- **Authentication**: All protected routes use `authenticate` middleware followed by `authorize` (permission check)
- **RBAC**: Add new permissions to `middleware/permissions.js` BEFORE using them; add to `ROLE_PERMISSIONS` for each relevant role
- **Secret handling**: Use `process.env.*` only — never hardcode secrets. The `validateConfig()` call on startup enforces this in production
- **Input validation**: Use `Joi` schemas at the route/controller level for all user-supplied data
- **SQL**: Use Sequelize ORM methods only — no raw queries unless unavoidable. Parameterize if raw
- **CORS**: Do not widen `allowedOrigins` without explicit product requirement
- **Audit logging**: Every mutating route (`POST/PUT/PATCH/DELETE`) must call `auditLogger(action, resource)` middleware
- **Kubernetes secrets**: Never commit real values to `kubernetes/secrets.yaml` — keep placeholders only

### Queue / Jobs
- Long-running operations go into BullMQ jobs (enqueue via `analyticsQueue.js`)
- Provide an inline (in-process) handler in `inlineHandlers` map for test compatibility
- Job results are cached via `setLatestJobResult` with a TTL

### Testing
- Test files live in `backend/src/tests/`
- Use `supertest` for HTTP-level tests; use SQLite (`NODE_ENV=test`) — never PostgreSQL in tests
- Reset DB state per suite with `sync({ force: true })`
- Target: **≥ 80 % statements AND branches** (current: 60 % / 43 %)
- No `console.log` in test files — use silent Jest environment

### Frontend
- API calls go through `frontend/src/services/api.js` (Axios instance) — never use `fetch` directly
- Auth token read from `AuthContext` — no direct `localStorage` access outside context
- MUI components are preferred over raw HTML/CSS

---

## Known Technical Debt (priority order)

| Priority | Area | Task |
|---|---|---|
| 🔴 High | `backend/src/tests/` | Raise branch coverage from 43 % to ≥ 80 % |
| 🔴 High | `backend/src/services/awsService.js` | Migrate AWS SDK v2 → v3 (`@aws-sdk/*`) |
| 🟠 Medium | `analyticsController.js` | Replace fallback mock costs/usage with real AWS Cost Explorer + Azure Cost Management + GCP Billing calls |
| 🟠 Medium | `middleware/permissions.js` | Add read-only permissions to `viewer` role |
| 🟠 Medium | `frontend/src/` | Add unit tests (React Testing Library + Jest) |
| 🟡 Low | `routes/` + `controllers/` | Generate OpenAPI/Swagger docs from code |
| 🟡 Low | `kubernetes/` | Integrate External Secrets Operator |
| 🟡 Low | `infrastructure/ansible/` | Database backup/restore automation role |

---

## Running the Project

```bash
# Full local stack (Docker Compose)
cp .env.example .env   # edit secrets first
docker-compose up -d

# Backend tests
cd backend && npm test

# Backend dev server
cd backend && npm run dev

# Worker process
cd backend && npm run worker

# Frontend dev server
cd frontend && npm start
```

Services: Frontend http://localhost:3000 · Backend API http://localhost:3001 · Prometheus http://localhost:9090 · Grafana http://localhost:3002

---

## Environment Variables (minimum for dev)

```env
DB_PASSWORD=anyvalue
JWT_SECRET=any64charhex
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CORS_ORIGIN=http://localhost:3000
REACT_APP_API_URL=/api
```

Production validation (`validateConfig()`) enforces non-default values for all four above.

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for full version history and audit notes.

---

## Next Milestone Targets

1. **v1.1.0** — AWS SDK v3 migration + test coverage ≥ 80 %
2. **v1.2.0** — Real cloud billing API integrations (AWS Cost Explorer, Azure Cost Management, GCP Billing)
3. **v1.3.0** — Viewer RBAC + OpenAPI docs + frontend tests
4. **v2.0.0** — ML anomaly detection, predictive scaling, natural-language resource queries
