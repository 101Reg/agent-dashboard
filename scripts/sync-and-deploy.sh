#!/bin/bash
# Sync Agent OS data and deploy dashboard to Vercel
# Run after /learn or end of session
#
# Uses `vercel deploy --prod` directly instead of relying on
# GitHub → Vercel auto-deploy (which has silently broken 3-4 times).

set -e

DASHBOARD_DIR="$HOME/Claude-Projects/agent-dashboard"

cd "$DASHBOARD_DIR"

echo "Syncing Agent OS data..."
node scripts/sync-data.js

echo "Committing changes..."
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "Sync Agent OS data — $(date '+%Y-%m-%d %H:%M')"
  git push origin main || echo "WARNING: git push failed — continuing with direct Vercel deploy"
fi

echo "Deploying to Vercel (direct CLI — no webhook dependency)..."
if ! command -v vercel >/dev/null 2>&1; then
  echo "FATAL: vercel CLI not installed. Run: npm i -g vercel" >&2
  exit 1
fi

DEPLOY_URL=$(vercel deploy --prod --yes 2>&1 | tee /tmp/vercel-deploy.log | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
  echo "FATAL: vercel deploy produced no URL" >&2
  cat /tmp/vercel-deploy.log >&2
  exit 1
fi

# Verify the deploy is actually reachable
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "401" ]; then
  # 401 is expected for Vercel team projects with SSO protection
  echo "Deployed and reachable: $DEPLOY_URL (HTTP $HTTP_STATUS)"
else
  echo "WARNING: deployed to $DEPLOY_URL but HTTP status is $HTTP_STATUS"
  exit 1
fi
