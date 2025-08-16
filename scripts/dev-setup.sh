#!/bin/bash

# Development Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Workflow Automation Platform development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
else
    print_warning ".env file already exists"
fi

# Create client .env file if it doesn't exist
if [ ! -f client/.env ]; then
    print_status "Creating client/.env file from client/.env.example..."
    cp client/.env.example client/.env
    print_success "client/.env file created"
else
    print_warning "client/.env file already exists"
fi

# Stop any running containers
print_status "Stopping any running containers..."
docker-compose down --remove-orphans

# Build and start services
print_status "Building and starting services..."
docker-compose up -d --build

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma client
print_status "Generating Prisma client..."
docker-compose exec backend npx prisma generate

# Seed the database
print_status "Seeding the database..."
docker-compose exec backend npm run db:seed

# Show service status
print_status "Checking service status..."
docker-compose ps

print_success "Development environment setup complete!"
echo ""
echo "🌐 Services are available at:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo "  - n8n: http://localhost:5678 (admin/admin)"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "  - View logs: docker-compose logs -f [service]"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Run tests: ./scripts/run-tests.sh"
echo ""
print_success "Happy coding! 🎉"