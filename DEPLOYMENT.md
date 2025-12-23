# Production Deployment Guide

## Overview
This guide covers deploying the Furious Five card game application to production.

## Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Docker (optional, for containerized deployment)

## Environment Configuration

### Required Environment Variables
Create a `.env` file based on `.env.example`:

```bash
# Application port (defaults to 5000 if unset)
PORT=5000

# The deployment environment (development | production)
NODE_ENV=production

# CORS origin (set to your domain or * for all)
CORS_ORIGIN=https://yourdomain.com
```

### Optional Environment Variables
- `CORS_ORIGIN`: Set to your frontend domain for security (default: `*`)

## Deployment Methods

### Method 1: Traditional Node.js Deployment

#### 1. Install Dependencies
```bash
npm ci --only=production
```

#### 2. Build the Application
```bash
npm run build
```

This will:
- Build the React frontend using Vite
- Bundle the Express backend using esbuild
- Output everything to the `dist/` directory

#### 3. Start the Production Server
```bash
npm start
```

The server will start on the port specified in the `PORT` environment variable (default: 5000).

### Method 2: Docker Deployment

#### 1. Build the Docker Image
```bash
docker build -t furious5:latest .
```

#### 2. Run the Container
```bash
docker run -d \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e CORS_ORIGIN=https://yourdomain.com \
  --name furious5-app \
  furious5:latest
```

#### 3. Using Docker Compose
Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - CORS_ORIGIN=https://yourdomain.com
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Run with:
```bash
docker-compose up -d
```

### Method 3: Cloud Platform Deployment

#### Deploying to Cloud Platforms

**General Requirements:**
- Build command: `npm run build`
- Start command: `npm start`
- Port: Uses `PORT` environment variable (defaults to 5000)

**Platform-Specific Notes:**

**Heroku:**
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com

# Deploy
git push heroku main
```

**Railway:**
- Connect your GitHub repository
- Railway will auto-detect the Node.js project
- Set environment variables in the Railway dashboard
- Deploy automatically on push

**Render:**
- Create a new Web Service
- Build Command: `npm run build`
- Start Command: `npm start`
- Set environment variables in the dashboard

**DigitalOcean App Platform:**
- Connect your repository
- Select Node.js environment
- Set build and run commands
- Configure environment variables

## Production Checklist

### Security
- [x] HTTPS enabled (handled by reverse proxy/platform)
- [x] Security headers configured (helmet)
- [x] Rate limiting enabled
- [x] CORS configured properly
- [x] Environment variables secured
- [x] No sensitive data in logs

### Performance
- [x] Response compression enabled
- [x] Static file caching
- [x] WebSocket connection handling
- [x] Graceful shutdown implemented

### Monitoring
- [x] Health check endpoint available at `/health`
- [ ] Consider adding application monitoring (e.g., Sentry)
- [ ] Consider adding performance monitoring (e.g., New Relic)
- [ ] Set up log aggregation if needed

### High Availability (Optional)
- [ ] Load balancer configuration
- [ ] Multiple instances/containers
- [ ] Session persistence strategy
- [ ] Database clustering (if using persistent storage)

## Health Checks

The application exposes a health check endpoint at `/health`:

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-23T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

## Monitoring and Logs

### Viewing Logs

**Docker:**
```bash
docker logs -f furious5-app
```

**Traditional Deployment:**
Logs are written to stdout/stderr. Use process managers like PM2:
```bash
npm install -g pm2
pm2 start npm --name "furious5" -- start
pm2 logs furious5
```

### Key Metrics to Monitor
- Response times (logged for API endpoints)
- Active WebSocket connections
- Memory usage
- CPU usage
- Error rates

## Scaling Considerations

### Horizontal Scaling
The application is stateless except for:
- In-memory game state storage
- WebSocket connections

For horizontal scaling, consider:
1. Using a shared database (PostgreSQL, MongoDB)
2. Using Redis for session storage
3. Implementing sticky sessions for WebSocket connections
4. Using a pub/sub system for multi-server communication

### Vertical Scaling
- Increase memory allocation for more concurrent games
- Increase CPU for faster game state calculations

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :5000
# Kill process
kill -9 <PID>
```

### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### WebSocket Connection Issues
- Ensure WebSocket endpoint `/ws` is not blocked by firewall
- Check that reverse proxy supports WebSocket upgrade
- Verify CORS settings allow WebSocket connections

### Container Issues
```bash
# View container logs
docker logs furious5-app

# Inspect container
docker inspect furious5-app

# Access container shell
docker exec -it furious5-app sh
```

## Maintenance

### Updating the Application
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build
npm run build

# Restart (Docker)
docker-compose restart

# Restart (PM2)
pm2 restart furious5
```

### Backup Considerations
Since the application uses in-memory storage by default:
- Game state is lost on restart
- Consider implementing persistent storage for production
- Back up any configuration files and environment variables

## Security Best Practices

1. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Use Environment Variables**
   - Never commit `.env` files
   - Use platform-specific secret management

3. **Regular Security Audits**
   - Monitor for vulnerabilities
   - Update Node.js and dependencies regularly

4. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Implement DDoS protection

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Check the health endpoint
4. Review the repository issues on GitHub

## Additional Resources

- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
