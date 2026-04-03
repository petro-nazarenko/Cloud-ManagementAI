# Cloud ManagementAI

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

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set at minimum:
```env
JWT_SECRET=your-strong-secret-key-here
PORT=3001
NODE_ENV=development
```

### 3. Start the full stack with Docker Compose

```bash
docker-compose up -d
```

This starts:
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Backend Worker | background queue worker |
| Redis | localhost:6379 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3002 (admin/admin) |

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

**Login example:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
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

Access Grafana at http://localhost:3002 with credentials `admin/admin` (change on first login).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 24h) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials |
| `AWS_REGION` | No | AWS region |
| `AZURE_SUBSCRIPTION_ID` | No | Azure subscription |
| `AZURE_TENANT_ID` | No | Azure tenant |
| `AZURE_CLIENT_ID` | No | Azure service principal |
| `AZURE_CLIENT_SECRET` | No | Azure service principal secret |
| `GCP_PROJECT_ID` | No | GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | Path to GCP credentials JSON |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | No | Backend base URL (default: http://localhost:3001) |

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

