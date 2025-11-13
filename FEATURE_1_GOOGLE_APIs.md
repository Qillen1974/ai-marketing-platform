# Feature 1: Google PageSpeed Insights API Integration

## Overview
Replace mock SEO audit data with **real, Google-verified metrics** using the Google PageSpeed Insights API.

**Timeline**: 1-2 weeks
**Cost**: Free forever
**Impact**: High (builds credibility)

---

## What You'll Get

### Before (Mock Data):
```
On-Page Score: 67 (random)
Technical Score: 54 (random)
Content Score: 71 (random)
Mobile Friendly: Maybe
Page Speed: 43 (random)
→ Different every time!
```

### After (Real Data):
```
On-Page Score: 78 (analyzed)
Technical Score: 85 (Google verified)
Content Score: 72 (analyzed)
Mobile Friendly: Yes (verified)
Page Speed: 92 (Google metrics)
Core Web Vitals: Good (LCP, FID, CLS)
→ Real metrics, consistent!
```

---

## Step 1: Set Up Google API Key

### Get Free Google API Key:

1. Go to: https://console.cloud.google.com
2. Click "Create Project"
3. Name: "AI Marketing Platform"
4. Click "Create"
5. Wait 30 seconds...

### Enable PageSpeed Insights API:

1. Go to: APIs & Services → Library
2. Search: "PageSpeed Insights API"
3. Click on it
4. Click "ENABLE"
5. Go back to: APIs & Services → Credentials
6. Click "Create Credentials"
7. Choose: "API Key"
8. Copy your API Key (looks like: `AIzaSyD...`)
9. Keep it safe!

### Optional - Restrict Key:

1. In Credentials, click your API key
2. Click "Application restrictions"
3. Choose "HTTP referrers (web sites)"
4. Add your domain: `https://aimarketing.com/*`
5. Save

---

## Step 2: Install Axios (Already Installed)

Check backend package.json - axios is already there!

```bash
# Verify axios is installed
cd backend
npm list axios
# Should show: axios@^1.6.2
```

---

## Step 3: Create Google Service

Create new file: `backend/src/services/googleService.js`

<path: C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\backend\src\services\googleService.js>

<Code to create below>

---

## Step 4: Update SEO Service

Update: `backend/src/services/seoService.js` to use real Google data

---

## Step 5: Add Environment Variable

Add to `backend/.env`:
```
GOOGLE_PAGESPEED_API_KEY=AIzaSyD...your_key...
```

And to Railway:
```
GOOGLE_PAGESPEED_API_KEY=AIzaSyD...your_key...
```

---

## Step 6: Test in Development

Start backend:
```bash
cd backend
npm run dev
```

Test audit:
```bash
curl -X POST http://localhost:5000/api/audits/1/run \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return real Google metrics!

---

## Step 7: Deploy to Railway

Push code to GitHub:
```bash
git add .
git commit -m "feat: Add Google PageSpeed Insights integration"
git push
```

Railway auto-deploys!

---

## What Google API Returns

The PageSpeed Insights API gives you:

```json
{
  "lighthouseResult": {
    "scores": {
      "performance": 85,
      "accessibility": 92,
      "best-practices": 100,
      "seo": 96
    },
    "audits": {
      "cumulative-layout-shift": { "score": 0.95 },
      "largest-contentful-paint": { "score": 0.92 },
      "first-input-delay": { "score": 0.98 }
    },
    "metrics": {
      "largest_contentful_paint_ms": 1200,
      "first_input_delay_ms": 50,
      "cumulative_layout_shift_ms": 0.05
    }
  }
}
```

Which maps to:

```
Performance Score: 85 → (on-page optimization)
Accessibility: 92 → (user experience)
Best Practices: 100 → (technical SEO)
SEO Score: 96 → (search engine optimization)
```

---

## Important Notes

### API Rate Limits:
- 25,000 requests/day (free)
- This is plenty! Even with 100 users running audits daily = 100 requests

### Response Time:
- First request: 5-10 seconds (Google crawls page)
- Cached requests: <1 second
- Solution: Add caching!

### Mobile vs Desktop:
- We can get metrics for both
- Google returns strategy: 'mobile' or 'desktop'

---

## Next Steps

Once this is working:
1. ✅ Real data displayed
2. ✅ Users see credible metrics
3. ✅ Move to Feature 2: Stripe Payments

---

## Troubleshooting

**Error: "Permission denied" or "API not enabled"**
- Go to Google Cloud Console
- Make sure PageSpeed Insights API is ENABLED
- Make sure credentials are created

**Error: "Invalid API Key"**
- Copy API key again from Google Cloud
- Make sure there are no spaces
- Update in .env and Railway

**Error: "Rate limit exceeded"**
- You used more than 25,000 requests today
- Wait until tomorrow
- Or use a service account (more complex)

---

## Success Indicators

You've successfully implemented this when:
- ✅ Can run audit on website
- ✅ Returns real Google metrics (not random 45-95)
- ✅ Scores consistent between audits
- ✅ Shows performance, accessibility, best practices, SEO
- ✅ Mobile friendly status is real

---

Let me create the code files now...
