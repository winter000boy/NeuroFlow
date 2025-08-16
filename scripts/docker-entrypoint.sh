#!/bin/sh

# Docker entrypoint script for production backend
set -e

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Starting Workflow Automation Platform Backend..."

# Validate required environment variables
required_vars="DATABASE_URL JWT_SECRET JWT_REFRESH_SECRET"
for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment variables validated"

# Wait for database to be ready if WAIT_FOR_DB is set
if [ "$WAIT_FOR_DB" = "true" ]; then
    print_status "Waiting for database to be ready..."
    
    # Extract database host and port from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
        ./wait-for-it.sh "$DB_HOST:$DB_PORT" --timeout=60 --strict -- print_success "Database is ready"
    else
        print_warning "Could not parse database host/port from DATABASE_URL, skipping wait"
    fi
fi

# Run database migrations if AUTO_MIGRATE is set
if [ "$AUTO_MIGRATE" = "true" ]; then
    print_status "Running database migrations..."
    npx prisma migrate deploy
    print_success "Database migrations completed"
fi

# Generate Prisma client if needed
if [ ! -d "node_modules/.prisma" ]; then
    print_status "Generating Prisma client..."
    npx prisma generate
    print_success "Prisma client generated"
fi

# Create necessary directories
mkdir -p logs uploads tmp
print_success "Directories created"

# Set proper file permissions
chmod 755 logs uploads tmp
print_success "Permissions set"

# Health check before starting
print_status "Performing pre-start health check..."

# Check if we can connect to the database
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to database"
    exit 1
fi

print_success "Pre-start health check passed"

# Handle graceful shutdown
trap 'print_status "Received shutdown signal, gracefully stopping..."; kill -TERM $PID; wait $PID' TERM INT

print_success "Starting application server..."

# Start the application
if [ "$NODE_ENV" = "production" ]; then
    exec node dist/index.js &
else
    exec npm run dev &
fi

PID=$!
wait $PID