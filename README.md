# Cloud-ManagementAI
# ☁️ Cloud ManagementAI

Cloud ManagementAI is a cloud management platform that provides a suite of tools for optimizing and automating cloud infrastructure.

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python · FastAPI · Uvicorn        |
| Frontend  | React 18 · TypeScript · Vite      |
| Container | Docker · Docker Compose · Nginx   |

## Project Structure

```
.
├── backend/                  # FastAPI application
│   ├── main.py               # App entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── api/routes/       # Route handlers
│       ├── core/             # Config & settings
│       ├── models/           # Data models
│       └── services/         # Business logic
├── frontend/                 # React + TypeScript (Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── .gitignore
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (optional)

### Local Development

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env
uvicorn main:app --reload
```

API available at <http://localhost:8000>  
Interactive docs at <http://localhost:8000/docs>

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at <http://localhost:5173>

### Docker (full stack)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: <http://localhost>
- Backend API: <http://localhost:8000>

## API Endpoints

| Method | Path              | Description        |
|--------|-------------------|--------------------|
| GET    | `/`               | Root welcome       |
| GET    | `/api/v1/health`  | Health check       |

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable          | Default                                        | Description                |
|-------------------|------------------------------------------------|----------------------------|
| `PROJECT_NAME`    | `Cloud ManagementAI`                           | Application display name   |
| `VERSION`         | `0.1.0`                                        | API version                |
| `API_V1_STR`      | `/api/v1`                                      | API prefix                 |
| `ALLOWED_ORIGINS` | `["http://localhost:5173","http://localhost:3000"]` | CORS allowed origins   |

## License

MIT 
