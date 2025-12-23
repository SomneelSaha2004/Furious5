# Quick Deploy Guide

One-command deployment for popular platforms.

## 🚀 Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Click the button above or go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables:
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-app.railway.app`
4. Railway will auto-deploy on push to main

**Commands:**
```bash
# Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🟣 Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create your-furious5-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-furious5-app.herokuapp.com

# Deploy
git push heroku main

# View logs
heroku logs --tail

# Open app
heroku open
```

## 🎨 Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** furious5
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `CORS_ORIGIN=https://your-app.onrender.com`
5. Click "Create Web Service"

**render.yaml (optional):**
```yaml
services:
  - type: web
    name: furious5
    env: node
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: CORS_ORIGIN
        generateValue: true
```

## 🌊 DigitalOcean App Platform

```bash
# Install doctl CLI
snap install doctl
# or: brew install doctl

# Login
doctl auth init

# Create app (using spec file)
doctl apps create --spec digitalocean-app.yaml

# Or use the UI at cloud.digitalocean.com/apps
```

**digitalocean-app.yaml:**
```yaml
name: furious5
services:
- name: web
  github:
    repo: SomneelSaha2004/Furious5
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  envs:
  - key: NODE_ENV
    value: "production"
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 5000
```

## 🐳 Docker on VPS

**Any VPS (DigitalOcean, Linode, AWS EC2, etc.):**

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone https://github.com/SomneelSaha2004/Furious5.git
cd Furious5

# Create .env file
nano .env
# Add:
# NODE_ENV=production
# PORT=5000
# CORS_ORIGIN=https://yourdomain.com

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Update
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## ☸️ Kubernetes

**Prerequisites:** kubectl configured, cluster running

```bash
# Create namespace
kubectl create namespace furious5

# Create ConfigMap for environment variables
kubectl create configmap furious5-config \
  --from-literal=cors-origin="*" \
  -n furious5

# Deploy
kubectl apply -f k8s-deployment.yml -n furious5

# Check status
kubectl get pods -n furious5
kubectl get services -n furious5

# View logs
kubectl logs -f deployment/furious5-app -n furious5

# Scale
kubectl scale deployment/furious5-app --replicas=3 -n furious5
```

## ☁️ AWS (Elastic Beanstalk)

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-20 furious5

# Create environment
eb create furious5-prod

# Set environment variables
eb setenv NODE_ENV=production CORS_ORIGIN=https://your-app.elasticbeanstalk.com

# Deploy
eb deploy

# Open app
eb open

# View logs
eb logs
```

## 🔵 Azure (App Service)

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create resource group
az group create --name furious5-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name furious5-plan \
  --resource-group furious5-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --resource-group furious5-rg \
  --plan furious5-plan \
  --name your-furious5-app \
  --runtime "NODE|20-lts"

# Configure deployment
az webapp deployment source config \
  --name your-furious5-app \
  --resource-group furious5-rg \
  --repo-url https://github.com/SomneelSaha2004/Furious5 \
  --branch main \
  --manual-integration

# Set environment variables
az webapp config appsettings set \
  --resource-group furious5-rg \
  --name your-furious5-app \
  --settings NODE_ENV=production CORS_ORIGIN=https://your-furious5-app.azurewebsites.net
```

## 🔶 Google Cloud Run

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/furious5

# Deploy
gcloud run deploy furious5 \
  --image gcr.io/YOUR_PROJECT_ID/furious5 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production

# Get URL
gcloud run services describe furious5 --region us-central1 --format 'value(status.url)'
```

## 🚢 Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (creates fly.toml)
fly launch

# Set secrets
fly secrets set NODE_ENV=production
fly secrets set CORS_ORIGIN=https://your-app.fly.dev

# Deploy
fly deploy

# View logs
fly logs

# Scale
fly scale count 2
```

## 📊 Monitoring Setup

After deployment, set up monitoring:

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com) (Free)
- [Pingdom](https://www.pingdom.com)
- Monitor: `https://your-app.com/health`

**Application Monitoring:**
- [Sentry](https://sentry.io) - Error tracking
- [New Relic](https://newrelic.com) - Performance monitoring
- [LogRocket](https://logrocket.com) - Session replay

**Log Aggregation:**
- [Papertrail](https://papertrailapp.com)
- [Logtail](https://logtail.com)
- [CloudWatch](https://aws.amazon.com/cloudwatch) (AWS)

## 🔍 Post-Deployment Verification

After deploying to any platform:

```bash
# Check health endpoint
curl https://your-app.com/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123.45,"environment":"production"}

# Test WebSocket connection
wscat -c wss://your-app.com/ws

# Monitor logs for errors
# (platform-specific command)
```

## 💡 Tips

1. **Always test health endpoint first** after deployment
2. **Set CORS_ORIGIN** to your actual domain for security
3. **Enable auto-scaling** if expecting variable traffic
4. **Set up SSL/TLS** - most platforms do this automatically
5. **Configure environment-specific variables** properly
6. **Monitor logs** immediately after deployment
7. **Test WebSocket connections** work through your platform
8. **Set up alerts** for downtime or errors

## 🆘 Troubleshooting

**App won't start:**
- Check logs for build errors
- Verify `NODE_ENV=production` is set
- Ensure `PORT` environment variable is correct (or defaults to 5000)

**WebSocket connections fail:**
- Verify platform supports WebSocket upgrades
- Check proxy/load balancer configuration
- Ensure `/ws` path is not blocked

**CORS errors:**
- Set `CORS_ORIGIN` to your frontend domain
- Use `*` only for testing (insecure for production)

**Performance issues:**
- Scale up instances/containers
- Enable CDN for static assets
- Check memory/CPU limits
