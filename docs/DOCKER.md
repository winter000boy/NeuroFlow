# Docker Development Environment

This document describes the Docker-based development environment for the Workflow Automation Platform.

## Overview

The platform uses Docker Compose to orchestrate multiple services:

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **n8n**: Workflow execution engine
- **Backend**: Node.js/Express API server
- **Frontend**: React application

## Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Make (optional, for convenience commands)

### Setup

1. **Clone and setup environment:**
   ```bash
   git clone <repository>
   cd workflow-automation-platform
   make setup
   ```

2. **Or manually:**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp client/.env.example client/.env
   
   # Start services
   docker-compose up -d --build
   
   # Run migrations and seed data
   docker-compose exec backend npx prisma migrate deploy
   docker-compose exec backend npm run db:seed
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - n8n: http://localhost:5678 (admin/admin)
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Services

### PostgreSQL Database

- **Image**: `postgres:15-alpine`
- **Port**: 5432
- **Database**: `wf_db`
- **User**: `postgres`
- **Password**: `sharmaji` (development only)

**Health Check**: Checks if PostgreSQL is ready to accept connections.

**Volumes**:
- `postgres_data`: Persistent database storage
- `./scripts/init-db.sql`: Database initialization script

### Redis Cache

- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Configuration**: `./config/redis.conf`

**Health Check**: Redis ping command.

**Volumes**:
- `redis_data`: Persistent Redis storage
- `./config/redis.conf`: Redis configuration

### n8n Workflow Engine

- **Image**: `n8nio/n8n:latest`
- **Port**: 5678
- **Auth**: admin/admin (development)

**Environment Variables**:
- Uses PostgreSQL for data storage
- Configured for development with basic auth
- Webhook URL configured for local development

**Health Check**: HTTP request to `/healthz` endpoint.

**Volumes**:
- `n8n_data`: Persistent n8n data
- `./n8n/workflows`: Read-only workflow templates

### Backend API

- **Build**: Multi-stage Dockerfile (`Dockerfile.dev`)
- **Port**: 3001
- **Environment**: Development with hot reload

**Features**:
- Hot reload with `ts-node-dev`
- Volume mounting for live code changes
- Health check endpoint at `/api/health`
- Automatic Prisma client generation

**Volumes**:
- `.:/app`: Live code mounting
- `/app/node_modules`: Node modules cache
- `backend_logs:/app/logs`: Log storage

### Frontend React App

- **Build**: Multi-stage Dockerfile (`client/Dockerfile.dev`)
- **Port**: 3000
- **Environment**: Development with hot reload

**Features**:
- React development server
- Live code reloading
- Environment variable injection
- Optimized for development

**Volumes**:
- `./client:/app`: Live code mounting
- `/app/node_modules`: Node modules cache

## Development Workflow

### Starting Development

```bash
# Start all services
make start

# Or with docker-compose
docker-compose up -d
```

### Viewing Logs

```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
make logs-db
make logs-n8n

# Or with docker-compose
docker-compose logs -f [service]
```

### Database Operations

```bash
# Reset database
make db-reset

# Run migrations
make db-migrate

# Seed data
make db-seed

# Open Prisma Studio
make db-studio
```

### Testing

```bash
# Run all tests
make test

# Backend only
make test-backend

# Frontend only
make test-frontend

# With coverage
make test-coverage
```

### Code Quality

```bash
# Lint code
make lint

# Format code
make format
```

## Environment Variables

### Backend (.env)

Key environment variables for the backend:

```bash
# Database
DATABASE_URL=postgresql://postgres:sharmaji@postgres:5432/wf_db
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# n8n Integration
N8N_API_URL=http://n8n:5678
N8N_WEBHOOK_URL=http://n8n:5678/webhook

# Server
PORT=3001
NODE_ENV=development
```

### Frontend (client/.env)

Key environment variables for the frontend:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=http://localhost:3001

# Development
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

## Networking

All services communicate through the `workflow-network` bridge network:

- **Internal DNS**: Services can reach each other by service name
- **External Access**: Only frontend (3000), backend (3001), n8n (5678), PostgreSQL (5432), and Redis (6379) are exposed to host

## Volumes

### Persistent Volumes

- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `n8n_data`: n8n workflows and settings
- `backend_logs`: Application logs

### Development Volumes

- `.:/app`: Backend source code (live reload)
- `./client:/app`: Frontend source code (live reload)
- `/app/node_modules`: Cached dependencies

## Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping`
- **n8n**: HTTP request to `/healthz`
- **Backend**: HTTP request to `/api/health`
- **Frontend**: HTTP request to `/health` (production only)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001, 5432, 5678, 6379 are available
2. **Permission issues**: Ensure Docker has proper permissions
3. **Memory issues**: Increase Docker memory allocation if needed

### Debugging

```bash
# Check service status
make status

# Check service health
make health

# Access service shell
make shell-backend
make shell-frontend
make shell-db

# View resource usage
make monitor
```

### Cleanup

```bash
# Stop services
make stop

# Clean containers and images
make clean

# Deep clean (removes all data)
make clean-deep
```

## Production Deployment

For production deployment, use the production compose file:

```bash
# Build for production
make prod-build

# Start production environment
make prod-start
```

See `docker-compose.prod.yml` for production-specific configurations.

## Security Considerations

### Development

- Default passwords are used (change for production)
- Services are exposed on host network
- Debug logging is enabled
- CORS is permissive

### Production

- Use strong passwords and secrets
- Limit network exposure
- Enable proper logging levels
- Configure strict CORS policies
- Use SSL/TLS termination
- Implement proper backup strategies

## Performance Optimization

### Development

- Volume mounting for live reload
- Minimal image layers
- Shared node_modules volumes

### Production

- Multi-stage builds for smaller images
- Non-root user execution
- Optimized configurations
- Resource limits and health checks

## Monitoring

### Health Checks

All services include comprehensive health checks with:
- Appropriate intervals and timeouts
- Startup grace periods
- Retry logic

### Logging

- Structured JSON logging
- Log rotation and retention
- Centralized log collection ready

### Metrics

- Application metrics endpoints
- Resource usage monitoring
- Performance tracking capabilities