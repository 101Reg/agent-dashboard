#!/bin/bash
# Sync Agent OS data WITHOUT deploying to Vercel
# Used at session start for fresh local data

DASHBOARD_DIR="$HOME/Claude-Projects/agent-dashboard"

cd "$DASHBOARD_DIR"

echo "Syncing Agent OS data..."
node scripts/sync-data.js
