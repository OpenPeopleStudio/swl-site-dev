# Quick Start: Monitoring Feed Consumption & AI Indexing

## Immediate Actions (First 24 Hours)

### 1. Verify Feeds Are Live (5 min)

Test all feeds:
```bash
# Replace with your domain
DOMAIN="https://snowwhitelaundry.co"

# Test RSS
curl -I "$DOMAIN/overshare/feed.xml"

# Test Atom  
curl -I "$DOMAIN/overshare/atom.xml"

# Test JSON
curl -I "$DOMAIN/overshare/index.json"
```

All should return `200 OK`.

### 2. Validate Feed Formats (10 min)

**RSS Feed:**
- Go to: https://validator.w3.org/feed/check.cgi
- Enter: `https://your-domain.com/overshare/feed.xml`
- Fix any errors

**Atom Feed:**
- Go to: https://validator.w3.org/feed/check.cgi
- Enter: `https://your-domain.com/overshare/atom.xml`
- Fix any errors

### 3. Submit to Search Engines (15 min)

**Google Search Console:**
1. Visit: https://search.google.com/search-console
2. Add property: Your domain
3. Verify ownership
4. Go to Sitemaps → Submit: `sitemap.xml`
5. Wait for indexing (24-48 hours)

**Bing Webmaster Tools:**
1. Visit: https://www.bing.com/webmasters
2. Add site: Your domain
3. Verify ownership
4. Go to Sitemaps → Submit: `sitemap.xml`

### 4. Test Structured Data (5 min)

**Rich Results Test:**
1. Visit: https://search.google.com/test/rich-results
2. Test URL: `https://your-domain.com/overshare/swl-intention`
3. Verify JSON-LD detected
4. Check for errors

## Daily Monitoring (5 minutes)

### Check System Health

```bash
# Health check
curl https://your-domain.com/api/monitoring/feeds | jq

# Validation check
curl https://your-domain.com/api/monitoring/validation | jq
```

Look for:
- `status: "healthy"`
- Content counts increasing
- No critical issues

### Check Feed Access

Monitor feed requests:
- Vercel Analytics → API Routes
- Look for `/overshare/feed.xml` requests
- Track request patterns

## Weekly Monitoring (15 minutes)

### Google Search Console

1. **Coverage Report**
   - Check indexed pages
   - Review errors
   - Monitor indexing progress

2. **Performance Report**
   - Track impressions
   - Monitor click-through rates
   - Review search queries

3. **Sitemaps**
   - Verify sitemap processed
   - Check for errors
   - Monitor discovery rate

### Feed Validation

Re-validate feeds weekly:
- Check for new errors
- Verify content freshness
- Review feed structure

### Update Generation

Check weekly updates:
- Verify Tuesday update generated
- Review update content
- Check update appears in feeds

## Monthly Monitoring (30 minutes)

### AI System Testing

**Perplexity:**
1. Search: "Snow White Laundry intention emotion craft"
2. Check if breadcrumbs appear in sources
3. Note citation frequency
4. Test various queries

**OpenAI Search:**
1. Test queries about Newfoundland dining
2. Check if content appears
3. Monitor relevance
4. Track ranking

**Bing AI:**
1. Search: "St. John's fine dining philosophy"
2. Check source citations
3. Monitor content discovery
4. Review citation quality

### Performance Analysis

1. **Feed Consumption**
   - Track feed requests over time
   - Identify peak usage
   - Monitor error rates

2. **Indexing Status**
   - Review Google Search Console data
   - Track indexed pages
   - Monitor indexing errors

3. **Content Performance**
   - Review most-viewed breadcrumbs
   - Identify popular topics
   - Plan content expansion

## Monitoring Tools

### Built-in Endpoints

- **Health:** `/api/monitoring/feeds`
- **Validation:** `/api/monitoring/validation`
- **Updates:** `/api/updates/list`

### External Tools

- **Google Search Console** - Search engine monitoring
- **Bing Webmaster Tools** - Bing indexing
- **W3C Feed Validator** - Feed validation
- **Rich Results Test** - Structured data validation
- **Vercel Analytics** - Performance monitoring

## Key Metrics to Track

### Content Metrics
- Total breadcrumbs
- Total updates
- Content freshness
- Link density

### Feed Metrics
- Feed requests/day
- Feed validation status
- Feed error rate
- Cache hit rate

### Indexing Metrics
- Pages indexed
- Indexing errors
- Rich results status
- Sitemap status

### AI Metrics
- Citations in AI systems
- Query relevance
- Source attribution
- Discovery rate

## Alert Thresholds

Set up alerts for:

1. **Feed Errors** - If feeds fail to generate
2. **Update Failures** - If weekly updates fail
3. **High Error Rates** - If validation shows many issues
4. **Indexing Problems** - If Google Search Console shows errors
5. **Broken Links** - If many broken links detected

## Quick Commands

```bash
# Health check
curl https://your-domain.com/api/monitoring/feeds

# Validation check
curl https://your-domain.com/api/monitoring/validation

# List updates
curl https://your-domain.com/api/updates/list

# Test RSS feed
curl https://your-domain.com/overshare/feed.xml | head -20

# Test JSON feed
curl https://your-domain.com/overshare/index.json | jq '.items | length'
```

## Success Indicators

After 1 week, you should see:
- ✅ Feeds validating without errors
- ✅ Sitemap submitted and processing
- ✅ Some pages indexed in Google
- ✅ Structured data validating
- ✅ Weekly update generated

After 1 month, you should see:
- ✅ Most breadcrumbs indexed
- ✅ Feeds being consumed regularly
- ✅ AI systems citing content
- ✅ Search queries appearing
- ✅ Performance data available

## Troubleshooting

### Feeds Not Indexing
1. Verify sitemap submitted
2. Check robots.txt allows crawling
3. Review Google Search Console errors
4. Ensure feeds are accessible

### AI Systems Not Citing
1. Test queries manually
2. Check content quality
3. Verify structured data
4. Monitor over time (takes weeks)

### Low Feed Consumption
1. Submit feeds to feed directories
2. Share feeds on social media
3. Link feeds from website
4. Promote feed URLs

---

**Start monitoring now:** Run the daily checks above and set up weekly reviews.
