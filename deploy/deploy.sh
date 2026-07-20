#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/deploy-test}"
FRONTEND_WEB_ROOT="${FRONTEND_WEB_ROOT:-/var/www/deploy-frontend}"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Deploying School Portal from ${APP_DIR}"
cd "${APP_DIR}"

echo "==> Pulling latest code (${BRANCH})"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

echo "==> Updating backend dependencies"
cd "${APP_DIR}/Backend"
# shellcheck disable=SC1091
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo "==> Restarting school-api service"
sudo systemctl restart school-api
sudo systemctl is-active --quiet school-api
echo "school-api is active"

echo "==> Building frontend"
cd "${APP_DIR}/frontend"
echo "VITE_API_URL=/api" > .env
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build

echo "==> Publishing frontend to ${FRONTEND_WEB_ROOT}"
mkdir -p "${FRONTEND_WEB_ROOT}"
find "${FRONTEND_WEB_ROOT}" -mindepth 1 -delete
cp -a dist/. "${FRONTEND_WEB_ROOT}/"
chmod -R a+rX "${FRONTEND_WEB_ROOT}"

echo "==> Health check"
sleep 2
curl -fsS "http://127.0.0.1:8000/api/health"
echo
echo "==> Deploy completed successfully"
