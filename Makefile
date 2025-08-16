# Workflow Automation Platform - Development Makefile

.PHONY: help setup start stop restart logs clean test build deploy

# Default target
help: ## Show this help message
	@echo "Workflow Automation Platform - Development Commands"
	@echo "=================================================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development Environment
setup: ## Setup development environment
	@echo "🚀 Setting up development environment..."
	@./scripts/dev-setup.sh

start: ## Start all services
	@echo "▶️  Starting services..."
	@docker-compose up -d

stop: ## Stop all services
	@echo "⏹️  Stopping services..."
	@docker-compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	@docker-compose restart

logs: ## Show logs for all services
	@docker-compose logs -f

logs-backend: ## Show backend logs
	@docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	@docker-compose logs -f frontend

logs-db: ## Show database logs
	@docker-compose logs -f postgres

logs-n8n: ## Show n8n logs
	@docker-compose logs -f n8n

# Database Management
db-reset: ## Reset database and run migrations
	@./scripts/db-reset.sh

db-migrate: ## Run database migrations
	@docker-compose exec backend npx prisma migrate deploy

db-seed: ## Seed database with test data
	@docker-compose exec backend npm run db:seed

db-studio: ## Open Prisma Studio
	@docker-compose exec backend npx prisma studio

# Testing
test: ## Run all tests
	@./scripts/run-tests.sh

test-backend: ## Run backend tests only
	@./scripts/run-tests.sh --backend-only

test-frontend: ## Run frontend tests only
	@./scripts/run-tests.sh --frontend-only

test-e2e: ## Run end-to-end tests
	@./scripts/run-tests.sh --e2e

test-coverage: ## Run tests with coverage
	@./scripts/run-tests.sh --coverage

# Development
dev-backend: ## Start backend in development mode
	@docker-compose up -d postgres redis n8n
	@cd . && npm run dev

dev-frontend: ## Start frontend in development mode
	@cd client && npm start

install: ## Install dependencies
	@echo "📦 Installing backend dependencies..."
	@npm install
	@echo "📦 Installing frontend dependencies..."
	@cd client && npm install

lint: ## Run linting
	@echo "🔍 Linting backend..."
	@npm run lint
	@echo "🔍 Linting frontend..."
	@cd client && npm run lint

format: ## Format code
	@echo "✨ Formatting backend..."
	@npm run format
	@echo "✨ Formatting frontend..."
	@cd client && npm run format

# Building
build: ## Build all services
	@echo "🏗️  Building services..."
	@docker-compose build

build-backend: ## Build backend only
	@docker-compose build backend

build-frontend: ## Build frontend only
	@docker-compose build frontend

# Production
prod-build: ## Build for production
	@echo "🏗️  Building for production..."
	@docker-compose -f docker-compose.prod.yml build

prod-start: ## Start production environment
	@echo "🚀 Starting production environment..."
	@docker-compose -f docker-compose.prod.yml up -d

# Cleanup
clean: ## Clean up containers and images
	@./scripts/cleanup.sh

clean-volumes: ## Clean up including volumes (WARNING: deletes data)
	@./scripts/cleanup.sh --volumes

clean-deep: ## Deep clean everything (WARNING: deletes all data)
	@./scripts/cleanup.sh --deep

# Health Checks
health: ## Check service health
	@echo "🏥 Checking service health..."
	@curl -f http://localhost:3001/api/health || echo "❌ Backend unhealthy"
	@curl -f http://localhost:3000/health || echo "❌ Frontend unhealthy"
	@curl -f http://localhost:5678/healthz || echo "❌ n8n unhealthy"

status: ## Show service status
	@docker-compose ps

# Utility
shell-backend: ## Open shell in backend container
	@docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	@docker-compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	@docker-compose exec postgres psql -U postgres -d wf_db

# Documentation
docs: ## Generate API documentation
	@echo "📚 Generating API documentation..."
	@docker-compose exec backend npx swagger-jsdoc -d swaggerDef.js -o swagger.json src/routes/*.ts

# Monitoring
monitor: ## Show resource usage
	@docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"