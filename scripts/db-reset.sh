#!/bin/bash

# Database Reset Script
# This script resets the database and runs migrations

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

print_warning "⚠️  This will reset the database and delete all data!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Database reset cancelled."
    exit 0
fi

print_status "🔄 Resetting database..."

# Ensure database service is running
print_status "Starting database service..."
docker-compose up -d postgres

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 5

# Reset the database
print_status "Resetting database schema..."
docker-compose exec backend npx prisma migrate reset --force

# Generate Prisma client
print_status "Generating Prisma client..."
docker-compose exec backend npx prisma generate

# Seed the database
print_status "Seeding database with initial data..."
docker-compose exec backend npm run db:seed

print_success "Database reset completed! 🎉"

echo ""
echo "📊 Database is now ready with:"
echo "  - Fresh schema from migrations"
echo "  - Seed data for development"
echo ""
echo "🔗 Database connection:"
echo "  - Host: localhost"
echo "  - Port: 5432"
echo "  - Database: wf_db"
echo "  - User: postgres"