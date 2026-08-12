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

# ── Verify ───────────────────────────────────────────────────────────────────
# The per-deployment URL is behind Vercel SSO deployment protection, so an
# unauthenticated curl gets 302 -> vercel.com/sso-api. That is the check being
# unauthenticated, NOT the deploy being broken — the old version treated it as a
# hard failure and exited 1 on every single run (silent since callers pipe the
# output). Per debug-discipline.md § Verify Against Source of Truth: use the
# authenticated CLI for deployment state, then verify real content on a public
# alias. Diagnosed 2026-08-11.

INSPECT=$(vercel inspect "$DEPLOY_URL" 2>&1 || true)
STATE=$(printf '%s\n' "$INSPECT" | grep -E '^[[:space:]]*status' | awk '{print $NF}' | head -1)

if [ "$STATE" != "Ready" ]; then
  echo "FATAL: deployment state is '${STATE:-unknown}' (expected Ready) — $DEPLOY_URL" >&2
  printf '%s\n' "$INSPECT" | tail -20 >&2
  exit 1
fi
echo "Deployment Ready (authenticated CLI): $DEPLOY_URL"

# Content check. src/App.jsx fetches /data.json at runtime, so "the app serves
# valid JSON there" is the thing that actually matters — a 200 on the page alone
# would still pass with a stale or 404-shell payload. SSO-protected aliases 302
# and are skipped, not failed.
VERIFIED=""
for A in $(printf '%s\n' "$INSPECT" | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | sort -u); do
  CODE=$(curl -s -o /tmp/dash-data.json -w '%{http_code}' --max-time 20 "$A/data.json?t=$(date +%s)" || echo "000")
  if [ "$CODE" = "200" ] && node -e 'JSON.parse(require("fs").readFileSync("/tmp/dash-data.json","utf8"))' 2>/dev/null; then
    VERIFIED="$A"
    break
  fi
done

if [ -n "$VERIFIED" ]; then
  echo "Verified live: $VERIFIED/data.json serves valid JSON ($(wc -c < /tmp/dash-data.json | tr -d ' ') bytes)"
else
  echo "NOTE: deployment is Ready, but no public alias served /data.json to an"
  echo "      unauthenticated request. Deploy state verified via CLI; live content NOT verified."
fi
