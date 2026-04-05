#!/bin/bash
# Sync Agent OS data and deploy dashboard to Vercel
# Run after /learn or end of session

set -e

DASHBOARD_DIR="$HOME/Claude-Projects/agent-dashboard"

cd "$DASHBOARD_DIR"

echo "Syncing Agent OS data..."
node scripts/sync-data.js

echo "Deploying to Vercel..."
vercel deploy --prod --yes 2>&1 | grep -E "(Production|Aliased|error)" || true

echo "Dashboard deployed."
