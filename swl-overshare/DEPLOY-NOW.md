# Deploy Now: Quick Start Guide

## Pre-Deployment Checklist

Run the deployment checklist:
```bash
chmod +x scripts/deploy-checklist.sh
./scripts/deploy-checklist.sh
```

## Deployment Steps

### 1. Verify Environment Variables

Ensure `NEXT_PUBLIC_SITE_URL` is set in Vercel:
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Set: `NEXT_PUBLIC_SITE_URL=https://snowwhitelaundry.co` (or your domain)

### 2. Deploy to Vercel

```bash
# If using Vercel CLI
vercel --prod

# Or push to main branch (if auto-deploy is enabled)
git push origin main
```

### 3. Verify Deployment

After deployment, test endpoints:
```bash
# Set your domain
export NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Run monitoring setup
chmod +x scripts/monitoring-setup.sh
./scripts/monitoring-setup.sh
```

## Post-Deployment: Immediate Actions

### 1. Test Feeds (5 minutes)

Visit these URLs:
- `https://your-domain.com/overshare/feed.xml` - RSS feed
- `https://your-domain.com/overshare/atom.xml` - Atom feed
- `https://your-domain.com/overshare/index.json` - JSON feed

All should return valid content.

### 2. Test Monitoring (2 minutes)

Visit:
- `https://your-domain.com/api/monitoring/feeds` - Should show system health
- `https://your-domain.com/api/monitoring/validation` - Should show validation status

### 3. Validate Feeds (5 minutes)

Use W3C Feed Validator:
- RSS: https://validator.w3.org/feed/check.cgi?url=https://your-domain.com/overshare/feed.xml
- Atom: https://validator.w3.org/feed/check.cgi?url=https://your-domain.com/overshare/atom.xml

Fix any validation errors.

### 4. Submit Sitemap (5 minutes)

**Google Search Console:**
1. Go to https://search.google.com/search-console
2. Add property: `https://your-domain.com`
3. Go to Sitemaps → Add sitemap: `sitemap.xml`
4. Submit

**Bing Webmaster Tools:**
1. Go to https://www.bing.com/webmasters
2. Add site: `https://your-domain.com`
3. Go to Sitemaps → Submit sitemap: `sitemap.xml`

### 5. Validate Structured Data (5 minutes)

**Rich Results Test:**
1. Go to https://search.google.com/test/rich-results
2. Test URL: `https://your-domain.com/overshare/swl-intention`
3. Verify JSON-LD is detected
4. Check for errors or warnings

## Monitoring Setup

### Daily Checks (5 minutes)

```bash
# Check system health
curl https://your-domain.com/api/monitoring/feeds

# Check validation
curl https://your-domain.com/api/monitoring/validation
```

### Weekly Checks (15 minutes)

1. **Google Search Console**
   - Check Coverage report
   - Review indexing status
   - Check for errors

2. **Feed Validation**
   - Re-validate feeds
   - Check for new errors

3. **Update Generation**
   - Verify weekly update was generated (Tuesdays)
   - Check update content quality

### Monthly Checks (30 minutes)

1. **AI System Testing**
   - Search Perplexity for "Snow White Laundry"
   - Check if breadcrumbs appear in sources
   - Test OpenAI Search queries
   - Monitor Bing AI citations

2. **Performance Review**
   - Review feed consumption metrics
   - Analyze search performance
   - Review content coverage

## Quick Reference

### Feed URLs
- RSS: `/overshare/feed.xml`
- Atom: `/overshare/atom.xml`
- JSON: `/overshare/index.json`

### Monitoring URLs
- Health: `/api/monitoring/feeds`
- Validation: `/api/monitoring/validation`
- Updates List: `/api/updates/list`

### Important Pages
- Overshare Index: `/overshare`
- Breadcrumb: `/overshare/[slug]`
- Update: `/updates/[slug]`
- Sitemap: `/sitemap.xml`

## Troubleshooting

### Feeds Not Working
1. Check file system access to `swl-overshare/breadcrumbs/`
2. Verify breadcrumb files exist
3. Check server logs for errors
4. Verify `remark` and `remark-html` packages installed

### Updates Not Generating
1. Check Vercel cron logs
2. Verify API route accessible
3. Check file system write permissions
4. Review API route logs

### Monitoring Not Working
1. Verify endpoints are accessible
2. Check for CORS issues
3. Review server logs
4. Verify environment variables

## Success Indicators

After deployment, you should see:

✅ **Feeds**
- All feeds return valid XML/JSON
- Feeds include full content
- Feeds validate without errors

✅ **Monitoring**
- Health endpoint shows "healthy"
- Validation shows minimal warnings
- Content counts are accurate

✅ **Indexing**
- Sitemap submitted successfully
- Google starts indexing pages
- Structured data validates

✅ **Updates**
- Weekly updates generate automatically
- Updates appear in feeds
- Updates are indexed

## Next Steps

1. **Week 1:** Monitor feed consumption and indexing
2. **Week 2:** Review AI system citations
3. **Week 3:** Generate more breadcrumbs (incremental)
4. **Week 4:** Optimize based on performance data

## Support

- See `MONITORING-GUIDE.md` for detailed monitoring
- See `DEPLOYMENT-GUIDE.md` for deployment details
- See `FINAL-IMPLEMENTATION-SUMMARY.md` for system overview

---

**Ready to deploy?** Run the checklist, deploy, then follow the post-deployment steps above.
