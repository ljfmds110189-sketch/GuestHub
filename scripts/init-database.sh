#!/bin/bash
#
# GuestHub Database Initialization Script
#
# Usage: ./scripts/init-database.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-guesthub}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Parse DATABASE_URL if provided
if [ -n "$DATABASE_URL" ]; then
    # Extract components from DATABASE_URL
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
fi

echo -e "${BLUE}🚀 GuestHub Database Initialization${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Host: ${DB_HOST}:${DB_PORT}"
echo -e "Database: ${DB_NAME}"
echo -e "User: ${DB_USER}"
echo ""

# Function to run SQL file
run_sql() {
    local file=$1
    local desc=$2
    echo -ne "  Running ${desc}... "
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file" > /dev/null 2>&1 && \
        echo -e "${GREEN}✓${NC}" || \
        echo -e "${YELLOW}⚠ (may already exist)${NC}"
}

# Check if PostgreSQL is available
echo -e "${YELLOW}Checking database connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL server${NC}"
    echo -e "Please check your database connection settings"
    exit 1
fi
echo -e "${GREEN}✓ Connected to PostgreSQL${NC}"
echo ""

# Create database if not exists
echo -e "${YELLOW}Creating database if not exists...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME"
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Run init scripts
echo -e "${YELLOW}Running initialization scripts...${NC}"
for file in db/init/*.sql; do
    [ -f "$file" ] && run_sql "$file" "$(basename $file)"
done
echo ""

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"
for file in db/migrations/*.sql; do
    [ -f "$file" ] && run_sql "$file" "$(basename $file)"
done
echo ""

# Show summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Database initialization complete!${NC}"
echo ""

# Show table count
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo -e "📊 Total tables: ${TABLE_COUNT}"

# Show some stats
echo ""
echo -e "${BLUE}Database Statistics:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM customers) as customers,
    (SELECT COUNT(*) FROM insurance_companies) as insurance_companies,
    (SELECT COUNT(*) FROM insurance_products) as insurance_products,
    (SELECT COUNT(*) FROM permissions) as permissions
"

echo ""
echo -e "${GREEN}🎉 GuestHub is ready!${NC}"
