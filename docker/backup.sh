#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting WorkLog AI nightly database backup..."

# Dump n8n metadata DB
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h postgres -U "${POSTGRES_USER}" -d n8n | gzip > "$BACKUP_DIR/n8n_$TIMESTAMP.sql.gz"

# Dump WorkLog application DB
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h postgres -U "${POSTGRES_USER}" -d worklog | gzip > "$BACKUP_DIR/worklog_$TIMESTAMP.sql.gz"

echo "[$(date)] Backup completed successfully."

# Prune old backups older than 30 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Pruned backups older than $RETENTION_DAYS days."
