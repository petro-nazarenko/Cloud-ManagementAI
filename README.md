# Cloud ManagementAI

[![CI](https://github.com/petro-nazarenko/Cloud-ManagementAI/actions/workflows/ci.yml/badge.svg)](https://github.com/petro-nazarenko/Cloud-ManagementAI/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Enabled-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform&logoColor=white)](https://www.terraform.io/)

Cloud ManagementAI is an AI-powered cloud management platform that provides a suite of tools for optimizing and automating cloud infrastructure across AWS, Azure, and Google Cloud Platform.

## Overview

Cloud engineers and DevOps teams face numerous challenges managing cloud infrastructure — from cost optimization and automation to monitoring and incident response. Cloud ManagementAI centralizes these workflows into a single platform powered by analytics and intelligent recommendations.

### Key Features

- **Multi-cloud resource management** — Unified view of AWS, Azure, and GCP resources
- **Cost analytics & optimization** — Usage tracking, cost breakdowns, and AI-driven recommendations
- **Automated deployments** — Terraform + Ansible-based infrastructure automation
- **Real-time monitoring** — Prometheus metrics and Grafana dashboards
- **Secure REST API** — JWT-authenticated backend with rate limiting
- **Containerized & orchestrated** — Docker Compose for local development, Kubernetes for production

---

## Project Structure

```
Cloud-ManagementAI/
├── backend/                    # Node.js/Express REST API
│   ├── src/
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # AWS, Azure, GCP integrations + metrics
│   │   ├── tests/              # Jest test suite
│   │   └── utils/              # Logger and helpers
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── components/         # Layout, MetricCard
│   │   ├── context/            # Auth context
│   │   ├── pages/              # Dashboard, Resources, Analytics, Providers, Settings, Login
│   │   └── services/           # Axios API client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── aws/            # EKS, VPC, RDS, S3
│   │   │   ├── azure/          # AKS, VNet, PostgreSQL
│   │   │   └── gcp/            # GKE, VPC, Cloud SQL
│   │   └── environments/
│   │       ├── dev/            # Dev environment
│   │       └── prod/           # Production (multi-cloud)
│   └── ansible/
│       ├── playbooks/          # Deploy, monitoring, Kubernetes setup
│       ├── roles/              # Docker, monitoring roles
│       └── inventory/          # Host inventory
├── kubernetes/
│   ├── backend/                # Deployment, Service, HPA
│   ├── frontend/               # Deployment, Service
│   ├── monitoring/             # Prometheus, Grafana deployments
│   ├── ingress.yaml
│   └── namespace.yaml
├── monitoring/
│   ├── prometheus/             # prometheus.yml, alert rules
│   └── grafana/                # Dashboards, datasources, provisioning
└── docker-compose.yml          # Full local stack
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Material UI 5, Recharts, React Router 6 |
| Backend | Node.js 20, Express 4, JWT auth, Joi validation |
| Cloud SDKs | AWS SDK v2, Azure ARM Resources, GCP Resource Manager |
| Metrics | Prometheus (prom-client), Grafana |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (EKS / AKS / GKE) |
| IaC | Terraform (AWS, Azure, GCP modules) |
| Automation | Ansible playbooks and roles |
| Logging | Winston |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.20+
- [Node.js](https://nodejs.org/) 20+ (for local development without Docker)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for Kubernetes deployments)
- [Terraform](https://developer.hashicorp.com/terraform/downloads) 1.6+ (for infrastructure provisioning)
- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/) 2.15+ (for automation playbooks)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/petro-nazarenko/Cloud-ManagementAI.git
cd Cloud-ManagementAI
```

### 2. Create the environment file

Create a `.env` file in the project root. The application validates that secrets are non-default in production, so **do not reuse the example values**:

```bash
cat > .env <<'EOF'
# Database
DB_NAME=cloudmgmt
DB_USER=cloudmgmt_admin
DB_PASSWORD=<strong-db-password>

# Security
JWT_SECRET=<64-char-hex-string>
ENCRYPTION_KEY=<64-char-hex-string>

# CORS (set to the URL where the frontend will be opened)
CORS_ORIGIN=http://localhost:3000

# API URL used by the frontend build (use /api for same-origin via nginx proxy)
REACT_APP_API_URL=/api

# Grafana
GRAFANA_ADMIN_PASSWORD=<grafana-password>
EOF
```

Generate secure values:
```bash
openssl rand -hex 32   # use twice — once for JWT_SECRET, once for ENCRYPTION_KEY
```

### 3. Start the full stack with Docker Compose

```bash
docker-compose up -d
```

This starts:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 (also proxied via `/api` on port 3000) |
| Backend Worker | background queue worker |
| Redis | localhost:6379 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 |

To stop: `docker-compose down`

---

## Local Development (without Docker)

### Backend

```bash
cd backend
npm install
cp .env.example .env          # Edit with your settings
npm run migrate                # Apply DB migrations
npm run dev                    # Starts with nodemon on :3001
```

Optional: run the worker separately in local mode
```bash
cd backend
npm run worker
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # Set REACT_APP_API_URL=http://localhost:3001
npm start                      # Starts on :3000
```

---

## API Reference

All API endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT token |
| POST | `/api/auth/refresh` | Refresh access token |

A default admin account is seeded on first startup:
- **Email:** `admin@example.com`
- **Password:** `admin1234`

**Login example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin1234"}'
```

### Resources

All resource endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/resources` | List all cloud resources |
| POST | `/api/resources` | Create a new resource |
| GET | `/api/resources/:id` | Get a specific resource |
| PUT | `/api/resources/:id` | Update a resource |
| DELETE | `/api/resources/:id` | Delete a resource |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/costs` | Monthly cost breakdown by provider |
| POST | `/api/analytics/costs/refresh` | Queue cost-sync job |
| GET | `/api/analytics/usage` | Resource utilization metrics |
| GET | `/api/analytics/recommendations` | AI-driven optimization recommendations |
| POST | `/api/analytics/recommendations/refresh` | Queue recommendation refresh job |
| GET | `/api/analytics/jobs/:jobId` | Check queued analytics job status |

### Cloud Providers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/providers` | List configured providers |
| GET | `/api/providers/health` | Get provider health (cached when available) |
| POST | `/api/providers/health/refresh` | Queue provider health refresh |
| GET | `/api/providers/health/jobs/:jobId` | Check provider health job status |
| GET | `/api/providers/:name/resources` | List resources from a provider |
| POST | `/api/providers/:name/deploy` | Deploy a resource to a provider |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics (plain text) |

---

## Running Tests

### Backend tests

```bash
cd backend
npm test                      # Run with coverage
npm test -- --watchAll        # Watch mode
```

---

## Kubernetes Deployment

### Prerequisites

A running Kubernetes cluster (EKS, AKS, GKE, or local with kind/minikube).

### Deploy

```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Deploy backend
kubectl apply -f kubernetes/backend/

# Deploy frontend
kubectl apply -f kubernetes/frontend/

# Deploy monitoring stack
kubectl apply -f kubernetes/monitoring/

# Deploy ingress
kubectl apply -f kubernetes/ingress.yaml
```

### Check status

```bash
kubectl get pods -n cloud-management
kubectl get services -n cloud-management
kubectl get ingress -n cloud-management
```

To verify queue flow after deployment:
```bash
# Queue recommendation refresh
curl -X POST http://<backend-host>/api/analytics/recommendations/refresh \
  -H "Authorization: Bearer <token>"

# Poll job status using returned job.id
curl http://<backend-host>/api/analytics/jobs/<jobId> \
  -H "Authorization: Bearer <token>"
```

---

## Infrastructure Provisioning (Terraform)

### AWS (dev environment)

```bash
cd infrastructure/terraform/environments/dev

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Production (multi-cloud)

```bash
cd infrastructure/terraform/environments/prod

# Set required variables
export TF_VAR_aws_region=us-east-1
export TF_VAR_azure_location=eastus
export TF_VAR_gcp_project=my-project-id

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

> **Note:** Review `terraform.tfvars` in each environment directory and set sensitive values (passwords, keys) via environment variables or a secrets manager — never commit them to version control.

---

## Automation (Ansible)

### Deploy the application

```bash
cd infrastructure/ansible

# Edit inventory
vim inventory/hosts.yml

# Run full deployment
ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml

# Configure monitoring only
ansible-playbook -i inventory/hosts.yml playbooks/configure_monitoring.yml

# Set up Kubernetes
ansible-playbook -i inventory/hosts.yml playbooks/setup_kubernetes.yml
```

---

## Monitoring & Alerting

### Prometheus

Prometheus scrapes metrics from:
- Backend API (`/metrics` endpoint)
- Node Exporter (host metrics)
- cAdvisor (container metrics)

Alert rules are defined in `monitoring/prometheus/alert_rules.yml` and cover:
- High CPU / Memory usage
- Backend service down
- High HTTP error rate
- Slow API response times

### Grafana

The pre-provisioned dashboard (`monitoring/grafana/dashboards/cloud-management.json`) includes:
- API Request Rate
- Error Rate
- Response Time (P95)
- Active Resources (CPU/Memory)
- Cost Trend

Access Grafana at http://localhost:3002 with credentials `admin/<GRAFANA_ADMIN_PASSWORD>` (set in `.env`).

---

## Environment Variables

### Backend (`backend/.env`)

All variables are set in the root `.env` file and picked up by Docker Compose.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_NAME` | No | `cloudmgmt` | Postgres database name |
| `DB_USER` | No | `cloudmgmt_admin` | Postgres user |
| `DB_PASSWORD` | **Yes (prod)** | — | Postgres password (must not be `changeme` in production) |
| `JWT_SECRET` | **Yes (prod)** | — | 256-bit hex secret for JWT signing |
| `ENCRYPTION_KEY` | **Yes (prod)** | — | 64-char hex key for field encryption |
| `CORS_ORIGIN` | **Yes (prod)** | — | Comma-separated allowed origins |
| `REACT_APP_API_URL` | No | `/api` | API base URL baked into the frontend build |
| `GRAFANA_ADMIN_PASSWORD` | No | `changeme` | Grafana admin password |
| `AWS_ACCESS_KEY_ID` | No | — | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | No | — | AWS credentials |
| `AWS_DEFAULT_REGION` | No | `us-east-1` | AWS region |
| `AZURE_SUBSCRIPTION_ID` | No | — | Azure subscription |
| `AZURE_TENANT_ID` | No | — | Azure tenant |
| `AZURE_CLIENT_ID` | No | — | Azure service principal |
| `AZURE_CLIENT_SECRET` | No | — | Azure service principal secret |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | — | Path to GCP credentials JSON |

> **Note:** `REACT_APP_API_URL=/api` is recommended — the nginx proxy on port 3000 forwards `/api/*` to the backend, avoiding CORS issues regardless of the deployment URL (local, Codespace, or custom domain).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

This project is licensed under the MIT License.

