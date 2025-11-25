#!/bin/bash

# Post-Deployment Verification Script
# Run this after deploying to verify everything works

BASE_URL=${NEXT_PUBLIC_SITE_URL:-"https://snowwhitelaundry.co"}

echo "🚀 Snow White Laundry - Post-Deployment Verification"
echo "====================================================="
echo ""
echo "Testing: $BASE_URL"
echo ""

ERRORS=0
WARNINGS=0

# Test RSS Feed
echo "📡 Testing RSS Feed..."
RSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/feed.xml" 2>/dev/null)
if [ "$RSS_STATUS" = "200" ]; then
    echo "  ✅ RSS feed accessible (HTTP $RSS_STATUS)"
    
    # Check if feed has content
    RSS_CONTENT=$(curl -s "$BASE_URL/overshare/feed.xml" | head -5)
    if echo "$RSS_CONTENT" | grep -q "rss"; then
        echo "  ✅ RSS feed contains valid XML"
    else
        echo "  ⚠️  RSS feed may be empty or invalid"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ RSS feed not accessible (HTTP $RSS_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test Atom Feed
echo "📡 Testing Atom Feed..."
ATOM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/atom.xml" 2>/dev/null)
if [ "$ATOM_STATUS" = "200" ]; then
    echo "  ✅ Atom feed accessible (HTTP $ATOM_STATUS)"
    
    # Check if feed has content
    ATOM_CONTENT=$(curl -s "$BASE_URL/overshare/atom.xml" | head -5)
    if echo "$ATOM_CONTENT" | grep -q "feed"; then
        echo "  ✅ Atom feed contains valid XML"
    else
        echo "  ⚠️  Atom feed may be empty or invalid"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ Atom feed not accessible (HTTP $ATOM_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test JSON Feed
echo "📡 Testing JSON Feed..."
JSON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/index.json" 2>/dev/null)
if [ "$JSON_STATUS" = "200" ]; then
    echo "  ✅ JSON feed accessible (HTTP $JSON_STATUS)"
    
    # Check if feed has content
    JSON_CONTENT=$(curl -s "$BASE_URL/overshare/index.json" | head -5)
    if echo "$JSON_CONTENT" | grep -q "items"; then
        echo "  ✅ JSON feed contains valid content"
        
        # Count items
        if command -v jq &> /dev/null; then
            ITEM_COUNT=$(curl -s "$BASE_URL/overshare/index.json" | jq '.items | length' 2>/dev/null)
            echo "  📊 Found $ITEM_COUNT items in JSON feed"
        fi
    else
        echo "  ⚠️  JSON feed may be empty or invalid"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ JSON feed not accessible (HTTP $JSON_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test Monitoring Endpoints
echo "🔍 Testing Monitoring Endpoints..."

# Feed Monitoring
FEEDS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/monitoring/feeds" 2>/dev/null)
if [ "$FEEDS_STATUS" = "200" ]; then
    echo "  ✅ Feed monitoring accessible (HTTP $FEEDS_STATUS)"
    
    # Get health status
    if command -v jq &> /dev/null; then
        HEALTH_STATUS=$(curl -s "$BASE_URL/api/monitoring/feeds" | jq -r '.status' 2>/dev/null)
        BREADCRUMB_COUNT=$(curl -s "$BASE_URL/api/monitoring/feeds" | jq -r '.content.breadcrumbs' 2>/dev/null)
        UPDATE_COUNT=$(curl -s "$BASE_URL/api/monitoring/feeds" | jq -r '.content.updates' 2>/dev/null)
        
        echo "    Status: $HEALTH_STATUS"
        echo "    Breadcrumbs: $BREADCRUMB_COUNT"
        echo "    Updates: $UPDATE_COUNT"
    fi
else
    echo "  ❌ Feed monitoring not accessible (HTTP $FEEDS_STATUS)"
    ERRORS=$((ERRORS + 1))
fi

# Validation Monitoring
VALIDATION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/monitoring/validation" 2>/dev/null)
if [ "$VALIDATION_STATUS" = "200" ]; then
    echo "  ✅ Validation monitoring accessible (HTTP $VALIDATION_STATUS)"
    
    # Get validation status
    if command -v jq &> /dev/null; then
        VAL_STATUS=$(curl -s "$BASE_URL/api/monitoring/validation" | jq -r '.status' 2>/dev/null)
        ISSUE_COUNT=$(curl -s "$BASE_URL/api/monitoring/validation" | jq -r '.validation.summary.totalIssues' 2>/dev/null)
        WARNING_COUNT=$(curl -s "$BASE_URL/api/monitoring/validation" | jq -r '.validation.summary.totalWarnings' 2>/dev/null)
        
        echo "    Status: $VAL_STATUS"
        echo "    Issues: $ISSUE_COUNT"
        echo "    Warnings: $WARNING_COUNT"
    fi
else
    echo "  ❌ Validation monitoring not accessible (HTTP $VALIDATION_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test Sitemap
echo "🗺️  Testing Sitemap..."
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml" 2>/dev/null)
if [ "$SITEMAP_STATUS" = "200" ]; then
    echo "  ✅ Sitemap accessible (HTTP $SITEMAP_STATUS)"
    
    # Count URLs in sitemap
    URL_COUNT=$(curl -s "$BASE_URL/sitemap.xml" | grep -o "<loc>" | wc -l | tr -d ' ')
    echo "  📊 Found $URL_COUNT URLs in sitemap"
else
    echo "  ❌ Sitemap not accessible (HTTP $SITEMAP_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test Sample Breadcrumb Page
echo "📄 Testing Sample Breadcrumb Page..."
BREADCRUMB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/swl-intention" 2>/dev/null)
if [ "$BREADCRUMB_STATUS" = "200" ]; then
    echo "  ✅ Breadcrumb page accessible (HTTP $BREADCRUMB_STATUS)"
    
    # Check for JSON-LD
    JSON_LD=$(curl -s "$BASE_URL/overshare/swl-intention" | grep -o 'application/ld\+json' | wc -l | tr -d ' ')
    if [ "$JSON_LD" -gt 0 ]; then
        echo "  ✅ JSON-LD structured data found"
    else
        echo "  ⚠️  JSON-LD structured data not found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  ❌ Breadcrumb page not accessible (HTTP $BREADCRUMB_STATUS)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "====================================================="
echo "📊 Summary"
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ All critical checks passed!"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Validate feeds at: https://validator.w3.org/feed/"
    echo "  2. Submit sitemap to Google Search Console"
    echo "  3. Submit sitemap to Bing Webmaster Tools"
    echo "  4. Test structured data at: https://search.google.com/test/rich-results"
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  Review warnings above"
    fi
    exit 0
else
    echo "❌ Some checks failed. Review errors above."
    echo ""
    echo "💡 Troubleshooting:"
    echo "  - Verify deployment completed successfully"
    echo "  - Check NEXT_PUBLIC_SITE_URL is set correctly"
    echo "  - Review Vercel deployment logs"
    echo "  - Ensure all files are committed and pushed"
    exit 1
fi
