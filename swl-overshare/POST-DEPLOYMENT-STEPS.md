# Post-Deployment Steps: Complete Checklist

## 🚀 Run Automated Verification

```bash
# Set your domain
export NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Run post-deployment verification
./scripts/post-deployment.sh
```

This script tests:
- ✅ All feed endpoints (RSS, Atom, JSON)
- ✅ Monitoring endpoints
- ✅ Sitemap accessibility
- ✅ Sample breadcrumb page
- ✅ JSON-LD structured data

## 📋 Manual Verification Steps

### Step 1: Test Feeds (5 minutes)

**RSS Feed:**
- URL: `https://your-domain.com/overshare/feed.xml`
- Should return valid XML with `<rss>` tag
- Should include `<item>` elements

**Atom Feed:**
- URL: `https://your-domain.com/overshare/atom.xml`
- Should return valid XML with `<feed>` tag
- Should include `<entry>` elements

**JSON Feed:**
- URL: `https://your-domain.com/overshare/index.json`
- Should return valid JSON
- Should include `items` array

### Step 2: Validate Feeds (10 minutes)

**RSS Feed Validation:**
1. Go to: https://validator.w3.org/feed/check.cgi
2. Enter: `https://your-domain.com/overshare/feed.xml`
3. Click "Check"
4. Fix any errors shown

**Atom Feed Validation:**
1. Go to: https://validator.w3.org/feed/check.cgi
2. Enter: `https://your-domain.com/overshare/atom.xml`
3. Click "Check"
4. Fix any errors shown

**Expected Result:** Both feeds should validate without errors.

### Step 3: Submit Sitemap (15 minutes)

**Google Search Console:**
1. Visit: https://search.google.com/search-console
2. Select your property (or add it if new)
3. Go to "Sitemaps" in left sidebar
4. Enter: `sitemap.xml`
5. Click "Submit"
6. Wait for processing (may take hours)

**Bing Webmaster Tools:**
1. Visit: https://www.bing.com/webmasters
2. Select your site (or add it if new)
3. Go to "Sitemaps" in left sidebar
4. Enter: `sitemap.xml`
5. Click "Submit"
6. Wait for processing (may take hours)

**Expected Result:** Sitemaps submitted successfully, processing begins.

### Step 4: Test Structured Data (5 minutes)

**Rich Results Test:**
1. Visit: https://search.google.com/test/rich-results
2. Enter URL: `https://your-domain.com/overshare/swl-intention`
3. Click "Test URL"
4. Verify JSON-LD is detected
5. Check for any errors or warnings

**Expected Result:** JSON-LD detected, no critical errors.

### Step 5: Test Monitoring Endpoints (5 minutes)

**Health Check:**
```bash
curl https://your-domain.com/api/monitoring/feeds
```

Should return:
```json
{
  "status": "healthy",
  "content": {
    "breadcrumbs": 38,
    "updates": 0,
    "total": 38
  }
}
```

**Validation Check:**
```bash
curl https://your-domain.com/api/monitoring/validation
```

Should return:
```json
{
  "status": "valid",
  "validation": {
    "issues": [],
    "warnings": []
  }
}
```

## ✅ Verification Checklist

After running all steps, verify:

- [ ] All feeds accessible (HTTP 200)
- [ ] Feeds validate without errors
- [ ] Sitemap submitted to Google
- [ ] Sitemap submitted to Bing
- [ ] Structured data validates
- [ ] Monitoring endpoints working
- [ ] Sample breadcrumb page loads
- [ ] JSON-LD present on pages

## 🔍 Quick Test Commands

```bash
# Set your domain
DOMAIN="https://your-domain.com"

# Test RSS feed
curl -I "$DOMAIN/overshare/feed.xml"

# Test Atom feed
curl -I "$DOMAIN/overshare/atom.xml"

# Test JSON feed
curl -I "$DOMAIN/overshare/index.json"

# Test monitoring
curl "$DOMAIN/api/monitoring/feeds" | jq

# Test validation
curl "$DOMAIN/api/monitoring/validation" | jq

# Test sitemap
curl -I "$DOMAIN/sitemap.xml"

# Test breadcrumb page
curl -I "$DOMAIN/overshare/swl-intention"
```

## 📊 Expected Results

### Immediate (After Deployment)
- ✅ All endpoints return HTTP 200
- ✅ Feeds contain valid content
- ✅ Monitoring shows "healthy" status
- ✅ Sitemap accessible

### Within 24 Hours
- ✅ Google starts processing sitemap
- ✅ Bing starts processing sitemap
- ✅ Some pages begin indexing
- ✅ Feed validators show no errors

### Within 1 Week
- ✅ Most pages indexed in Google
- ✅ Feeds being consumed
- ✅ Structured data validating
- ✅ Weekly update generated (Tuesday)

## 🐛 Troubleshooting

### Feeds Not Accessible
1. Check Vercel deployment logs
2. Verify `NEXT_PUBLIC_SITE_URL` is set
3. Check file system access to breadcrumbs
4. Review server logs for errors

### Feeds Don't Validate
1. Check feed content manually
2. Review XML/JSON structure
3. Fix any syntax errors
4. Re-validate after fixes

### Sitemap Not Processing
1. Verify sitemap is accessible
2. Check robots.txt allows crawling
3. Verify sitemap format is correct
4. Wait 24-48 hours for processing

### Structured Data Not Detected
1. Check page source for JSON-LD script tag
2. Verify JSON-LD is valid JSON
3. Test with Rich Results Test
4. Review structured data format

## 📚 Next Steps

After completing post-deployment steps:

1. **Set Up Daily Monitoring** (5 min/day)
   - Check monitoring endpoints
   - Review feed health

2. **Set Up Weekly Reviews** (15 min/week)
   - Check Google Search Console
   - Review feed validation
   - Verify update generation

3. **Set Up Monthly Analysis** (30 min/month)
   - Test AI system citations
   - Review performance metrics
   - Plan content expansion

See `QUICK-START-MONITORING.md` for detailed monitoring guide.

---

**✅ Complete all steps above, then start daily monitoring!**
