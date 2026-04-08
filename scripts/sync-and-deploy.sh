#!/bin/bash
# Sync Agent OS data and deploy dashboard to Vercel
# Run after /learn or end of session

set -e

DASHBOARD_DIR="$HOME/Claude-Projects/agent-dashboard"

cd "$DASHBOARD_DIR"

echo "Syncing Agent OS data..."
node scripts/sync-data.js

echo "Committing and pushing to trigger Vercel deploy..."
git add -A
git diff --cached --quiet && echo "No changes to push." && exit 0
git commit -m "Sync Agent OS data — $(date '+%Y-%m-%d %H:%M')"
git push origin main 2>&1 && echo "Dashboard deployed via git push." || echo "WARNING: git push failed — Vercel deploy not triggered."
