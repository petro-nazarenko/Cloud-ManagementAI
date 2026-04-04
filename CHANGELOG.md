# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Migrate AWS SDK v2 → v3 (`@aws-sdk/*`)
- Increase backend test coverage to ≥ 80 % (branches currently 43 %)
- Add frontend unit tests (React Testing Library)
- Real AWS Cost Explorer integration (replace fallback mock in `analyticsController`)
- Real Azure Cost Management API integration
- Real GCP Billing API integration
- `viewer` RBAC read permissions (currently empty — viewers can only hit public routes)
- OpenAPI / Swagger documentation auto-generated from routes
- External Secrets Operator integration for Kubernetes
- Database backup / restore Ansible role
- ML-based cost anomaly detection
- Predictive scaling recommendations
- Natural-language query interface for cloud resources

---

## [1.0.0] — 2026-04-04

### Added

#### Backend (Node.js 20 / Express 4)
- REST API with JWT authentication (access token 1 h, refresh token 7 d)
- Strict production config validation — rejects default `JWT_SECRET`, `DB_PASSWORD`, `ENCRYPTION_KEY`
- CORS locked to allowlist in production; permissive in development
- Rate limiting: auth routes 20 req / 15 min, general API 200 req / 15 min (via `express-rate-limit`)
- `helmet` HTTP security headers
- Role-based access control middleware (`admin` / `operator` / `viewer`) with granular permission map
- Audit-log middleware writing every mutating 2xx request to `audit_logs` table
- Full CRUD for cloud resources (`/api/resources`)
- Analytics endpoints: costs snapshot, usage metrics, AI recommendations (`/api/analytics/*`)
- Cloud provider endpoints: resource listing, health check, deploy (`/api/providers/*`)
- User management (`/api/users/*`) and admin panel (`/api/admin/*`)
- Audit log query API with pagination and filtering (`/api/audit/*`)
- BullMQ async job queue backed by Redis with inline (in-process) fallback for test / no-Redis environments
- Three background jobs: `recommendation-refresh`, `provider-health-refresh`, `cost-sync`
- Dedicated queue worker process (`npm run worker`)
- Result cache layer (`queue/resultCache.js`) with TTL
- Rule-based recommendation engine (idle compute, stopped compute, high memory, cold storage)
- Prometheus metrics endpoint (`/metrics`) via `prom-client` with HTTP duration histogram
- Winston structured logger with `http`, `info`, `warn`, `error` levels
- Sequelize ORM + Umzug migrations; single migration `20260403213000-initial-schema.js`
- Auto-seed: default admin account + demo resources + demo recommendations (skipped in production unless `ENABLE_DEMO_SEEDING=true`)
- Health-check endpoint (`/health`) for Docker / Kubernetes probes

#### Frontend (React 18 / Material UI 5)
- Dashboard with metric cards and cost-trend chart (Recharts)
- Resources page with provider/status/type filtering
- Analytics page: cost breakdown by provider, usage metrics, recommendations list
- Cloud providers page with real-time health status
- Audit log page with pagination
- Settings page (profile, notifications, cloud credentials, display)
- Login page with JWT auth flow
- `AuthContext` for token storage and automatic refresh
- Axios API client with Bearer token injection and 401 auto-logout
- React Router 6 with protected routes
- Responsive layout via Material UI

#### Infrastructure
- Terraform modules: AWS (EKS, VPC, RDS, S3), Azure (AKS, VNet, PostgreSQL), GCP (GKE, VPC, Cloud SQL)
- Terraform environments: `dev` (AWS only) and `prod` (multi-cloud)
- Ansible playbooks: `deploy.yml`, `configure_monitoring.yml`, `setup_kubernetes.yml`
- Ansible roles: `docker`, `monitoring`

#### Kubernetes
- Namespace `cloud-management`
- Backend Deployment (3 replicas, rolling update, non-root securityContext) + HPA (2–10 pods, CPU/memory)
- Backend Worker Deployment + HPA
- Redis StatefulSet with PVC
- Frontend Deployment + Service
- Prometheus Deployment + ConfigMap
- Grafana Deployment
- Nginx Ingress with TLS termination placeholder
- Kubernetes Secrets placeholders with inline documentation and generation commands

#### Monitoring
- Prometheus scrape config (backend API, Node Exporter, cAdvisor)
- Alert rules: high CPU/memory, backend down, high HTTP error rate, slow response times
- Grafana provisioned datasource + dashboard (API rate, error rate, P95 latency, active resources, cost trend)

#### DevOps / CI
- Multi-stage Dockerfiles (build → production) for backend and frontend
- Docker Compose full local stack: postgres, redis, backend, backend-worker, frontend, prometheus, grafana
- Segregated Docker networks: `cloud-mgmt-backend`, `cloud-mgmt-frontend`, `cloud-mgmt-monitoring`
- GitHub Actions CI: backend tests with coverage, frontend tests, frontend build, Docker build & push to GHCR

#### Testing
- Jest + Supertest backend test suite
- Test coverage (as of 2026-04-04): statements 60.55 %, branches 43.05 %, functions 55.77 %, lines 62.04 %
- Tests: `admin`, `analytics`, `config`, `resources`

---

## Audit Notes — 2026-04-04

### Security findings (all low/informational)
| # | Location | Finding | Status |
|---|---|---|---|
| 1 | `backend/src/services/awsService.js` | AWS SDK v2 is end-of-life; migrate to v3 | Open |
| 2 | `backend/src/controllers/authController.js` L19 | Default admin seed (`admin@example.com` / `admin1234`) must be rotated on first login | Open |
| 3 | `kubernetes/secrets.yaml` | Placeholder `stringData` values — documented with warnings, must not be applied as-is | By-design |
| 4 | `docker-compose.yml` L111 | `ENCRYPTION_KEY` falls back to deterministic hex in dev; production validation blocks this | By-design |

### Quality findings
| # | Location | Finding | Priority |
|---|---|---|---|
| 1 | `src/controllers/analyticsController.js` | `getUsage()` returns hardcoded mock data | Medium |
| 2 | `src/controllers/analyticsController.js` | `getCosts()` merges cached + fallback mock | Medium |
| 3 | `middleware/permissions.js` | `viewer` role has zero permissions; read-only access not implemented | Medium |
| 4 | `tests/` | Branch coverage 43 % — queue paths, error branches, provider flows untested | High |
| 5 | `frontend/src/` | No unit tests in frontend | Medium |

[Unreleased]: https://github.com/petro-nazarenko/Cloud-ManagementAI/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/petro-nazarenko/Cloud-ManagementAI/releases/tag/v1.0.0
