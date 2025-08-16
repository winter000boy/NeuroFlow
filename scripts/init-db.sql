-- Database initialization script
-- This script runs when PostgreSQL container starts for the first time

-- Create additional databases if needed
CREATE DATABASE IF NOT EXISTS n8n;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance (will be created by Prisma migrations)
-- These are just examples and will be handled by Prisma

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed at %', NOW();
END $$;