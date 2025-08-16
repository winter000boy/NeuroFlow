#!/bin/bash

# Cleanup Script
# This script cleans up Docker resources and development artifacts

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

# Default values
REMOVE_VOLUMES=false
REMOVE_IMAGES=false
DEEP_CLEAN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        --images)
            REMOVE_IMAGES=true
            shift
            ;;
        --deep)
            DEEP_CLEAN=true
            REMOVE_VOLUMES=true
            REMOVE_IMAGES=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --volumes    Remove Docker volumes (WARNING: This will delete all data)"
            echo "  --images     Remove Docker images"
            echo "  --deep       Deep clean (removes everything including data)"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

print_status "🧹 Cleaning up Workflow Automation Platform..."

# Stop and remove containers
print_status "Stopping and removing containers..."
docker-compose down --remove-orphans

# Remove volumes if requested
if [ "$REMOVE_VOLUMES" = true ]; then
    print_warning "Removing Docker volumes (this will delete all data)..."
    docker-compose down -v
    print_success "Volumes removed"
fi

# Remove images if requested
if [ "$REMOVE_IMAGES" = true ]; then
    print_status "Removing Docker images..."
    
    # Remove project-specific images
    docker images | grep "workflow" | awk '{print $3}' | xargs -r docker rmi -f
    
    # Remove dangling images
    docker image prune -f
    
    print_success "Images removed"
fi

# Deep clean
if [ "$DEEP_CLEAN" = true ]; then
    print_status "Performing deep clean..."
    
    # Remove node_modules
    print_status "Removing node_modules directories..."
    rm -rf node_modules client/node_modules
    
    # Remove build artifacts
    print_status "Removing build artifacts..."
    rm -rf dist client/build coverage client/coverage
    
    # Remove logs
    print_status "Removing log files..."
    rm -rf logs *.log client/*.log
    
    # Remove Docker system artifacts
    print_status "Cleaning Docker system..."
    docker system prune -f
    
    print_success "Deep clean completed"
fi

# Clean up temporary files
print_status "Cleaning temporary files..."
find . -name "*.tmp" -type f -delete
find . -name ".DS_Store" -type f -delete

print_success "Cleanup completed! 🎉"

echo ""
echo "📝 To rebuild the environment:"
echo "  ./scripts/dev-setup.sh"