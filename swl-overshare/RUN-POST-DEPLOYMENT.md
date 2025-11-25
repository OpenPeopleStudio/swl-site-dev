# Run Post-Deployment Steps

## Quick Start

Run the automated verification:

```bash
# Option 1: Use the quick runner (prompts for domain)
./scripts/run-post-deployment.sh

# Option 2: Set domain and run directly
export NEXT_PUBLIC_SITE_URL=https://your-domain.com
./scripts/post-deployment.sh
```

## What the Script Tests

The post-deployment script automatically verifies:

1. **Feed Endpoints**
   - RSS feed (`/overshare/feed.xml`)
   - Atom feed (`/overshare/atom.xml`)
   - JSON feed (`/overshare/index.json`)

2. **Monitoring Endpoints**
   - Health check (`/api/monitoring/feeds`)
   - Validation check (`/api/monitoring/validation`)

3. **Content Pages**
   - Sitemap (`/sitemap.xml`)
   - Sample breadcrumb page (`/overshare/swl-intention`)
   - JSON-LD structured data presence

## Manual Steps (After Script)

Even if the script passes, complete these manual steps:

### 1. Validate Feeds (10 minutes)

**RSS Feed:**
- Go to: https://validator.w3.org/feed/check.cgi
- Enter: `https://your-domain.com/overshare/feed.xml`
- Fix any errors

**Atom Feed:**
- Go to: https://validator.w3.org/feed/check.cgi
- Enter: `https://your-domain.com/overshare/atom.xml`
- Fix any errors

### 2. Submit Sitemaps (15 minutes)

**Google Search Console:**
1. Visit: https://search.google.com/search-console
2. Add/select property
3. Go to Sitemaps → Submit: `sitemap.xml`

**Bing Webmaster Tools:**
1. Visit: https://www.bing.com/webmasters
2. Add/select site
3. Go to Sitemaps → Submit: `sitemap.xml`

### 3. Test Structured Data (5 minutes)

**Rich Results Test:**
1. Visit: https://search.google.com/test/rich-results
2. Test: `https://your-domain.com/overshare/swl-intention`
3. Verify JSON-LD detected

## If Site Isn't Deployed Yet

If the script shows errors because the site isn't deployed:

1. **Deploy First:**
   ```bash
   # Set environment variable in Vercel dashboard
   # Then deploy:
   vercel --prod
   ```

2. **Then Run Post-Deployment:**
   ```bash
   export NEXT_PUBLIC_SITE_URL=https://your-deployed-domain.com
   ./scripts/post-deployment.sh
   ```

## Expected Results

### Script Output Should Show:
- ✅ All feeds accessible (HTTP 200)
- ✅ Monitoring endpoints working
- ✅ Sitemap accessible
- ✅ Sample page loads with JSON-LD

### After Manual Steps:
- ✅ Feeds validate without errors
- ✅ Sitemaps submitted to search engines
- ✅ Structured data validates

## Troubleshooting

### "Connection Refused" or "Couldn't Connect"
- Site may not be deployed yet
- Check Vercel deployment status
- Verify domain is correct

### "404 Not Found"
- Endpoints may not be deployed
- Check Vercel build logs
- Verify routes exist

### "500 Internal Server Error"
- Check Vercel function logs
- Verify environment variables set
- Review server-side code

## Next Steps

After post-deployment verification:

1. **Start Daily Monitoring** (5 min/day)
   ```bash
   curl https://your-domain.com/api/monitoring/feeds
   ```

2. **Set Up Weekly Reviews** (15 min/week)
   - Check Google Search Console
   - Review feed validation
   - Verify update generation

3. **Monitor AI Indexing** (monthly)
   - Test Perplexity citations
   - Check OpenAI Search
   - Review Bing AI sources

See `QUICK-START-MONITORING.md` for detailed monitoring guide.

---

**Run the script now:** `./scripts/run-post-deployment.sh`
