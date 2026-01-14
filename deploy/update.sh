#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# PartyСhaos.ru — Update Script
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: sudo bash deploy/update.sh
#
# Safe update: backup DB → pull code → rebuild → migrate → restart
#
# STRATEGY: npm workspaces from root (same as install.sh)
# ─────────────────────────────────────────────────────────────────────────────────
# Dependencies are installed from root with workspaces mode.
# Build is done via `npm run build` from root.
# This ensures vite works regardless of hoisting location.
#
# GIT STRATEGY:
# Fast-forward only. Checks only TRACKED files for changes.
# Untracked files (caches, logs, dist, node_modules) are ignored.
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuration
APP_USER="partychaos"
APP_DIR="/opt/partychaos"
REPO_BRANCH="main"
DB_FILE="prod.db"
BACKEND_PORT="3001"

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

# Check for uncommitted changes in TRACKED files only
# Untracked files (node_modules, dist, .npm-cache, etc.) are ignored
if check_git_dirty; then
    log_error "Uncommitted changes detected in tracked files!"
    log_error "Changed files:"
    sudo -u "$APP_USER" git diff --name-only 2>/dev/null | head -10
    sudo -u "$APP_USER" git diff --cached --name-only 2>/dev/null | head -10
    log_error ""
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

# Fix ownership after pull
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# 3. ENSURE NPM CONFIG
# ═══════════════════════════════════════════════════════════════════════════════
# Ensure devDependencies are installed (vite is a devDependency)
NPM_CACHE_DIR="$APP_DIR/.npm-cache"
NPMRC_FILE="$APP_DIR/.npmrc"

sudo -u "$APP_USER" mkdir -p "$NPM_CACHE_DIR"
sudo -u "$APP_USER" touch "$NPMRC_FILE"

# Ensure include=dev is set
if ! grep -q "include=dev" "$NPMRC_FILE" 2>/dev/null; then
    sudo -u "$APP_USER" npm config set include dev --userconfig "$NPMRC_FILE"
    sudo -u "$APP_USER" npm config set cache "$NPM_CACHE_DIR" --userconfig "$NPMRC_FILE"
    log_info "npm config updated (include=dev)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. UPDATE DEPENDENCIES (Workspaces from root)
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Updating dependencies (workspaces mode)..."
cd "$APP_DIR"

# Install all dependencies including devDependencies from root
if [[ -f "package-lock.json" ]]; then
    run_npm ci --include=dev || {
        log_warn "npm ci failed, falling back to npm install..."
        run_npm install --include=dev
    }
else
    run_npm install --include=dev
fi

log_success "Dependencies updated"

# ═══════════════════════════════════════════════════════════════════════════════
# 5. REBUILD FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Building frontend..."
cd "$APP_DIR"

# Build using root package.json script (delegates to client workspace)
run_npm run build

# Verify build succeeded
if [[ ! -f "$APP_DIR/client/dist/index.html" ]]; then
    log_error "Build failed! client/dist/index.html not found."
    exit 1
fi
log_success "Frontend built"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. PRISMA MIGRATIONS
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Running Prisma migrations..."
cd "$APP_DIR/server"

# Generate Prisma client
run_npm exec prisma generate

# Deploy any new migrations (production-safe)
run_npm exec prisma migrate deploy

log_success "Database migrations applied"

# ═══════════════════════════════════════════════════════════════════════════════
# 7. RESTART BACKEND
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Restarting backend..."

# Graceful reload with PM2
sudo -u "$APP_USER" pm2 reload partychaos --update-env

# Wait for startup
sleep 3

# Check if running
if sudo -u "$APP_USER" pm2 show partychaos 2>/dev/null | grep -q "online"; then
    log_success "Backend restarted successfully"
else
    log_error "Backend failed to start! Check logs:"
    log_error "  sudo -u $APP_USER pm2 logs partychaos --lines 50"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 8. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Running health check..."

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:${BACKEND_PORT}/api/health" 2>/dev/null || echo "000")

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    log_success "Backend health check passed (HTTP 200)"
else
    log_warn "Backend health check returned HTTP $HEALTH_RESPONSE"
    log_warn "Check logs: sudo -u $APP_USER pm2 logs partychaos --lines 50"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 9. NGINX RELOAD
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Checking nginx configuration..."
if nginx -t 2>/dev/null; then
    systemctl reload nginx
    log_success "Nginx reloaded"
else
    log_warn "Nginx config test failed, not reloading"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 10. FIX OWNERSHIP (Final pass)
# ═══════════════════════════════════════════════════════════════════════════════
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✓ Update Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Commit:${NC}      ${NEW_COMMIT:0:8}"
if [[ -f "$BACKUP_FILE" ]]; then
echo -e "  ${BLUE}Backup:${NC}      $BACKUP_FILE"
fi
echo ""
echo -e "  ${BLUE}Run selftest:${NC} sudo bash $APP_DIR/deploy/selftest.sh"
echo ""
