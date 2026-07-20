# School Management System

Full-stack school portal with role-based access: Super Admin, Teacher, and Student.

## Tech Stack

- **Frontend:** React (Vite) — `frontend/`
- **Backend:** Python FastAPI — `Backend/`
- **Database:** PostgreSQL

## Quick Start

### 1. Configure PostgreSQL

Set your PostgreSQL connection in `Backend/.env`:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/school_db
```

Or run the setup script to create the database and update `.env` automatically:

```bash
cd Backend
venv\Scripts\activate
python setup_db.py
```

### 2. Backend Setup

```bash
cd Backend
python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt
python setup_db.py
python init_db.py
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `CORS_ORIGINS` | Allowed frontend origin(s) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:8000/api`) |

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
| Student | student@school.com | student123 |

## Features

### Super Admin
- Create teachers
- Create students
- Assign students to teachers

### Teacher
- View assigned students
- Add new students under their account
- Create multiple-choice assignments (sent to all their students)
- View student submissions and scores

### Student
- View pending and completed assignments
- Take multiple-choice assignments
- View completed assignment results with score and answer review

## API Documentation

When the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## CI/CD (GitHub Actions → EC2)

Pushing to `main` runs CI checks, then deploys both frontend and backend to EC2 over SSH.

| Workflow | File | When |
|----------|------|------|
| CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Push / PR to `main` |
| Deploy | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Push to `main` |

Deploy script on the server: [`deploy/deploy.sh`](deploy/deploy.sh)

### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Example |
|--------|---------|
| `EC2_HOST` | Elastic IP or `alsreea.in` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full private key PEM contents |
| `EC2_PORT` | `22` (optional; defaults to 22) |

### One-time EC2 prep

1. Repo path: `/home/ubuntu/deploy-test` (git clone of this repository).
2. Configure non-interactive `git pull` (SSH deploy key or credential helper).
3. Ensure `ubuntu` can write `/var/www/deploy-frontend`.
4. Allow passwordless restart of the API service:

```bash
echo 'ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart school-api' | sudo tee /etc/sudoers.d/school-api
sudo chmod 440 /etc/sudoers.d/school-api
```

5. Keep existing `Backend/venv` and `Backend/.env` — the pipeline never overwrites `.env`.
6. After the first pull that includes `deploy/`:

```bash
chmod +x /home/ubuntu/deploy-test/deploy/deploy.sh
```

7. EC2 security group must allow SSH (port 22) from GitHub Actions runners (or your chosen IP range).

### What deploy does

1. `git pull origin main`
2. Backend: `pip install -r requirements.txt` → `systemctl restart school-api`
3. Frontend: `npm ci` → `npm run build` (`VITE_API_URL=/api`) → copy `dist/` to `/var/www/deploy-frontend`
4. Health check: `http://127.0.0.1:8000/api/health`
