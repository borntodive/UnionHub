#!/bin/bash

# SSL Setup Script for UnionHub
# Run this after first deploy to obtain Let's Encrypt certificate

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name required${NC}"
    echo "Usage: ./setup-ssl.sh your-domain.com"
    echo "Example: ./setup-ssl.sh api.unionhub.app"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-admin@$DOMAIN}

echo -e "${YELLOW}Setting up SSL for $DOMAIN${NC}"

# Create necessary directories
echo "Creating directories..."
mkdir -p certbot_data certbot_www

# Stop nginx temporarily to free port 80
echo "Stopping nginx..."
docker compose stop nginx || true

# Obtain certificate
echo "Obtaining Let's Encrypt certificate..."
docker run -it --rm \
    -v $(pwd)/certbot_data:/etc/letsencrypt \
    -v $(pwd)/certbot_www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --agree-tos \
    --no-eff-email \
    -m $EMAIL \
    -d $DOMAIN

# Update nginx config with actual domain
echo "Updating nginx configuration..."
sed -i "s/\${DOMAIN:-localhost}/$DOMAIN/g" nginx/nginx.conf

# Start all services
echo "Starting services..."
docker compose up -d

echo -e "${GREEN}✅ SSL certificate installed successfully!${NC}"
echo ""
echo "Your API is now available at:"
echo "  - HTTPS: https://$DOMAIN"
echo "  - HTTP:  http://$DOMAIN (redirects to HTTPS)"
echo ""
echo "Certificate will auto-renew. To check:"
echo "  docker compose logs certbot"
