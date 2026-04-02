#!/bin/bash
#
# GuestHub - Complete Server Deployment Script
#
# Prerequisites:
#   - Node.js 18+ or 20+
#   - PostgreSQL 14+ or 16+
#   - pnpm (or npm)
#
# Usage: ./scripts/deploy.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║            🏢 GuestHub Deployment Script                  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "  Node.js: ${GREEN}$NODE_VERSION${NC}"

# Check pnpm or npm
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    echo -e "${RED}❌ Neither pnpm nor npm is installed${NC}"
    exit 1
fi
echo -e "  Package Manager: ${GREEN}$PKG_MANAGER${NC}"

# Check PostgreSQL client
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ psql not found - database setup will use Node.js${NC}"
    USE_PSQL=false
else
    echo -e "  PostgreSQL Client: ${GREEN}$(psql --version)${NC}"
    USE_PSQL=true
fi

echo ""

# Load environment
if [ -f .env ]; then
    echo -e "${GREEN}✓ Found .env file${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${YELLOW}⚠ No .env file found. Creating from example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
        echo -e "${YELLOW}⚠ Please edit .env with your settings${NC}"
    else
        echo -e "${RED}❌ No .env.example found${NC}"
        cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/guesthub

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
COOKIE_SECURE=false

# Push Notifications (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# WhatsApp WAHA API (optional)
WAHA_API_URL=
WAHA_SESSION=default
WAHA_API_KEY=

# S3 Storage (optional)
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
S3_REGION=
EOF
        echo -e "${GREEN}✓ Created .env with defaults${NC}"
    fi
fi

echo ""

# Step 1: Install dependencies
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
$PKG_MANAGER install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Setup database
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🗄️ Step 2: Setting up database...${NC}"

if [ -f scripts/db-bootstrap.js ]; then
    node scripts/db-bootstrap.js
else
    $PKG_MANAGER run db:setup
fi
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Step 3: Build application
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔨 Step 3: Building application...${NC}"
$PKG_MANAGER run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 4: Create upload directories
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📁 Step 4: Creating upload directories...${NC}"
mkdir -p public/uploads/avatars
mkdir -p public/uploads/attachment
mkdir -p public/uploads/insurance
mkdir -p public/uploads/policies
chmod -R 755 public/uploads
echo -e "${GREEN}✓ Upload directories ready${NC}"
echo ""

# Done!
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║           ✅ Deployment Complete!                         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "Start the application with:"
echo -e "  ${CYAN}$PKG_MANAGER run start${NC}     (production)"
echo -e "  ${CYAN}$PKG_MANAGER run dev${NC}       (development)"
echo ""
echo -e "Or use Docker:"
echo -e "  ${CYAN}docker compose up -d${NC}"
echo ""
echo -e "Default admin credentials:"
echo -e "  Username: ${CYAN}admin${NC}"
echo -e "  Password: ${CYAN}admin123${NC}"
echo ""
