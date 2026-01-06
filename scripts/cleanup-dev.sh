#!/bin/bash

# Times Table Tutor Dev Environment Cleanup Script
# Kills phantom processes, clears port conflicts, and removes stale build artifacts

set -e

echo "🧹 Cleaning up times-table-tutor dev environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if anything was killed
KILLED_SOMETHING=false

# 1. Kill all wrangler processes
echo "🔍 Checking for wrangler processes..."
WRANGLER_PIDS=$(pgrep -f "wrangler" || true)
if [ -n "$WRANGLER_PIDS" ]; then
  echo -e "${YELLOW}Found wrangler processes: $WRANGLER_PIDS${NC}"
  pkill -f "wrangler" || true
  echo -e "${GREEN}✓ Killed wrangler processes${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ No wrangler processes found"
fi
echo ""

# 2. Kill all vite processes
echo "🔍 Checking for vite processes..."
VITE_PIDS=$(pgrep -f "vite" || true)
if [ -n "$VITE_PIDS" ]; then
  echo -e "${YELLOW}Found vite processes: $VITE_PIDS${NC}"
  pkill -f "vite" || true
  echo -e "${GREEN}✓ Killed vite processes${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ No vite processes found"
fi
echo ""

# 3. Kill bun dev processes (but not this script)
echo "🔍 Checking for bun dev processes..."
BUN_DEV_PIDS=$(pgrep -f "bun.*dev" | grep -v $$ || true)
if [ -n "$BUN_DEV_PIDS" ]; then
  echo -e "${YELLOW}Found bun dev processes: $BUN_DEV_PIDS${NC}"
  echo "$BUN_DEV_PIDS" | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Killed bun dev processes${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ No bun dev processes found"
fi
echo ""

# 4. Kill concurrently processes
echo "🔍 Checking for concurrently processes..."
CONCURRENTLY_PIDS=$(pgrep -f "concurrently" || true)
if [ -n "$CONCURRENTLY_PIDS" ]; then
  echo -e "${YELLOW}Found concurrently processes: $CONCURRENTLY_PIDS${NC}"
  pkill -f "concurrently" || true
  echo -e "${GREEN}✓ Killed concurrently processes${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ No concurrently processes found"
fi
echo ""

# 5. Clear port 8788 (wrangler API proxy)
echo "🔍 Checking port 8788 (API)..."
PORT_8788_PID=$(lsof -ti:8788 || true)
if [ -n "$PORT_8788_PID" ]; then
  echo -e "${YELLOW}Port 8788 in use by PID: $PORT_8788_PID${NC}"
  kill -9 $PORT_8788_PID 2>/dev/null || true
  echo -e "${GREEN}✓ Freed port 8788${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ Port 8788 is free"
fi
echo ""

# 6. Clear port 5173 (frontend)
echo "🔍 Checking port 5173 (frontend)..."
PORT_5173_PID=$(lsof -ti:5173 || true)
if [ -n "$PORT_5173_PID" ]; then
  echo -e "${YELLOW}Port 5173 in use by PID: $PORT_5173_PID${NC}"
  kill -9 $PORT_5173_PID 2>/dev/null || true
  echo -e "${GREEN}✓ Freed port 5173${NC}"
  KILLED_SOMETHING=true
else
  echo "✓ Port 5173 is free"
fi
echo ""

# 7. Clean Vite cache
echo "🔍 Checking for Vite cache..."
if [ -d "node_modules/.vite" ]; then
  echo -e "${YELLOW}Found Vite cache${NC}"
  rm -rf node_modules/.vite
  echo -e "${GREEN}✓ Removed Vite cache${NC}"
else
  echo "✓ No Vite cache to clean"
fi
echo ""

# 8. Clean git lock files
echo "🔍 Checking for git lock files..."
if [ -f ".git/index.lock" ]; then
  echo -e "${YELLOW}Found git lock file${NC}"
  rm -f .git/index.lock
  echo -e "${GREEN}✓ Removed git lock file${NC}"
else
  echo "✓ No git lock files"
fi
echo ""

# Give processes a moment to fully terminate
if [ "$KILLED_SOMETHING" = true ]; then
  echo "⏳ Waiting for processes to terminate..."
  sleep 2
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Cleanup complete!${NC}"
echo ""
echo "You can now run 'bun run dev' to start fresh."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
