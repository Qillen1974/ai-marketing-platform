# Feature 1 Setup - Google PageSpeed Insights

## Quick Setup (15 minutes)

### Step 1: Get Google API Key (5 minutes)

1. Go to: **https://console.cloud.google.com**
2. Click **"Create Project"**
3. Name: `AI Marketing Platform`
4. Click **"Create"**
5. Wait 30 seconds...

### Enable PageSpeed Insights API:

1. Go to: **APIs & Services** → **Library**
2. Search: `PageSpeed Insights API`
3. Click on it
4. Click **"ENABLE"**
5. Go to: **APIs & Services** → **Credentials**
6. Click **"Create Credentials"**
7. Choose: **"API Key"**
8. Copy your API Key (looks like: `AIzaSyD...`)
9. Keep it safe!

### Step 2: Update Your .env File (2 minutes)

Open `backend/.env` and replace:
```
GOOGLE_PAGESPEED_API_KEY=your_google_api_key_here
```

With your actual key:
```
GOOGLE_PAGESPEED_API_KEY=AIzaSyD...your_key_here...
```

### Step 3: Restart Backend (1 minute)

```bash
# Press Ctrl+C to stop current backend
# Then restart it:
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\backend"
npm run dev
```

You should see in logs:
```
Backend server running on port 5000
```

### Step 4: Test It! (5 minutes)

1. Go to http://localhost:3000
2. Login with your account
3. Go to a website you added
4. Click **"Run SEO Audit"**
5. Wait 5-10 seconds (Google crawls the page)
6. You should see **REAL scores** instead of random ones!

---

## What Changed?

### Before (Mock Data):
```
On-Page Score: 67 (random)
Technical Score: 54 (random)
Content Score: 71 (random)
→ Different every time!
```

### After (Real Data):
```
On-Page Score: 78 (Google verified)
Technical Score: 85 (Google verified)
Content Score: 72 (Google verified)
→ Real metrics, consistent!
```

---

## Troubleshooting

### Error: "Permission denied" or "API not enabled"
1. Go to Google Cloud Console
2. Make sure PageSpeed Insights API is **ENABLED**
3. Try again

### Error: "Invalid API Key"
1. Copy API key again from Google Cloud
2. Make sure there are no spaces
3. Update in `.env` file
4. Restart backend

### Error: "Timeout" or "URL not found"
- Make sure your website domain is correct
- Make sure website is publicly accessible
- Try with a different website (e.g., example.com)

### Audit takes 10+ seconds
- That's normal! Google crawls your website
- First time is slow, then it caches results

---

## What You're Getting

When you run an audit, you now get:

✅ **Real Google Metrics:**
- Performance Score (0-100)
- Accessibility Score (0-100)
- Best Practices Score (0-100)
- SEO Score (0-100)

✅ **Real Core Web Vitals:**
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

✅ **Real Opportunities:**
- Top ways to improve performance
- Specific, actionable recommendations

---

## Next Steps

Once this is working:
1. ✅ Test with multiple websites
2. ✅ Confirm scores are consistent
3. ✅ Move to Feature 2: Stripe Payments

---

## Questions?

If you get stuck:
1. Check error message in terminal
2. Check .env file has correct API key
3. Make sure backend restarted after .env change
4. Try with a different website (example.com)

Let me know if you need help! 🚀
