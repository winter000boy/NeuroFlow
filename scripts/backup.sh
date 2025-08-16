#!/bin/bash

# Database Backup Script
# This script creates backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="postgres"
DB_PORT="5432"
DB_NAME="${POSTGRES_DB:-wf_db}"
DB_USER="${POSTGRES_USER:-postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

print_status "Starting database backup..."
print_status "Database: $DB_NAME"
print_status "Backup file: $BACKUP_FILE"

# Wait for database to be ready
print_status "Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
    sleep 2
done

# Create backup
print_status "Creating database backup..."
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose --clean --no-owner --no-privileges \
    --format=plain > "$BACKUP_FILE"; then
    
    print_success "Backup created successfully: $BACKUP_FILE"
    
    # Compress backup
    print_status "Compressing backup..."
    gzip "$BACKUP_FILE"
    print_success "Backup compressed: ${BACKUP_FILE}.gz"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_status "Backup size: $BACKUP_SIZE"
    
else
    print_error "Backup failed!"
    exit 1
fi

# Clean up old backups
print_status "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
print_success "Old backups cleaned up"

# List current backups
print_status "Current backups:"
ls -lh "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null || echo "No backups found"

print_success "Backup process completed!"

# If running as a cron job, also create a restore script
cat > "${BACKUP_DIR}/restore_${TIMESTAMP}.sh" << EOF
#!/bin/bash
# Restore script for backup created on ${TIMESTAMP}

set -e

BACKUP_FILE="${BACKUP_FILE}.gz"
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT}"
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"

echo "Restoring database from \$BACKUP_FILE..."

# Drop existing database (be careful!)
# dropdb -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" "\$DB_NAME" --if-exists

# Create new database
# createdb -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" "\$DB_NAME"

# Restore from backup
gunzip -c "\$BACKUP_FILE" | psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME"

echo "Database restored successfully!"
EOF

chmod +x "${BACKUP_DIR}/restore_${TIMESTAMP}.sh"
print_success "Restore script created: ${BACKUP_DIR}/restore_${TIMESTAMP}.sh"