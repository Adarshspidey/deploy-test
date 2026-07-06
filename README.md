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
