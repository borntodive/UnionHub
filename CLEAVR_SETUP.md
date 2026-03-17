# Cleavr Setup Guide for UnionHub

## Prerequisites

- Cleavr account with active subscription
- Netcup VPS connected to Cleavr
- Domain: api.unionhub.app

## Step 1: Create Database

In Cleavr:
1. Go to **Databases** → **Add Database**
2. Type: PostgreSQL
3. Name: `unionhub`
4. Username: `unionhub`
5. Password: Generate secure password
6. Save credentials

## Step 2: Install Ollama (Manual)

SSH to server:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve &

# Pull model
ollama pull mistral

# Test
curl http://localhost:11434/api/tags
```

## Step 3: Create NodeJS App

In Cleavr:
1. **Sites** → **Add Site**
2. App Type: **NodeJS SSR**
3. Domain: `api.unionhub.app`
4. Repository: `https://github.com/borntodive/UnionHub`
5. Branch: `main`

### Build Settings

| Setting | Value |
|---------|-------|
| Entry Point | `api/dist/main.js` |
| Build Command | `cd api && npm ci && npm run build` |
| PM2 Config | `ecosystem.config.js` |

### Environment Variables

```
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=unionhub
DB_PASSWORD=<your-db-password>
DB_NAME=unionhub
JWT_SECRET=<your-jwt-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
```

## Step 4: SSL Certificate

In Cleavr:
1. Go to site settings
2. **SSL** → **Let's Encrypt**
3. Enable for `api.unionhub.app`

## Step 5: Deploy

1. Click **Deploy** in Cleavr
2. Monitor logs
3. Test: `https://api.unionhub.app/api/v1/health`

## File Structure on Server

```
/home/cleavr/unionhub/
├── api/
│   ├── dist/
│   ├── node_modules/
│   ├── src/
│   ├── package.json
│   └── ...
├── logs/
├── ecosystem.config.js
└── .env
```

## Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs unionhub-api

# Restart
pm2 restart unionhub-api
```

### Database connection error
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in Cleavr env vars

### Ollama not responding
- Check Ollama: `curl http://localhost:11434/api/tags`
- Restart: `ollama serve &`
