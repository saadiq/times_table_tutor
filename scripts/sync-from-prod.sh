#!/bin/bash

# Sync production database to local development
# Usage: ./scripts/sync-from-prod.sh [--skip-verify]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_VERIFY=false
if [ "$1" = "--skip-verify" ]; then
    SKIP_VERIFY=true
fi

# Database name
DB_NAME="ttt-db"

# Temporary file for export
TEMP_EXPORT="/tmp/ttt-prod-export-$(date +%s).sql"

# Get to the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${BLUE}🔄 Starting production to local database sync...${NC}"
echo ""

# Step 1: Export production database (data only)
echo -e "${YELLOW}📥 Step 1/4: Exporting production database...${NC}"
bunx wrangler d1 export $DB_NAME --remote --no-schema --output "$TEMP_EXPORT"

if [ ! -f "$TEMP_EXPORT" ]; then
    echo -e "${RED}❌ Failed to export production database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Production data exported successfully${NC}"
echo ""

# Step 2: Reset local database with schema
echo -e "${YELLOW}🗑️  Step 2/4: Resetting local database...${NC}"
bunx wrangler d1 execute $DB_NAME --local --persist-to=.wrangler/state --file="schema.sql"

echo -e "${GREEN}✅ Local database reset with schema${NC}"
echo ""

# Step 3: Import production data to local
echo -e "${YELLOW}📤 Step 3/4: Importing production data to local...${NC}"

# Find the local D1 database file
DB_FILE=$(find ".wrangler/state/v3/d1/miniflare-D1DatabaseObject" -name "*.sqlite" -type f 2>/dev/null | head -1)

if [ -z "$DB_FILE" ]; then
    echo -e "${YELLOW}   Local database file not found, trying wrangler import...${NC}"
    # Fall back to wrangler import (may hang but should work)
    timeout 30 bunx wrangler d1 execute $DB_NAME --local --persist-to=.wrangler/state --file="$TEMP_EXPORT" || true
else
    # Import using sqlite3 directly (bypasses wrangler bug)
    sqlite3 "$DB_FILE" < "$TEMP_EXPORT" 2>&1
fi

# Verify the import worked
IMPORT_CHECK=$(bunx wrangler d1 execute $DB_NAME --local --persist-to=.wrangler/state --command="SELECT COUNT(*) as count FROM profiles" 2>&1 | grep '"count"' | grep -o '[0-9]*' | head -1)
if [ -n "$IMPORT_CHECK" ] && [ "$IMPORT_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ Production data imported to local database ($IMPORT_CHECK profiles)${NC}"
else
    echo -e "${RED}❌ Import may have failed - no data found in local database${NC}"
    exit 1
fi
echo ""

# Step 4: Verify sync (unless skipped)
if [ "$SKIP_VERIFY" = false ]; then
    echo -e "${YELLOW}🔍 Step 4/4: Verifying sync...${NC}"

    # Helper function to get table count
    get_count() {
        local db_flag="$1"
        local table="$2"
        bunx wrangler d1 execute $DB_NAME $db_flag --command="SELECT COUNT(*) as count FROM $table" 2>&1 | grep '"count"' | grep -o '[0-9]*' | head -1
    }

    echo ""
    echo "  Database row counts:"
    echo "  ┌─────────────────────┬─────────┬────────────┐"
    echo "  │ Table               │ Local   │ Production │"
    echo "  ├─────────────────────┼─────────┼────────────┤"

    LOCAL_PROFILES=$(get_count "--local --persist-to=.wrangler/state" "profiles")
    PROD_PROFILES=$(get_count "--remote" "profiles")
    printf "  │ %-19s │ %-7s │ %-10s │\n" "profiles" "$LOCAL_PROFILES" "$PROD_PROFILES"

    LOCAL_FACTS=$(get_count "--local --persist-to=.wrangler/state" "fact_progress")
    PROD_FACTS=$(get_count "--remote" "fact_progress")
    printf "  │ %-19s │ %-7s │ %-10s │\n" "fact_progress" "$LOCAL_FACTS" "$PROD_FACTS"

    LOCAL_GARDEN=$(get_count "--local --persist-to=.wrangler/state" "garden_items")
    PROD_GARDEN=$(get_count "--remote" "garden_items")
    printf "  │ %-19s │ %-7s │ %-10s │\n" "garden_items" "$LOCAL_GARDEN" "$PROD_GARDEN"

    LOCAL_STATS=$(get_count "--local --persist-to=.wrangler/state" "profile_stats")
    PROD_STATS=$(get_count "--remote" "profile_stats")
    printf "  │ %-19s │ %-7s │ %-10s │\n" "profile_stats" "$LOCAL_STATS" "$PROD_STATS"

    LOCAL_ATTEMPTS=$(get_count "--local --persist-to=.wrangler/state" "attempts")
    PROD_ATTEMPTS=$(get_count "--remote" "attempts")
    printf "  │ %-19s │ %-7s │ %-10s │\n" "attempts" "$LOCAL_ATTEMPTS" "$PROD_ATTEMPTS"

    echo "  └─────────────────────┴─────────┴────────────┘"
    echo ""

    if [ -n "$LOCAL_PROFILES" ] && [ -n "$PROD_PROFILES" ] && \
       [ "$LOCAL_PROFILES" = "$PROD_PROFILES" ] && \
       [ "$LOCAL_FACTS" = "$PROD_FACTS" ] && \
       [ "$LOCAL_GARDEN" = "$PROD_GARDEN" ] && \
       [ "$LOCAL_STATS" = "$PROD_STATS" ] && \
       [ "$LOCAL_ATTEMPTS" = "$PROD_ATTEMPTS" ]; then
        echo -e "${GREEN}✅ Verification successful - counts match!${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Some counts don't match. This might be expected if production changed during sync.${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Step 4/4: Skipping verification (--skip-verify flag used)${NC}"
fi

# Clean up temporary file
echo ""
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
rm -f "$TEMP_EXPORT"

echo ""
echo -e "${GREEN}🎉 Database sync completed successfully!${NC}"
echo -e "${BLUE}   Your local database now contains production data.${NC}"
echo ""
