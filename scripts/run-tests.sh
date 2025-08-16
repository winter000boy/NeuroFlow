#!/bin/bash

# Test Runner Script
# This script runs tests for both backend and frontend

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
RUN_BACKEND=true
RUN_FRONTEND=true
RUN_E2E=false
COVERAGE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only)
            RUN_BACKEND=true
            RUN_FRONTEND=false
            shift
            ;;
        --frontend-only)
            RUN_BACKEND=false
            RUN_FRONTEND=true
            shift
            ;;
        --e2e)
            RUN_E2E=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --backend-only    Run only backend tests"
            echo "  --frontend-only   Run only frontend tests"
            echo "  --e2e            Run end-to-end tests"
            echo "  --coverage       Generate coverage reports"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "🧪 Running tests for Workflow Automation Platform..."

# Ensure services are running
print_status "Checking if services are running..."
if ! docker-compose ps | grep -q "Up"; then
    print_status "Starting services..."
    docker-compose up -d
    sleep 10
fi

# Run backend tests
if [ "$RUN_BACKEND" = true ]; then
    print_status "Running backend tests..."
    
    if [ "$COVERAGE" = true ]; then
        docker-compose exec backend npm test -- --coverage --watchAll=false
    else
        docker-compose exec backend npm test -- --watchAll=false
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Backend tests passed!"
    else
        print_error "Backend tests failed!"
        exit 1
    fi
fi

# Run frontend tests
if [ "$RUN_FRONTEND" = true ]; then
    print_status "Running frontend tests..."
    
    if [ "$COVERAGE" = true ]; then
        docker-compose exec frontend npm test -- --coverage --watchAll=false
    else
        docker-compose exec frontend npm test -- --watchAll=false
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Frontend tests passed!"
    else
        print_error "Frontend tests failed!"
        exit 1
    fi
fi

# Run E2E tests
if [ "$RUN_E2E" = true ]; then
    print_status "Running E2E tests..."
    
    # Ensure frontend is built and served
    docker-compose exec frontend npm run build
    
    # Run Cypress tests
    docker-compose exec frontend npx cypress run
    
    if [ $? -eq 0 ]; then
        print_success "E2E tests passed!"
    else
        print_error "E2E tests failed!"
        exit 1
    fi
fi

print_success "All tests completed successfully! 🎉"

# Show coverage reports if generated
if [ "$COVERAGE" = true ]; then
    echo ""
    print_status "Coverage reports generated:"
    echo "  - Backend: coverage/lcov-report/index.html"
    echo "  - Frontend: client/coverage/lcov-report/index.html"
fi