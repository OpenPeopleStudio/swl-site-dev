#!/bin/bash

# Monitoring Setup Script
# Helps set up initial monitoring after deployment

BASE_URL=${NEXT_PUBLIC_SITE_URL:-"https://snowwhitelaundry.co"}

echo "🔍 Snow White Laundry - Monitoring Setup"
echo "=========================================="
echo ""

echo "📋 Step 1: Verify Deployment"
echo "  Testing feed endpoints..."
echo ""

# Test feed endpoints
echo "  Testing RSS feed..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/feed.xml" | grep -q "200"; then
    echo "    ✅ RSS feed accessible"
else
    echo "    ❌ RSS feed not accessible"
fi

echo "  Testing Atom feed..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/atom.xml" | grep -q "200"; then
    echo "    ✅ Atom feed accessible"
else
    echo "    ❌ Atom feed not accessible"
fi

echo "  Testing JSON feed..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/overshare/index.json" | grep -q "200"; then
    echo "    ✅ JSON feed accessible"
else
    echo "    ❌ JSON feed not accessible"
fi

echo ""
echo "  Testing monitoring endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/monitoring/feeds" | grep -q "200"; then
    echo "    ✅ Feed monitoring accessible"
else
    echo "    ❌ Feed monitoring not accessible"
fi

if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/monitoring/validation" | grep -q "200"; then
    echo "    ✅ Validation monitoring accessible"
else
    echo "    ❌ Validation monitoring not accessible"
fi

echo ""
echo "📋 Step 2: Feed Validation"
echo ""
echo "  Validate feeds at:"
echo "    RSS: https://validator.w3.org/feed/check.cgi?url=$BASE_URL/overshare/feed.xml"
echo "    Atom: https://validator.w3.org/feed/check.cgi?url=$BASE_URL/overshare/atom.xml"
echo ""

echo "📋 Step 3: Search Engine Submission"
echo ""
echo "  Submit sitemap to:"
echo "    Google: https://search.google.com/search-console"
echo "      Sitemap URL: $BASE_URL/sitemap.xml"
echo ""
echo "    Bing: https://www.bing.com/webmasters"
echo "      Sitemap URL: $BASE_URL/sitemap.xml"
echo ""

echo "📋 Step 4: Structured Data Validation"
echo ""
echo "  Test JSON-LD at:"
echo "    Rich Results Test: https://search.google.com/test/rich-results"
echo "    Test URL: $BASE_URL/overshare/swl-intention"
echo ""

echo "📋 Step 5: Monitoring Setup"
echo ""
echo "  Set up monitoring for:"
echo "    - Feed endpoints (RSS, Atom, JSON)"
echo "    - Update generation API"
echo "    - Monitoring endpoints"
echo ""
echo "  Use monitoring endpoints:"
echo "    Health: $BASE_URL/api/monitoring/feeds"
echo "    Validation: $BASE_URL/api/monitoring/validation"
echo ""

echo "📋 Step 6: AI System Testing"
echo ""
echo "  Test AI discoverability:"
echo "    Perplexity: Search for 'Snow White Laundry intention emotion craft'"
echo "    OpenAI Search: Test queries about Newfoundland dining"
echo "    Bing AI: Search for 'St. John's fine dining philosophy'"
echo ""

echo "✅ Monitoring setup complete!"
echo ""
echo "📚 See MONITORING-GUIDE.md for detailed instructions"
