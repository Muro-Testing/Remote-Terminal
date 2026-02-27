#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ".env" ]]; then
  echo ".env not found. Run scripts/install.sh first." >&2
  exit 1
fi

if [[ -d ".git" ]]; then
  git pull --ff-only
else
  echo "No .git directory found. Skipping git pull."
fi

docker compose up -d --build

PORT="$(grep -E '^PORT=' .env | head -n1 | cut -d'=' -f2)"
PORT="${PORT:-8080}"

sleep 2
if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  echo "Update complete. Health check passed."
else
  echo "Health check failed. Check logs with: docker compose logs -f" >&2
fi
