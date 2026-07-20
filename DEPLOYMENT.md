# School Portal - Full Deployment Guide

AWS EC2 + Namecheap + Nginx + SSL

This document covers end-to-end deployment for:

- Backend: FastAPI (Python) - Backend/
- Frontend: React (Vite) - built locally, served as static files
- Database: PostgreSQL on EC2
- Web server: Nginx (frontend at /, API at /api)
- Domain: Namecheap (example: alsreea.in)
- SSL: Let's Encrypt via Certbot

## 1. Architecture Overview

```
User Browser
    |
    v
https://alsreea.in  (Namecheap DNS -> EC2 Elastic IP)
    |
    v
Nginx (port 80 / 443)
    |-- /              -> /var/www/deploy-frontend  (React static build)
    +-- /api/*         -> http://127.0.0.1:8000/api/*  (FastAPI via systemd)
                              |
                              v
                         PostgreSQL (localhost:5432)
```

| Component | Location |
|-----------|----------|
| Backend code | /home/ubuntu/deploy-test/Backend |
| Frontend static files | /var/www/deploy-frontend |
| Backend service | school-api.service |
| Nginx config | /etc/nginx/sites-available/school-api |
| Backend env | /home/ubuntu/deploy-test/Backend/.env |

## 2. Prerequisites

### On AWS
- EC2 instance (Ubuntu)
- Security group with inbound rules:
  - 22 - SSH (your IP recommended)
  - 80 - HTTP
  - 443 - HTTPS
- Elastic IP attached to the instance (recommended)

### On Namecheap
- Domain purchased (e.g. alsreea.in)

### On your local Windows PC
- Node.js and npm (for frontend build)
- FileZilla (for uploading frontend)
- SSH client (PuTTY or Windows Terminal)

### On EC2 (after setup)
- Python 3.14 (default on Ubuntu resolute) or Python 3.12 via pyenv
- PostgreSQL
- Nginx
- Git

Note: Node/npm are NOT required on the server. Build the frontend locally.

## 3. EC2 Initial Setup

### 3.1 Connect to EC2

```
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 3.2 Allocate Elastic IP (recommended)

1. AWS Console -> EC2 -> Elastic IPs
2. Allocate Elastic IP address
3. Associate with your instance
4. Use this IP in Namecheap DNS and throughout this guide

### 3.3 Install system packages

```
sudo apt update
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx git \
  libpq-dev python3-dev gcc build-essential
```

### 3.4 Clone repository

```
cd ~
git clone https://github.com/YOUR_USERNAME/deploy-test.git
cd deploy-test
```

## 4. PostgreSQL Setup

### 4.1 Start PostgreSQL

```
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql
```

### 4.2 Create database and user

```
sudo -u postgres psql
```

Inside psql:

```
CREATE USER school_user WITH PASSWORD 'YourStrongPassword123';
CREATE DATABASE school_db OWNER school_user;
GRANT ALL PRIVILEGES ON DATABASE school_db TO school_user;

\c school_db
GRANT ALL ON SCHEMA public TO school_user;

\q
```

### 4.3 Allow local connections (if needed)

Find pg_hba.conf:

```
sudo -u postgres psql -c "SHOW hba_file;"
```

Ensure these lines exist:

```
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

Reload:

```
sudo systemctl reload postgresql
```

### 4.4 Test connection

```
psql "postgresql://school_user:YourStrongPassword123@localhost:5432/school_db" -c "SELECT 1;"
```

## 5. Backend Deployment

### 5.1 Create virtual environment

```
cd ~/deploy-test/Backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5.2 If psycopg2-binary fails to build

```
sudo apt install -y libpq-dev python3-dev gcc build-essential
pip install -r requirements.txt
```

### 5.3 If SQLAlchemy fails on Python 3.14

```
pip install --upgrade "sqlalchemy>=2.0.40"
```

### 5.4 Create backend .env

```
nano ~/deploy-test/Backend/.env
```

```
DATABASE_URL=postgresql://school_user:YourStrongPassword123@localhost:5432/school_db
SECRET_KEY=generate-a-long-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://alsreea.in,https://www.alsreea.in,http://alsreea.in,http://www.alsreea.in
```

Generate a secret key:

```
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Important:
- Use localhost for DB host (not public IP)
- Use lowercase username (school_user, not School)

### 5.5 Seed database

```
cd ~/deploy-test/Backend
source venv/bin/activate
python init_db.py
```

Expected output:

```
Database seeded successfully!

Default login credentials:
  Super Admin: admin@school.com / admin123
  Teacher:     teacher@school.com / teacher123
  Student:     student@school.com / student123
```

A bcrypt warning may appear - it is harmless if seeding succeeds.

### 5.6 Test backend manually

```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In another terminal:

```
curl http://localhost:8000/api/health
```

Stop with Ctrl+C when done testing.

## 6. Backend as systemd Service

### 6.1 Create service file

```
sudo nano /etc/systemd/system/school-api.service
```

```
[Unit]
Description=School Management FastAPI Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/deploy-test/Backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/ubuntu/deploy-test/Backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 6.2 Enable and start

```
sudo systemctl daemon-reload
sudo systemctl enable school-api
sudo systemctl start school-api
sudo systemctl status school-api
```

### 6.3 Service commands

```
sudo systemctl status school-api
sudo systemctl restart school-api
sudo systemctl stop school-api
sudo journalctl -u school-api -f
```

## 7. Frontend Build (Local Windows)

Build on your PC, not on EC2.

### 7.1 Set production API URL

```
cd C:\Users\adarsh.aj\Desktop\Adarsh\deploy-test\frontend
```

Create or edit .env:

```
VITE_API_URL=/api
```

Using /api means the frontend calls the API on the same domain (e.g. https://alsreea.in/api).

### 7.2 Build

```
npm install
npm run build
```

Output folder:

```
frontend\dist\
  index.html
  assets\
    index-xxxxx.js
    index-xxxxx.css
  favicon.svg
```

## 8. Upload Frontend via FileZilla

### 8.1 Create directory on EC2

```
sudo mkdir -p /var/www/deploy-frontend
sudo chown -R ubuntu:ubuntu /var/www/deploy-frontend
sudo chmod -R 755 /var/www/deploy-frontend
```

### 8.2 FileZilla connection

| Setting | Value |
|---------|-------|
| Protocol | SFTP |
| Host | sftp://YOUR_EC2_IP |
| Username | ubuntu |
| Key file | Your .pem key (FileZilla -> Settings -> SFTP -> Add key) |

### 8.3 Upload files

Remote path: /var/www/deploy-frontend

Upload contents of local frontend\dist\:

- index.html
- assets/ (entire folder)
- favicon.svg (if present)

Correct structure:

```
/var/www/deploy-frontend/
  index.html
  assets/
  favicon.svg
```

Wrong: /var/www/deploy-frontend/dist/index.html

## 9. Nginx Configuration

### 9.1 Create / edit site config

```
sudo nano /etc/nginx/sites-available/school-api
```

### 9.2 HTTP config (before SSL)

```
server {
    listen 80;
    server_name alsreea.in www.alsreea.in;

    root /var/www/deploy-frontend;
    index index.html;

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: FastAPI docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host $host;
    }

    # Static assets
    location /assets {
        try_files $uri =404;
    }

    # React SPA - client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 9.3 Enable site

```
sudo ln -sf /etc/nginx/sites-available/school-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9.4 Test

```
curl -I http://localhost/
curl http://localhost/api/health
```

## 10. Domain Setup (Namecheap)

### 10.1 Namecheap DNS records

Domain List -> alsreea.in -> Manage -> Advanced DNS

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | @ | YOUR_EC2_ELASTIC_IP | Automatic |
| A Record | www | YOUR_EC2_ELASTIC_IP | Automatic |

Remove conflicting parking/redirect records.

### 10.2 Verify DNS

```
dig alsreea.in +short
dig www.alsreea.in +short
```

Propagation: 5 minutes to 48 hours (often under 30 minutes).

### 10.3 Test in browser

- http://alsreea.in/
- http://alsreea.in/api/health

## 11. SSL with Certbot

### 11.1 Install Certbot

```
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Obtain certificate

```
sudo certbot --nginx -d alsreea.in -d www.alsreea.in
```

| Prompt | Recommendation |
|--------|----------------|
| Email | Your email |
| Terms | Agree (Y) |
| Redirect HTTP -> HTTPS | Yes (option 2) |

### 11.3 Test HTTPS

```
curl -I https://alsreea.in
curl https://alsreea.in/api/health
```

### 11.4 Update backend CORS (if not already)

```
nano ~/deploy-test/Backend/.env
```

```
CORS_ORIGINS=https://alsreea.in,https://www.alsreea.in,http://alsreea.in,http://www.alsreea.in
```

```
sudo systemctl restart school-api
```

### 11.5 Test auto-renewal

```
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

## 12. Final Verification

### 12.1 URLs

| URL | Expected |
|-----|----------|
| https://alsreea.in/ | School Portal login page |
| https://alsreea.in/api/health | {"status":"ok"} |
| https://alsreea.in/docs | FastAPI Swagger UI |

### 12.2 Login test

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
| Student | student@school.com | student123 |

Change these default passwords in production.

### 12.3 Service status

```
sudo systemctl status school-api
sudo systemctl status nginx
sudo systemctl status postgresql
```

## 13. Updating After Changes (CI/CD)

After GitHub Actions is configured, **push to `main`** deploys automatically. Manual FileZilla uploads are no longer required for routine updates.

### 13.1 GitHub Actions overview

| Workflow | File | When |
|----------|------|------|
| CI | .github/workflows/ci.yml | Push / PR to main (lint, build frontend; import-check backend) |
| Deploy | .github/workflows/deploy.yml | Push to main (SSH to EC2, run deploy/deploy.sh) |

### 13.2 GitHub Secrets

Repo Settings -> Secrets and variables -> Actions:

| Secret | Example |
|--------|---------|
| EC2_HOST | Elastic IP or alsreea.in |
| EC2_USER | ubuntu |
| EC2_SSH_KEY | Full private key PEM contents |
| EC2_PORT | 22 (optional; defaults to 22) |

### 13.3 One-time EC2 prep for CI/CD

```
# Passwordless restart for school-api
echo 'ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart school-api' | sudo tee /etc/sudoers.d/school-api
sudo chmod 440 /etc/sudoers.d/school-api

# Make deploy script executable after first pull that includes it
chmod +x /home/ubuntu/deploy-test/deploy/deploy.sh
```

Also ensure:
- `/home/ubuntu/deploy-test` is a git clone of the GitHub repo
- `git pull` works without prompts (deploy key recommended)
- `ubuntu` owns `/var/www/deploy-frontend`
- Security group allows SSH from GitHub Actions (or a controlled IP range)
- Existing `Backend/venv` and `Backend/.env` remain in place (pipeline does not overwrite `.env`)

### 13.4 What deploy/deploy.sh does

1. git pull origin main
2. Backend: pip install -r requirements.txt, systemctl restart school-api
3. Frontend: npm ci, npm run build with VITE_API_URL=/api, copy dist to /var/www/deploy-frontend
4. curl health check on http://127.0.0.1:8000/api/health

### 13.5 Manual deploy (optional)

```
cd /home/ubuntu/deploy-test
./deploy/deploy.sh
```

### 13.6 Environment-only changes

After editing Backend/.env on the server (not via git):

```
sudo systemctl restart school-api
```

## 14. Troubleshooting

### PostgreSQL

| Error | Fix |
|-------|-----|
| password authentication failed | Match user/password in .env and PostgreSQL |
| no pg_hba.conf entry | Add 127.0.0.1 rule in pg_hba.conf, reload PostgreSQL |
| Wrong host in .env | Use localhost, not public IP |

### Python / dependencies

| Error | Fix |
|-------|-----|
| psycopg2 build fails | sudo apt install libpq-dev python3-dev gcc |
| SQLAlchemy Union error on Python 3.14 | pip install --upgrade "sqlalchemy>=2.0.40" |
| bcrypt warning during init_db.py | Harmless if seed succeeds; optional: pip install bcrypt==4.2.1 |

### Nginx / frontend

| Error | Fix |
|-------|-----|
| 403 Forbidden | sudo chmod -R 755 /var/www/deploy-frontend |
| Blank page | Ensure index.html is directly in /var/www/deploy-frontend |
| /login 404 on refresh | Add try_files $uri $uri/ /index.html; |
| API 404 | Check location /api proxy and backend service |

### Domain / SSL

| Error | Fix |
|-------|-----|
| Domain not resolving | Check Namecheap A records and DNS propagation |
| Certbot fails | Open ports 80 and 443; verify server_name in Nginx |
| Login fails after SSL | Update CORS_ORIGINS to https://alsreea.in |

### Useful debug commands

```
sudo journalctl -u school-api -n 50 --no-pager
sudo nginx -t
curl http://localhost:8000/api/health
curl https://alsreea.in/api/health
grep DATABASE_URL ~/deploy-test/Backend/.env
sudo -u postgres psql -c "\du"
```

## 15. Quick Reference

### Important paths

```
Backend code:     /home/ubuntu/deploy-test/Backend
Backend .env:     /home/ubuntu/deploy-test/Backend/.env
Frontend files:   /var/www/deploy-frontend
Nginx config:     /etc/nginx/sites-available/school-api
Systemd service:  /etc/systemd/system/school-api.service
SSL certificates: /etc/letsencrypt/live/alsreea.in/
```

### Essential commands

```
# Backend
sudo systemctl restart school-api
sudo journalctl -u school-api -f

# Nginx
sudo nginx -t
sudo systemctl reload nginx

# PostgreSQL
sudo systemctl status postgresql

# SSL
sudo certbot renew --dry-run
```

### Production checklist

- [ ] Elastic IP attached to EC2
- [ ] PostgreSQL user and school_db created
- [ ] Backend/.env configured
- [ ] python init_db.py completed
- [ ] school-api service running
- [ ] Frontend built with VITE_API_URL=/api
- [ ] Files uploaded to /var/www/deploy-frontend
- [ ] Nginx configured and running
- [ ] Namecheap A records set
- [ ] SSL certificate installed
- [ ] CORS_ORIGINS includes https://alsreea.in
- [ ] Default passwords changed
- [ ] GitHub Actions secrets set (EC2_HOST, EC2_USER, EC2_SSH_KEY)
- [ ] Passwordless sudo for systemctl restart school-api
- [ ] deploy/deploy.sh is executable on EC2

## Document Info

- Project: School Portal (Super Admin / Teacher / Student)
- Domain example: alsreea.in
- Stack: FastAPI + React + PostgreSQL + Nginx + Certbot on AWS EC2
- CI/CD: GitHub Actions (push to main -> SSH deploy)
