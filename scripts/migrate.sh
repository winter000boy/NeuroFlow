#!/bin/bash

# Database Migration Script
# This script handles database migrations for different environments

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

# Default values
ENVIRONMENT="development"
DRY_RUN=false
RESET=false
SEED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --reset)
            RESET=true
            shift
            ;;
        --seed)
            SEED=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV        Environment (development, staging, production)"
            echo "  --dry-run        Show what would be done without executing"
            echo "  --reset          Reset database (WARNING: destroys all data)"
            echo "  --seed           Seed database with initial data"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "🗄️  Database Migration Script"
print_status "Environment: $ENVIRONMENT"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    print_status "Loading environment from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    print_status "Loading environment from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    print_warning "No environment file found"
fi

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not set"
    exit 1
fi

print_success "Database URL configured"

# Check if this is production
if [ "$ENVIRONMENT" = "production" ] && [ "$RESET" = true ]; then
    print_error "Cannot reset production database without explicit confirmation"
    read -p "Are you absolutely sure you want to reset the PRODUCTION database? Type 'RESET PRODUCTION' to confirm: " -r
    if [ "$REPLY" != "RESET PRODUCTION" ]; then
        print_status "Migration cancelled"
        exit 0
    fi
fi

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
    
    if [ "$RESET" = true ]; then
        print_status "Would reset database and run all migrations"
    else
        print_status "Would run pending migrations"
    fi
    
    print_status "Checking migration status..."
    npx prisma migrate status
    exit 0
fi

# Create backup before migration (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Creating backup before migration..."
    
    # Extract database details from DATABASE_URL
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    
    BACKUP_FILE="backups/pre-migration-$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups
    
    if command -v pg_dump &> /dev/null; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        print_success "Backup created: $BACKUP_FILE"
    else
        print_warning "pg_dump not available, skipping backup"
    fi
fi

# Reset database if requested
if [ "$RESET" = true ]; then
    print_warning "Resetting database..."
    npx prisma migrate reset --force
    print_success "Database reset completed"
else
    # Run migrations
    print_status "Running database migrations..."
    npx prisma migrate deploy
    print_success "Migrations completed"
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate
print_success "Prisma client generated"

# Seed database if requested
if [ "$SEED" = true ]; then
    print_status "Seeding database..."
    npm run db:seed
    print_success "Database seeded"
fi

# Show migration status
print_status "Migration status:"
npx prisma migrate status

print_success "Database migration completed successfully! 🎉"

# Show connection info
print_status "Database connection info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"