#!/bin/bash

# Production Deployment Script
# This script handles deployment to different environments

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
ENVIRONMENT="production"
BUILD_ONLY=false
NO_BACKUP=false
SKIP_TESTS=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV        Environment (staging, production)"
            echo "  --build-only     Only build images, don't deploy"
            echo "  --no-backup      Skip database backup"
            echo "  --skip-tests     Skip running tests"
            echo "  --force          Force deployment without confirmation"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "🚀 Deployment Script"
print_status "Environment: $ENVIRONMENT"
print_status "Build only: $BUILD_ONLY"

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# Check if we're on the correct branch for production
if [ "$ENVIRONMENT" = "production" ]; then
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ] && [ "$FORCE" != true ]; then
        print_error "Production deployments must be from main/master branch"
        print_status "Current branch: $CURRENT_BRANCH"
        print_status "Use --force to override this check"
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ] && [ "$FORCE" != true ]; then
    print_error "You have uncommitted changes"
    print_status "Commit your changes or use --force to override"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    print_status "Loading environment from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    print_error "Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Confirmation for production
if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE" != true ]; then
    print_warning "⚠️  You are about to deploy to PRODUCTION"
    print_status "Current commit: $(git rev-parse --short HEAD)"
    print_status "Current branch: $(git branch --show-current)"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
fi

# Run tests unless skipped
if [ "$SKIP_TESTS" != true ]; then
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    npm test -- --watchAll=false --coverage=false
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd client && npm test -- --watchAll=false --coverage=false && cd ..
    
    print_success "All tests passed"
else
    print_warning "Skipping tests"
fi

# Create backup if not skipped
if [ "$NO_BACKUP" != true ] && [ "$ENVIRONMENT" = "production" ]; then
    print_status "Creating database backup..."
    ./scripts/backup.sh
    print_success "Backup created"
fi

# Build Docker images
print_status "Building Docker images..."

# Build backend image
print_status "Building backend image..."
docker build -f Dockerfile.prod -t workflow-platform-backend:$ENVIRONMENT .

# Build frontend image
print_status "Building frontend image..."
cd client
docker build -f Dockerfile.prod -t workflow-platform-frontend:$ENVIRONMENT \
    --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
    --build-arg REACT_APP_WS_URL="$REACT_APP_WS_URL" \
    --build-arg REACT_APP_NAME="$REACT_APP_NAME" \
    --build-arg REACT_APP_VERSION="$REACT_APP_VERSION" \
    .
cd ..

print_success "Docker images built successfully"

# Tag images with version
GIT_COMMIT=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION_TAG="${ENVIRONMENT}-${TIMESTAMP}-${GIT_COMMIT}"

docker tag workflow-platform-backend:$ENVIRONMENT workflow-platform-backend:$VERSION_TAG
docker tag workflow-platform-frontend:$ENVIRONMENT workflow-platform-frontend:$VERSION_TAG

print_success "Images tagged with version: $VERSION_TAG"

# If build-only, stop here
if [ "$BUILD_ONLY" = true ]; then
    print_success "Build completed. Images ready for deployment."
    exit 0
fi

# Deploy using docker-compose
print_status "Deploying services..."

# Stop existing services
print_status "Stopping existing services..."
docker-compose -f docker-compose.prod.yml down

# Run database migrations
print_status "Running database migrations..."
./scripts/migrate.sh --env $ENVIRONMENT

# Start services
print_status "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Health check
print_status "Performing health checks..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed (HTTP $BACKEND_HEALTH)"
fi

if [ "$FRONTEND_HEALTH" = "200" ]; then
    print_success "Frontend is healthy"
else
    print_error "Frontend health check failed (HTTP $FRONTEND_HEALTH)"
fi

# Show service status
print_status "Service status:"
docker-compose -f docker-compose.prod.yml ps

# Cleanup old images
print_status "Cleaning up old images..."
docker image prune -f

print_success "Deployment completed successfully! 🎉"

# Show deployment info
print_status "Deployment Information:"
echo "  Environment: $ENVIRONMENT"
echo "  Version: $VERSION_TAG"
echo "  Commit: $(git rev-parse HEAD)"
echo "  Branch: $(git branch --show-current)"
echo "  Deployed at: $(date)"
echo ""
echo "🌐 Services:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost:3001/api"
echo "  API Docs: http://localhost:3001/api/docs"
echo "  Health: http://localhost:3001/api/health"

# Log deployment
echo "$(date): Deployed $VERSION_TAG to $ENVIRONMENT" >> deployments.log