#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
BRANCH="${2:-main}"
INSTALL_DIR="${3:-$(pwd)}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

require_command docker
require_command git

TARGET_DIR="$INSTALL_DIR"

if [[ -n "$REPO_URL" ]]; then
  REPO_NAME="$(basename "${REPO_URL%/}")"
  REPO_NAME="${REPO_NAME%.git}"
  [[ -z "$REPO_NAME" ]] && REPO_NAME="remote-terminal"
  TARGET_DIR="$INSTALL_DIR/$REPO_NAME"
  if [[ ! -d "$TARGET_DIR" ]]; then
    git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
  else
    echo "Repository already exists at $TARGET_DIR. Pulling latest changes..."
    git -C "$TARGET_DIR" pull --ff-only
  fi
fi

cd "$TARGET_DIR"

if [[ ! -f ".env" ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

mkdir -p workspace workspace/.codex workspace/backups
docker compose up -d --build

PORT="$(grep -E '^PORT=' .env | head -n1 | cut -d'=' -f2)"
PORT="${PORT:-8080}"

sleep 3
if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  echo "Health check passed: http://localhost:${PORT}"
else
  echo "Health check failed. Check logs with: docker compose logs -f" >&2
fi
