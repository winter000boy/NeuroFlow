# Production Deployment Guide

This guide covers deploying the Workflow Automation Platform to production environments.

## Overview

The platform supports multiple deployment strategies:
- **Docker Compose**: Simple single-server deployment
- **Kubernetes**: Scalable container orchestration
- **Cloud Platforms**: AWS, GCP, Azure with managed services

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 1Gbps

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 1Gbps+
- Load Balancer
- SSL Certificate

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- SSL Certificate (for HTTPS)

## Environment Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
```

### 2. Clone Repository

```bash
# Switch to deploy user
sudo su - deploy

# Clone repository
git clone <repository-url> workflow-platform
cd workflow-platform

# Checkout production branch
git checkout main
```

### 3. Environment Configuration

```bash
# Copy environment templates
cp .env.production .env
cp client/.env.production client/.env

# Edit environment files with your values
nano .env
nano client/.env
```

### 4. Secrets Management

```bash
# Copy secrets template
cp config/secrets.example.yml config/secrets.yml

# Edit secrets file (NEVER commit this file)
nano config/secrets.yml

# Set proper permissions
chmod 600 config/secrets.yml
```

## Deployment Methods

### Method 1: Docker Compose (Recommended for Single Server)

#### Quick Deployment

```bash
# Deploy to production
./scripts/deploy.sh --env production

# Or step by step:
./scripts/deploy.sh --build-only --env production
./scripts/deploy.sh --env production
```

#### Manual Deployment

```bash
# 1. Build images
docker build -f Dockerfile.prod -t workflow-platform-backend:production .
cd client && docker build -f Dockerfile.prod -t workflow-platform-frontend:production . && cd ..

# 2. Run migrations
./scripts/migrate.sh --env production

# 3. Start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
curl http://localhost/health
curl http://localhost:3001/api/health
```

### Method 2: Kubernetes

#### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace workflow-platform

# Create secrets
kubectl create secret generic workflow-secrets \
  --from-file=config/secrets.yml \
  --namespace=workflow-platform

# Deploy using Helm
helm install workflow-platform ./k8s/helm-chart \
  --namespace=workflow-platform \
  --values=k8s/values.production.yml
```

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom Certificates

```bash
# Copy certificates
sudo cp your-cert.pem /etc/ssl/certs/
sudo cp your-key.pem /etc/ssl/private/

# Update environment variables
SSL_CERT_PATH=/etc/ssl/certs/your-cert.pem
SSL_KEY_PATH=/etc/ssl/private/your-key.pem
```

## Database Setup

### PostgreSQL Configuration

#### Using Managed Database (Recommended)

```bash
# AWS RDS, Google Cloud SQL, or Azure Database
DATABASE_URL=postgresql://username:password@managed-db-host:5432/database
```

#### Self-Hosted PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE wf_db_prod;
CREATE USER wf_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE wf_db_prod TO wf_user;
\q

# Configure connection
DATABASE_URL=postgresql://wf_user:secure_password@localhost:5432/wf_db_prod
```

### Database Migrations

```bash
# Run migrations
./scripts/migrate.sh --env production

# Seed initial data (optional)
./scripts/migrate.sh --env production --seed
```

## Monitoring and Logging

### Health Checks

```bash
# Application health
curl http://localhost:3001/api/health/detailed

# Service status
docker-compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

### Log Management

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Log rotation (add to crontab)
0 2 * * * docker system prune -f
```

### Monitoring Setup

#### Prometheus + Grafana

```bash
# Deploy monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
# http://localhost:3000 (admin/admin)
```

#### External Monitoring

```bash
# Sentry for error tracking
SENTRY_DSN=https://your-sentry-dsn

# Datadog for metrics
DATADOG_API_KEY=your-datadog-api-key

# New Relic for APM
NEW_RELIC_LICENSE_KEY=your-newrelic-license-key
```

## Backup and Recovery

### Automated Backups

```bash
# Setup automated backups
crontab -e

# Daily backup at 2 AM
0 2 * * * /home/deploy/workflow-platform/scripts/backup.sh

# Weekly cleanup (keep 30 days)
0 3 * * 0 find /home/deploy/workflow-platform/backups -name "*.sql.gz" -mtime +30 -delete
```

### Manual Backup

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
gunzip -c backups/backup_wf_db_20240115_020000.sql.gz | psql $DATABASE_URL
```

### Disaster Recovery

```bash
# Full system backup
tar -czf system-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /home/deploy/workflow-platform

# Upload to cloud storage
aws s3 cp system-backup-$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

## Security Hardening

### Firewall Configuration

```bash
# UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3001/tcp  # Block direct API access
sudo ufw deny 5432/tcp  # Block direct DB access
```

### Security Headers

```nginx
# Nginx security headers (already in nginx.prod.conf)
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Environment Security

```bash
# Secure environment files
chmod 600 .env config/secrets.yml

# Use strong passwords
openssl rand -base64 32  # Generate secure passwords

# Regular security updates
sudo apt update && sudo apt upgrade -y
```

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_workflows_user_id ON workflows(user_id);
CREATE INDEX CONCURRENTLY idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX CONCURRENTLY idx_executions_status ON executions(status);
CREATE INDEX CONCURRENTLY idx_executions_created_at ON executions(created_at);
```

### Caching Configuration

```bash
# Redis configuration for production
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=secure_redis_password

# Enable application caching
CACHE_ENABLED=true
CACHE_TTL=3600
```

### Load Balancing

```nginx
# Nginx upstream configuration
upstream backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale with load balancer
# Add multiple backend instances behind nginx/haproxy
```

### Vertical Scaling

```bash
# Increase resource limits
# Update docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check environment variables
docker-compose -f docker-compose.prod.yml exec backend env

# Check database connection
docker-compose -f docker-compose.prod.yml exec backend npx prisma db execute --stdin <<< "SELECT 1;"
```

#### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify network connectivity
docker-compose -f docker-compose.prod.yml exec backend ping postgres
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Monitor database performance
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
docker-compose -f docker-compose.prod.yml logs backend | grep "slow query"
```

### Emergency Procedures

#### Rollback Deployment

```bash
# Stop current services
docker-compose -f docker-compose.prod.yml down

# Restore from backup
gunzip -c backups/backup_wf_db_$(date +%Y%m%d).sql.gz | psql $DATABASE_URL

# Start previous version
docker-compose -f docker-compose.prod.yml up -d
```

#### Database Recovery

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
./scripts/restore.sh backups/backup_wf_db_20240115_020000.sql.gz

# Start application
docker-compose -f docker-compose.prod.yml start backend
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker resources
docker system prune -f

# Rotate logs
docker-compose -f docker-compose.prod.yml logs --tail=0 > /dev/null

# Check disk space
df -h

# Check service health
curl -f http://localhost/health
curl -f http://localhost:3001/api/health
```

### Updates and Patches

```bash
# Update application
git pull origin main
./scripts/deploy.sh --env production

# Update dependencies
npm audit fix
cd client && npm audit fix && cd ..

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Support and Documentation

### Monitoring Dashboards

- Application Health: `/api/health/detailed`
- Metrics: `/api/health/metrics`
- API Documentation: `/api/docs`

### Log Locations

- Application Logs: `logs/app.log`
- Docker Logs: `docker-compose logs`
- System Logs: `/var/log/syslog`

### Contact Information

- Technical Support: support@workflowplatform.com
- Emergency Contact: emergency@workflowplatform.com
- Documentation: https://docs.workflowplatform.com