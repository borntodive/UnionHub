#!/bin/bash

# Cleavr Deployment Script for UnionHub
# This script runs on the server during deployment

set -e

echo "🚀 Starting UnionHub deployment..."

# Navigate to app directory
cd /home/cleavr/$APP_NAME

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build application
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Run database migrations (optional - if you have TypeORM migrations)
# npm run migration:run

echo "✅ Build completed successfully!"
