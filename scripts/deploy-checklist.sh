#!/bin/bash

# Deployment Checklist Script
# Run this before deploying to verify everything is ready

echo "🔍 Snow White Laundry - Deployment Checklist"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Check environment variables
echo "📋 Checking Environment Variables..."
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo "  ❌ NEXT_PUBLIC_SITE_URL not set"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ NEXT_PUBLIC_SITE_URL: $NEXT_PUBLIC_SITE_URL"
fi
echo ""

# Check breadcrumb directory
echo "📁 Checking Breadcrumb Directory..."
if [ -d "swl-overshare/breadcrumbs" ]; then
    BREADCRUMB_COUNT=$(find swl-overshare/breadcrumbs -name "breadcrumb-swl-*.md" | wc -l | tr -d ' ')
    echo "  ✅ Breadcrumb directory exists"
    echo "  📊 Found $BREADCRUMB_COUNT breadcrumbs"
    if [ "$BREADCRUMB_COUNT" -lt 30 ]; then
        echo "  ⚠️  Low breadcrumb count (recommend 50+)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ Breadcrumb directory not found"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check updates directory
echo "📁 Checking Updates Directory..."
if [ -d "swl-overshare/updates" ]; then
    UPDATE_COUNT=$(find swl-overshare/updates -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✅ Updates directory exists"
    echo "  📊 Found $UPDATE_COUNT updates"
else
    echo "  ⚠️  Updates directory not found (will be created automatically)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check feed routes
echo "🔗 Checking Feed Routes..."
for feed in "src/app/overshare/feed.xml/route.ts" "src/app/overshare/atom.xml/route.ts" "src/app/overshare/index.json/route.ts"; do
    if [ -f "$feed" ]; then
        echo "  ✅ $(basename $(dirname $feed))"
    else
        echo "  ❌ Missing: $feed"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check update routes
echo "🔗 Checking Update Routes..."
for route in "src/app/api/updates/generate/route.ts" "src/app/api/updates/list/route.ts"; do
    if [ -f "$route" ]; then
        echo "  ✅ $(basename $(dirname $route))/$(basename $route)"
    else
        echo "  ❌ Missing: $route"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check monitoring routes
echo "🔗 Checking Monitoring Routes..."
for route in "src/app/api/monitoring/feeds/route.ts" "src/app/api/monitoring/validation/route.ts"; do
    if [ -f "$route" ]; then
        echo "  ✅ $(basename $(dirname $(dirname $route)))/$(basename $(dirname $route))/$(basename $route)"
    else
        echo "  ❌ Missing: $route"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check JSON-LD utility
echo "📦 Checking JSON-LD Utility..."
if [ -f "src/lib/jsonld.ts" ]; then
    echo "  ✅ JSON-LD utility exists"
else
    echo "  ❌ Missing: src/lib/jsonld.ts"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check vercel.json
echo "⚙️  Checking Vercel Configuration..."
if [ -f "vercel.json" ]; then
    echo "  ✅ vercel.json exists"
    if grep -q "crons" vercel.json; then
        echo "  ✅ Cron jobs configured"
    else
        echo "  ⚠️  No cron jobs found in vercel.json"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ⚠️  vercel.json not found (optional)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "📊 Summary"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ Ready to deploy!"
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  Review warnings before deploying"
    fi
    exit 0
else
    echo "❌ Fix errors before deploying"
    exit 1
fi
