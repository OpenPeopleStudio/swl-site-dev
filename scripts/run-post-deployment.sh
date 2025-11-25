#!/bin/bash
# Quick post-deployment runner

echo "🚀 Running Post-Deployment Steps..."
echo ""

# Check if domain is set
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
    echo "⚠️  NEXT_PUBLIC_SITE_URL not set"
    echo "Set it with: export NEXT_PUBLIC_SITE_URL=https://your-domain.com"
    echo ""
    read -p "Enter your domain (or press Enter to use default): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        DOMAIN="https://snowwhitelaundry.co"
    fi
    export NEXT_PUBLIC_SITE_URL="$DOMAIN"
fi

echo "Testing: $NEXT_PUBLIC_SITE_URL"
echo ""

# Run post-deployment script
./scripts/post-deployment.sh

echo ""
echo "📋 Next Steps:"
echo "  1. Validate feeds: https://validator.w3.org/feed/"
echo "  2. Submit sitemap to Google: https://search.google.com/search-console"
echo "  3. Submit sitemap to Bing: https://www.bing.com/webmasters"
echo "  4. Test structured data: https://search.google.com/test/rich-results"
