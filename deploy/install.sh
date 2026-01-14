#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# PartyСhaos.ru — Full Installation Script for Ubuntu 24.04 VPS
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: sudo bash deploy/install.sh
#
# STRATEGY: npm workspaces from root
# ─────────────────────────────────────────────────────────────────────────────────
# This project uses npm workspaces (defined in root package.json).
# npm hoists dependencies to /opt/partychaos/node_modules/.bin/
# We run `npm install` from the root and use `npm run build` which internally
# calls the client workspace build. This avoids issues with vite location.
#
# IDEMPOTENCY:
# Safe to run multiple times — brings system to desired state without breaking.
#
# GIT STRATEGY:
# Fast-forward only. No local modifications allowed on server.
# All fixes must be committed to remote repo.
# Untracked files (caches, logs, dist) are ignored in dirty check.
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
DOMAIN="partychaos.ru"
DOMAIN_WWW="www.partychaos.ru"
APP_USER="partychaos"
APP_DIR="/opt/partychaos"
REPO_URL="https://github.com/Destruction13/TrueOrDO.git"
REPO_BRANCH="main"
NODE_VERSION="20"  # LTS
BACKEND_PORT="3001"
DB_FILE="prod.db"  # Production database file

# Let's Encrypt email
LE_EMAIL="${LE_EMAIL:-admin@partychaos.ru}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Run npm command as APP_USER with proper environment
run_npm() {
    sudo -u "$APP_USER" \
        HOME="$APP_DIR" \
        NPM_CONFIG_CACHE="$APP_DIR/.npm-cache" \
        NPM_CONFIG_INCLUDE="dev" \
        npm "$@"
}

# Check if there are uncommitted changes in TRACKED files only
# Ignores untracked files (caches, logs, dist, etc.)
check_git_dirty() {
    local has_staged has_unstaged
    has_staged=$(sudo -u "$APP_USER" git diff --cached --name-only 2>/dev/null | wc -l)
    has_unstaged=$(sudo -u "$APP_USER" git diff --name-only 2>/dev/null | wc -l)
    
    if [[ "$has_staged" -gt 0 ]] || [[ "$has_unstaged" -gt 0 ]]; then
        return 0  # dirty
    fi
    return 1  # clean
}

# ═══════════════════════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════════════════════
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

log_info "Starting PartyСhaos.ru installation..."
log_info "Domain: $DOMAIN"
log_info "App directory: $APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# 1. SYSTEM DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Installing system dependencies..."

apt-get update -qq

apt-get install -y -qq \
    curl \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential \
    > /dev/null

log_success "System packages installed"

# ═══════════════════════════════════════════════════════════════════════════════
# 2. NODE.JS (via NodeSource)
# ═══════════════════════════════════════════════════════════════════════════════
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt $NODE_VERSION ]]; then
    log_info "Installing Node.js $NODE_VERSION LTS..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null
    log_success "Node.js $(node -v) installed"
else
    log_success "Node.js $(node -v) already installed"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. PM2 (Process Manager)
# ═══════════════════════════════════════════════════════════════════════════════
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    npm install -g pm2 > /dev/null 2>&1
    log_success "PM2 installed"
else
    log_success "PM2 already installed"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. SYSTEM USER
# ═══════════════════════════════════════════════════════════════════════════════
if ! id "$APP_USER" &>/dev/null; then
    log_info "Creating system user: $APP_USER"
    useradd --system --shell /bin/bash --home-dir "$APP_DIR" --create-home "$APP_USER"
    log_success "User $APP_USER created"
else
    log_success "User $APP_USER already exists"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 5. CLONE/UPDATE REPOSITORY
# ═══════════════════════════════════════════════════════════════════════════════
if [[ -d "$APP_DIR/.git" ]]; then
    log_info "Repository exists, updating..."
    cd "$APP_DIR"
    
    # Check for uncommitted changes in TRACKED files only
    if check_git_dirty; then
        log_error "Uncommitted changes detected in tracked files!"
        log_error "Changed files:"
        sudo -u "$APP_USER" git diff --name-only 2>/dev/null | head -10
        log_error ""
        log_error "Commit and push them to the repo, or discard with:"
        log_error "  cd $APP_DIR && sudo -u $APP_USER git checkout -- ."
        exit 1
    fi
    
    sudo -u "$APP_USER" git fetch origin
    
    # Try fast-forward merge
    if ! sudo -u "$APP_USER" git merge --ff-only "origin/$REPO_BRANCH" 2>/dev/null; then
        log_error "Cannot fast-forward! Local commits exist that are not in origin."
        log_error "Either push your local commits, or reset manually:"
        log_error "  cd $APP_DIR && sudo -u $APP_USER git reset --hard origin/$REPO_BRANCH"
        exit 1
    fi
    
    log_success "Repository updated"
else
    log_info "Cloning repository..."
    rm -rf "$APP_DIR"
    git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
    log_success "Repository cloned"
fi

cd "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# 5.1. FIX OWNERSHIP (CRITICAL)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Fixing ownership..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Create npm cache directory
NPM_CACHE_DIR="$APP_DIR/.npm-cache"
sudo -u "$APP_USER" mkdir -p "$NPM_CACHE_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# 5.2. CONFIGURE NPM FOR APP_USER
# ═══════════════════════════════════════════════════════════════════════════════
# Ensure devDependencies are installed (vite is a devDependency)
log_info "Configuring npm for $APP_USER..."

NPMRC_FILE="$APP_DIR/.npmrc"
sudo -u "$APP_USER" touch "$NPMRC_FILE"

# Set include=dev to ensure devDependencies are installed
# This overrides any global/user config that might have include=prod
sudo -u "$APP_USER" npm config set include dev --userconfig "$NPMRC_FILE"
sudo -u "$APP_USER" npm config set cache "$NPM_CACHE_DIR" --userconfig "$NPMRC_FILE"

log_success "npm configured (include=dev, cache=$NPM_CACHE_DIR)"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. NPM DEPENDENCIES (Workspaces from root)
# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGY: Install from root using npm workspaces.
# npm hoists dependencies to root node_modules/, which is expected behavior.
# We use `npm run build` from root which delegates to client workspace.
# This avoids issues with vite being in root vs client node_modules.

log_info "Installing npm dependencies (workspaces mode)..."
cd "$APP_DIR"

# Install all dependencies including devDependencies
# npm ci is preferred if package-lock.json exists and is in sync
if [[ -f "package-lock.json" ]]; then
    log_info "Using npm ci (lockfile found)..."
    run_npm ci --include=dev || {
        log_warn "npm ci failed, falling back to npm install..."
        run_npm install --include=dev
    }
else
    log_info "Using npm install (no lockfile)..."
    run_npm install --include=dev
fi

log_success "Dependencies installed"

# ═══════════════════════════════════════════════════════════════════════════════
# 7. BUILD FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════
# Use npm run build from root - it calls client's vite build via workspaces
# This works regardless of where npm hoisted the vite binary

log_info "Building frontend..."
cd "$APP_DIR"

# Build using root package.json script (delegates to client workspace)
run_npm run build

# Verify build output exists
if [[ ! -f "$APP_DIR/client/dist/index.html" ]]; then
    log_error "Build failed! client/dist/index.html not found."
    log_error "Check build logs above for errors."
    exit 1
fi

log_success "Frontend built to client/dist"

# ═══════════════════════════════════════════════════════════════════════════════
# 8. ENVIRONMENT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
ENV_FILE="$APP_DIR/server/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    log_info "Creating .env file..."
    
    SESSION_SECRET=$(openssl rand -hex 32)
    
    cat > "$ENV_FILE" << EOF
# ═══════════════════════════════════════════════════════════════════════════════
# Production Environment — PartyСhaos.ru
# Generated: $(date -Iseconds)
# ═══════════════════════════════════════════════════════════════════════════════

# Database (SQLite) - ABSOLUTE PATH for safety with PM2/systemd
DATABASE_URL="file:${APP_DIR}/server/prisma/${DB_FILE}"

# Server
PORT=${BACKEND_PORT}
NODE_ENV=production
CLIENT_ORIGIN=https://${DOMAIN}

# Session (auto-generated, keep secret!)
SESSION_SECRET=${SESSION_SECRET}

# App URLs
APP_BASE_URL=https://${DOMAIN}

# ═══════════════════════════════════════════════════════════════════════════════
# SMTP Configuration (REQUIRED for email features)
# ═══════════════════════════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="PartyСhaos <your-email@gmail.com>"

# ═══════════════════════════════════════════════════════════════════════════════
# OAuth (Optional)
# ═══════════════════════════════════════════════════════════════════════════════
# DISCORD_CLIENT_ID=
# DISCORD_CLIENT_SECRET=
# DISCORD_REDIRECT_URI=https://${DOMAIN}/api/auth/discord/callback

# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=https://${DOMAIN}/api/auth/google/callback
EOF

    chown "$APP_USER:$APP_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    log_success ".env file created"
    log_warn "⚠️  IMPORTANT: Edit $ENV_FILE to configure SMTP settings!"
else
    log_success ".env file already exists (not overwriting)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 9. PRISMA DATABASE SETUP
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Setting up database..."
cd "$APP_DIR/server"

# Generate Prisma client
run_npm exec prisma generate

# Deploy migrations (production-safe, creates DB if not exists)
run_npm exec prisma migrate deploy

log_success "Database ready: server/prisma/${DB_FILE}"

# Create backups directory
mkdir -p "$APP_DIR/backups"
chown "$APP_USER:$APP_USER" "$APP_DIR/backups"

# ═══════════════════════════════════════════════════════════════════════════════
# 10. UPLOADS DIRECTORY
# ═══════════════════════════════════════════════════════════════════════════════
mkdir -p "$APP_DIR/server/uploads/avatars"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/server/uploads"
log_success "Uploads directory ready"

# ═══════════════════════════════════════════════════════════════════════════════
# 11. NGINX CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Configuring nginx..."

NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat > "$NGINX_CONF" << 'NGINX_EOF'
# ═══════════════════════════════════════════════════════════════════════════════
# PartyСhaos.ru — Nginx Configuration
# ═══════════════════════════════════════════════════════════════════════════════

# Redirect www to non-www
server {
    listen 80;
    listen [::]:80;
    server_name www.partychaos.ru;
    return 301 https://partychaos.ru$request_uri;
}

# Main server block
server {
    listen 80;
    listen [::]:80;
    server_name partychaos.ru;

    location / {
        return 301 https://$server_name$request_uri;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name partychaos.ru;

    ssl_certificate /etc/letsencrypt/live/partychaos.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/partychaos.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    root /opt/partychaos/client/dist;
    index index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 3600s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.partychaos.ru;

    ssl_certificate /etc/letsencrypt/live/partychaos.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/partychaos.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://partychaos.ru$request_uri;
}
NGINX_EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

log_success "Nginx configuration created"

# ═══════════════════════════════════════════════════════════════════════════════
# 12. SSL CERTIFICATE (Let's Encrypt)
# ═══════════════════════════════════════════════════════════════════════════════
NGINX_TEMP="/etc/nginx/sites-available/${DOMAIN}-temp"

cat > "$NGINX_TEMP" << 'NGINX_TEMP_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name partychaos.ru www.partychaos.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 'Waiting for SSL setup...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP_EOF

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    log_success "SSL certificate already exists"
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/"$DOMAIN"
else
    log_info "Obtaining SSL certificate..."
    
    ln -sf "$NGINX_TEMP" /etc/nginx/sites-enabled/"$DOMAIN"
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t && systemctl reload nginx
    
    mkdir -p /var/www/html/.well-known/acme-challenge
    certbot certonly \
        --webroot \
        --webroot-path /var/www/html \
        -d "$DOMAIN" \
        -d "$DOMAIN_WWW" \
        --non-interactive \
        --agree-tos \
        --email "$LE_EMAIL" \
        || {
            log_error "Failed to obtain SSL certificate!"
            log_warn "Make sure DNS A records point to this server:"
            log_warn "  $DOMAIN → $(curl -s ifconfig.me)"
            log_warn "  $DOMAIN_WWW → $(curl -s ifconfig.me)"
            log_warn ""
            log_warn "Continuing without SSL. Backend will start, but HTTPS won't work."
        }
    
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/"$DOMAIN"
    log_success "SSL certificate obtained"
fi

rm -f "$NGINX_TEMP"

nginx -t && systemctl reload nginx
log_success "Nginx configured and running"

# ═══════════════════════════════════════════════════════════════════════════════
# 13. PM2 — START BACKEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Starting backend with PM2..."

cd "$APP_DIR/server"

sudo -u "$APP_USER" pm2 delete partychaos 2>/dev/null || true

sudo -u "$APP_USER" pm2 start src/index.js \
    --name "partychaos" \
    --cwd "$APP_DIR/server" \
    --node-args="--max-old-space-size=512"

sudo -u "$APP_USER" pm2 save

pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" | tail -1 | bash

log_success "Backend running with PM2"

# ═══════════════════════════════════════════════════════════════════════════════
# 14. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Running health check..."
sleep 3

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:${BACKEND_PORT}/api/health" 2>/dev/null || echo "000")

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    log_success "Backend health check passed (HTTP 200)"
else
    log_warn "Backend health check returned HTTP $HEALTH_RESPONSE"
    log_warn "Check logs: sudo -u $APP_USER pm2 logs partychaos --lines 50"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 15. FIREWALL (UFW)
# ═══════════════════════════════════════════════════════════════════════════════
if command -v ufw &> /dev/null; then
    log_info "Configuring firewall..."
    ufw allow 'Nginx Full' > /dev/null 2>&1
    ufw allow OpenSSH > /dev/null 2>&1
    log_success "Firewall rules added (run 'ufw enable' to activate)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 16. FIX OWNERSHIP (Final pass)
# ═══════════════════════════════════════════════════════════════════════════════
# Ensure everything is owned by APP_USER after all operations
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# DONE!
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✓ Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Website:${NC}     https://$DOMAIN"
echo -e "  ${BLUE}App dir:${NC}     $APP_DIR"
echo -e "  ${BLUE}Database:${NC}    $APP_DIR/server/prisma/${DB_FILE}"
echo -e "  ${BLUE}Logs:${NC}        sudo -u $APP_USER pm2 logs partychaos"
echo -e "  ${BLUE}Status:${NC}      sudo -u $APP_USER pm2 status"
echo ""
echo -e "  ${YELLOW}⚠️  Don't forget to configure SMTP in:${NC}"
echo -e "     $APP_DIR/server/.env"
echo ""
echo -e "  ${BLUE}Useful commands:${NC}"
echo -e "     Update:    sudo bash $APP_DIR/deploy/update.sh"
echo -e "     Selftest:  sudo bash $APP_DIR/deploy/selftest.sh"
echo -e "     Restart:   sudo -u $APP_USER pm2 restart partychaos"
echo -e "     Logs:      sudo -u $APP_USER pm2 logs partychaos --lines 100"
echo ""
