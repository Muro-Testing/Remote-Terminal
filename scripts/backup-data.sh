#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="remote-terminal-mvp"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="workspace/backups"
DB_BACKUP_FILE="${BACKUP_DIR}/app-${TIMESTAMP}.sqlite"
WORKSPACE_BACKUP_FILE="${BACKUP_DIR}/workspace-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container ${CONTAINER_NAME} is not running." >&2
  exit 1
fi

docker cp "${CONTAINER_NAME}:/app/data/app.sqlite" "$DB_BACKUP_FILE"
tar -czf "$WORKSPACE_BACKUP_FILE" -C workspace .

echo "Backups created:"
echo " - ${DB_BACKUP_FILE}"
echo " - ${WORKSPACE_BACKUP_FILE}"
