#!/bin/bash

# Production deployment script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$NODE_ENV" ]; then
    echo -e "${YELLOW}Warning: NODE_ENV not set, defaulting to production${NC}"
    export NODE_ENV=production
fi

echo -e "${GREEN}✓${NC} Environment: $NODE_ENV"

# Install all dependencies (including dev deps needed for build)
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build completed successfully"

# Prune dev dependencies after build (server now uses dynamic imports for dev-only deps)
echo "🧹 Removing dev dependencies..."
npm prune --production

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "🔄 Deploying with PM2..."
    
    # Stop existing process if running
    pm2 stop furious5 2>/dev/null || true
    pm2 delete furious5 2>/dev/null || true
    
    # Start with ecosystem file
    pm2 start ecosystem.config.js
    pm2 save
    
    echo -e "${GREEN}✓${NC} Application deployed with PM2"
    pm2 status
else
    echo -e "${YELLOW}Warning: PM2 not found${NC}"
    echo "Starting application with npm..."
    
    # Set NODE_ENV and start the application
    export NODE_ENV=production
    npm start &
    echo $! > .pid
    echo -e "${GREEN}✓${NC} Application started (PID: $(cat .pid))"
fi

# Wait a moment for the server to start
sleep 3

# Health check
echo "🏥 Performing health check..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-5000}/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓${NC} Health check passed"
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
else
    echo -e "${RED}✗${NC} Health check failed (HTTP $HEALTH_CHECK)"
    exit 1
fi

echo ""
echo "Application is running on port ${PORT:-5000}"
echo "Access health check: http://localhost:${PORT:-5000}/health"
