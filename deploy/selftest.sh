#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# PartyСhaos.ru — Self-Test Script
# ═══════════════════════════════════════════════════════════════════════════════
# Usage: sudo bash deploy/selftest.sh
# 
# Checks:
#   - Nginx running and config valid
#   - Backend running on port 3001
#   - HTTPS accessible
#   - Health endpoint responding
#   - WebSocket endpoint available
#   - Database file exists + owner + permissions
#   - Environment config (.env)
#   - SSL certificate expiry
# ═══════════════════════════════════════════════════════════════════════════════

# Configuration
DOMAIN="partychaos.ru"
APP_USER="partychaos"
APP_DIR="/opt/partychaos"
BACKEND_PORT="3001"
DB_FILE="prod.db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} PartyСhaos.ru — Self-Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# 1. NGINX
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[1/7] Nginx${NC}"

if systemctl is-active --quiet nginx; then
    check_pass "Nginx service is running"
else
    check_fail "Nginx service is NOT running"
fi

if nginx -t 2>/dev/null; then
    check_pass "Nginx config is valid"
else
    check_fail "Nginx config is INVALID"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. BACKEND PROCESS
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[2/7] Backend Process (PM2)${NC}"

if sudo -u "$APP_USER" pm2 show partychaos 2>/dev/null | grep -q "online"; then
    check_pass "PM2 process 'partychaos' is online"
    
    # Get uptime
    UPTIME=$(sudo -u "$APP_USER" pm2 show partychaos 2>/dev/null | grep "uptime" | awk '{print $4, $5}')
    if [[ -n "$UPTIME" ]]; then
        echo -e "       Uptime: $UPTIME"
    fi
else
    check_fail "PM2 process 'partychaos' is NOT running"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. PORT LISTENING
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[3/7] Port ${BACKEND_PORT}${NC}"

if ss -tlnp 2>/dev/null | grep -q ":${BACKEND_PORT}"; then
    check_pass "Port ${BACKEND_PORT} is listening"
else
    check_fail "Port ${BACKEND_PORT} is NOT listening"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. LOCAL HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[4/7] Local Health Check${NC}"

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:${BACKEND_PORT}/api/health" 2>/dev/null)

if [[ "$HEALTH_RESPONSE" == "200" ]]; then
    check_pass "GET /api/health → 200 OK"
else
    check_fail "GET /api/health → $HEALTH_RESPONSE (expected 200)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 5. HTTPS ACCESS
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[5/7] HTTPS Access${NC}"

# Check main domain
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${DOMAIN}/" 2>/dev/null)
if [[ "$HTTPS_CODE" == "200" ]]; then
    check_pass "https://${DOMAIN}/ → 200 OK"
else
    check_fail "https://${DOMAIN}/ → $HTTPS_CODE (expected 200)"
fi

# Check health via HTTPS
HTTPS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${DOMAIN}/api/health" 2>/dev/null)
if [[ "$HTTPS_HEALTH" == "200" ]]; then
    check_pass "https://${DOMAIN}/api/health → 200 OK"
else
    check_fail "https://${DOMAIN}/api/health → $HTTPS_HEALTH (expected 200)"
fi

# Check www redirect
WWW_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -L "https://www.${DOMAIN}/" 2>/dev/null)
if [[ "$WWW_CODE" == "200" ]]; then
    check_pass "https://www.${DOMAIN}/ redirects correctly"
else
    check_warn "https://www.${DOMAIN}/ → $WWW_CODE"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 6. WEBSOCKET / SOCKET.IO
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[6/7] WebSocket (Socket.IO)${NC}"

# Socket.IO handshake check (returns HTML/JSON on polling)
SOCKETIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}/socket.io/?EIO=4&transport=polling" 2>/dev/null)

if [[ "$SOCKETIO_CODE" == "200" ]] || [[ "$SOCKETIO_CODE" == "400" ]]; then
    # 400 is OK - means Socket.IO is responding but rejecting bad handshake
    check_pass "Socket.IO endpoint is accessible (HTTP $SOCKETIO_CODE)"
else
    check_fail "Socket.IO endpoint error: HTTP $SOCKETIO_CODE"
fi

# Local check
SOCKETIO_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:${BACKEND_PORT}/socket.io/?EIO=4&transport=polling" 2>/dev/null)
if [[ "$SOCKETIO_LOCAL" == "200" ]] || [[ "$SOCKETIO_LOCAL" == "400" ]]; then
    check_pass "Socket.IO local endpoint responding"
else
    check_fail "Socket.IO local endpoint error: HTTP $SOCKETIO_LOCAL"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 7. DATABASE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[7/9] Database${NC}"

DB_PATH="$APP_DIR/server/prisma/$DB_FILE"

if [[ -f "$DB_PATH" ]]; then
    check_pass "Database file exists: $DB_FILE"
    
    # Check size
    DB_SIZE=$(du -h "$DB_PATH" 2>/dev/null | cut -f1)
    echo -e "       Size: $DB_SIZE"
    
    # Check owner (CRITICAL - must be APP_USER for PM2 to write)
    DB_OWNER=$(stat -c '%U' "$DB_PATH" 2>/dev/null)
    if [[ "$DB_OWNER" == "$APP_USER" ]]; then
        check_pass "Database owner: $APP_USER ✓"
    else
        check_fail "Database owner is '$DB_OWNER' (should be '$APP_USER')"
    fi
    
    # Check permissions (should be readable/writable by owner)
    DB_PERMS=$(stat -c '%a' "$DB_PATH" 2>/dev/null)
    if [[ "$DB_PERMS" =~ ^6 ]]; then
        check_pass "Database permissions: $DB_PERMS (rw for owner)"
    else
        check_warn "Database permissions: $DB_PERMS (consider 644 or 600)"
    fi
    
    # Check that user can actually write (test with sudo -u)
    if sudo -u "$APP_USER" test -w "$DB_PATH" 2>/dev/null; then
        check_pass "User $APP_USER can write to database"
    else
        check_fail "User $APP_USER CANNOT write to database!"
    fi
else
    check_fail "Database file NOT found: $DB_PATH"
fi

# Check backups
BACKUP_COUNT=$(ls -1 "$APP_DIR/backups"/*.bak 2>/dev/null | wc -l)
if [[ "$BACKUP_COUNT" -gt 0 ]]; then
    LATEST_BACKUP=$(ls -t "$APP_DIR/backups"/*.bak 2>/dev/null | head -1)
    check_pass "Found $BACKUP_COUNT backup(s)"
    echo -e "       Latest: $(basename "$LATEST_BACKUP")"
else
    check_warn "No backups found in $APP_DIR/backups/"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 8. ENVIRONMENT FILE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[8/9] Environment Config${NC}"

ENV_FILE="$APP_DIR/server/.env"
if [[ -f "$ENV_FILE" ]]; then
    check_pass ".env file exists"
    
    # Check it's not world-readable (security)
    ENV_PERMS=$(stat -c '%a' "$ENV_FILE" 2>/dev/null)
    if [[ "$ENV_PERMS" == "600" ]] || [[ "$ENV_PERMS" == "640" ]]; then
        check_pass ".env permissions: $ENV_PERMS (secure)"
    else
        check_warn ".env permissions: $ENV_PERMS (recommend 600)"
    fi
    
    # Check DATABASE_URL uses absolute path
    if grep -q "DATABASE_URL.*file:/opt" "$ENV_FILE" 2>/dev/null; then
        check_pass "DATABASE_URL uses absolute path"
    elif grep -q "DATABASE_URL.*file:\\./" "$ENV_FILE" 2>/dev/null; then
        check_fail "DATABASE_URL uses RELATIVE path (dangerous!)"
    else
        check_warn "DATABASE_URL format unclear"
    fi
    
    # Check NODE_ENV=production
    if grep -q "NODE_ENV=production" "$ENV_FILE" 2>/dev/null; then
        check_pass "NODE_ENV=production is set"
    else
        check_warn "NODE_ENV=production not found"
    fi
else
    check_fail ".env file NOT found"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SSL CERTIFICATE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}[9/9] SSL Certificate${NC}"

CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [[ -f "$CERT_FILE" ]]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    
    if [[ "$DAYS_LEFT" -gt 30 ]]; then
        check_pass "SSL certificate valid ($DAYS_LEFT days left)"
    elif [[ "$DAYS_LEFT" -gt 0 ]]; then
        check_warn "SSL certificate expires in $DAYS_LEFT days!"
    else
        check_fail "SSL certificate EXPIRED!"
    fi
else
    check_fail "SSL certificate not found"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"

TOTAL=$((PASSED + FAILED))

if [[ "$FAILED" -eq 0 ]]; then
    echo -e "${GREEN} ✓ All $PASSED checks passed!${NC}"
    if [[ "$WARNINGS" -gt 0 ]]; then
        echo -e "${YELLOW}   ($WARNINGS warnings)${NC}"
    fi
    EXIT_CODE=0
else
    echo -e "${RED} ✗ $FAILED of $TOTAL checks failed${NC}"
    if [[ "$WARNINGS" -gt 0 ]]; then
        echo -e "${YELLOW}   ($WARNINGS warnings)${NC}"
    fi
    EXIT_CODE=1
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Quick help for common issues
if [[ "$FAILED" -gt 0 ]]; then
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  - Check logs:     sudo -u $APP_USER pm2 logs partychaos --lines 50"
    echo "  - Restart PM2:    sudo -u $APP_USER pm2 restart partychaos"
    echo "  - Restart nginx:  sudo systemctl restart nginx"
    echo "  - Check DNS:      dig $DOMAIN +short"
    echo ""
fi

exit $EXIT_CODE
