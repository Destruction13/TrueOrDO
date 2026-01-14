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
log_info "Pulling latest code from git..."

# Stash any local changes (shouldn't be any, but just in case)
sudo -u "$APP_USER" git stash 2>/dev/null || true

# Fetch and reset
sudo -u "$APP_USER" git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
sudo -u "$APP_USER" git reset --hard "origin/$REPO_BRANCH"
NEW_COMMIT=$(git rev-parse HEAD)

if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
    log_info "Already up to date (commit: ${NEW_COMMIT:0:8})"
else
    log_success "Updated: ${CURRENT_COMMIT:0:8} → ${NEW_COMMIT:0:8}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. UPDATE DEPENDENCIES (if package-lock changed)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Checking dependencies..."

# Root
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --omit=dev 2>/dev/null || sudo -u "$APP_USER" npm install --omit=dev

# Client
cd "$APP_DIR/client"
sudo -u "$APP_USER" npm ci 2>/dev/null || sudo -u "$APP_USER" npm install

# Server
cd "$APP_DIR/server"
sudo -u "$APP_USER" npm ci 2>/dev/null || sudo -u "$APP_USER" npm install

log_success "Dependencies updated"

# ═══════════════════════════════════════════════════════════════════════════════
# 4. REBUILD FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Building frontend..."
cd "$APP_DIR/client"
sudo -u "$APP_USER" npm run build
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
