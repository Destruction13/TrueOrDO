#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# PartyСhaos.ru — Update Script
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: sudo bash deploy/update.sh
# 
# Safe update: backup DB → pull code → rebuild → migrate → restart
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuration
APP_USER="partychaos"
APP_DIR="/opt/partychaos"
REPO_BRANCH="main"
DB_FILE="prod.db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pre-flight
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
    log_error "App not installed. Run install.sh first."
    exit 1
fi

cd "$APP_DIR"

log_info "Starting update for PartyСhaos.ru..."

# ═══════════════════════════════════════════════════════════════════════════════
# 1. BACKUP DATABASE
# ═══════════════════════════════════════════════════════════════════════════════
BACKUP_DIR="$APP_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/${DB_FILE}.$(date +%Y%m%d_%H%M%S).bak"
DB_PATH="$APP_DIR/server/prisma/$DB_FILE"

mkdir -p "$BACKUP_DIR"

if [[ -f "$DB_PATH" ]]; then
    log_info "Backing up database..."
    cp "$DB_PATH" "$BACKUP_FILE"
    chown "$APP_USER:$APP_USER" "$BACKUP_FILE"
    log_success "Database backed up to: $BACKUP_FILE"
    
    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/*.bak 2>/dev/null | tail -n +11 | xargs -r rm
else
    log_warn "No database file found, skipping backup"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. PULL LATEST CODE
# ═══════════════════════════════════════════════════════════════════════════════
# STRATEGY: Fast-forward only. If local changes exist, fail with clear message.
# All fixes must be in the remote repo — no local patches on server.

log_info "Pulling latest code from git..."

# Check for uncommitted changes
if ! sudo -u "$APP_USER" git diff --quiet 2>/dev/null || \
   ! sudo -u "$APP_USER" git diff --cached --quiet 2>/dev/null; then
    log_error "Uncommitted changes detected!"
    log_error "Commit and push them, or discard with:"
    log_error "  cd $APP_DIR && sudo -u $APP_USER git checkout -- ."
    exit 1
fi

sudo -u "$APP_USER" git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)

# Fast-forward merge (safe, fails if local commits exist)
if ! sudo -u "$APP_USER" git merge --ff-only "origin/$REPO_BRANCH" 2>/dev/null; then
    log_error "Cannot fast-forward! Local commits exist."
    log_error "Push them to origin, or reset with:"
    log_error "  cd $APP_DIR && sudo -u $APP_USER git reset --hard origin/$REPO_BRANCH"
    exit 1
fi

NEW_COMMIT=$(git rev-parse HEAD)

if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
    log_info "Already up to date (commit: ${NEW_COMMIT:0:8})"
else
    log_success "Updated: ${CURRENT_COMMIT:0:8} → ${NEW_COMMIT:0:8}"
fi

# Fix ownership after pull (in case new files were added)
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# 3. UPDATE DEPENDENCIES (if package-lock changed)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Updating dependencies..."

# Use custom npm cache to avoid permission issues
NPM_CACHE_DIR="$APP_DIR/.npm-cache"
sudo -u "$APP_USER" mkdir -p "$NPM_CACHE_DIR"

# Client dependencies
cd "$APP_DIR/client"
sudo -u "$APP_USER" npm ci --cache "$NPM_CACHE_DIR" 2>/dev/null || \
    sudo -u "$APP_USER" npm install --cache "$NPM_CACHE_DIR"

# Verify vite exists
if [[ ! -x "$APP_DIR/client/node_modules/.bin/vite" ]]; then
    log_error "vite not found after npm install!"
    exit 1
fi

# Server dependencies  
cd "$APP_DIR/server"
sudo -u "$APP_USER" npm ci --cache "$NPM_CACHE_DIR" 2>/dev/null || \
    sudo -u "$APP_USER" npm install --cache "$NPM_CACHE_DIR"

log_success "Dependencies updated"

# ═══════════════════════════════════════════════════════════════════════════════
# 4. REBUILD FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Building frontend..."
cd "$APP_DIR/client"
sudo -u "$APP_USER" npm run build

# Verify build succeeded
if [[ ! -f "$APP_DIR/client/dist/index.html" ]]; then
    log_error "Build failed! client/dist/index.html not found."
    exit 1
fi
log_success "Frontend built"

# ═══════════════════════════════════════════════════════════════════════════════
# 5. PRISMA MIGRATIONS
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Running Prisma migrations..."
cd "$APP_DIR/server"

# Generate Prisma client
sudo -u "$APP_USER" npx prisma generate

# Deploy any new migrations
sudo -u "$APP_USER" npx prisma migrate deploy

log_success "Database migrations applied"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. RESTART BACKEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Restarting backend..."

# Graceful reload with PM2
sudo -u "$APP_USER" pm2 reload partychaos --update-env

# Wait a moment for startup
sleep 2

# Check if running
if sudo -u "$APP_USER" pm2 show partychaos | grep -q "online"; then
    log_success "Backend restarted successfully"
else
    log_error "Backend failed to start! Check logs:"
    log_error "  sudo -u $APP_USER pm2 logs partychaos --lines 50"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 7. NGINX RELOAD (if config changed)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Checking nginx configuration..."
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log_success "Nginx reloaded"
else
    log_warn "Nginx config test failed, not reloading"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✓ Update Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Commit:${NC}      ${NEW_COMMIT:0:8}"
echo -e "  ${BLUE}Backup:${NC}      $BACKUP_FILE"
echo ""
echo -e "  ${BLUE}Run selftest:${NC} sudo bash $APP_DIR/deploy/selftest.sh"
echo ""
