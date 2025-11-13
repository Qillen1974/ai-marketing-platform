# Google PageSpeed Insights API - Complete Setup Guide

## Which Credential Type Should You Choose?

### ❌ **DON'T Choose: "User data"**
- For: Apps that need user's Google account info (email, age, etc.)
- Requires: OAuth consent screen
- Requires: User login
- More complex setup
- **NOT what we need**

### ✅ **CHOOSE: "Application data"**
- For: Your application's own data
- Creates: Service Account
- Simple setup
- No user login required
- Perfect for PageSpeed API calls
- **This is what we need!**

---

## Why "Application data"?

### Our Use Case:
```
Your Backend App
    ↓ (makes API call)
Google PageSpeed API
    ↓ (analyzes website)
Public website (example.com)
    ↓ (returns metrics)
Your Backend App
```

**We're not accessing user data** - we're accessing PageSpeed metrics for any public website. This is "Application data".

---

## ✅ **Complete Setup Steps**

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com
2. Login with your Google account

### Step 2: Create a New Project
1. At the top, click the **Project dropdown**
2. Click **"NEW PROJECT"**
3. Name: `AI Marketing Platform`
4. Click **"CREATE"**
5. Wait 30 seconds for project to be created...

### Step 3: Enable PageSpeed Insights API
1. Go to: **APIs & Services** → **Library**
2. In search box, type: `PageSpeed Insights`
3. Click on **"PageSpeed Insights API"**
4. Click **"ENABLE"** button
5. Wait for it to enable (shows blue checkmark)

### Step 4: Create Credentials - Choose "Application data"

1. Go to: **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** button (top left)
3. Choose: **"API Key"** from dropdown
   - This is the simplest option
   - It's for application data
   - Perfect for our use case

### Step 5: Copy Your API Key
1. A popup appears with your API key
2. Click **"COPY"** button
3. Save it somewhere safe
4. Looks like: `AIzaSyD...` (long alphanumeric string)
5. Click **"CLOSE"**

---

## Optional: Restrict Your API Key (Recommended)

### Protect Your Key from Abuse:

1. Go to: **APIs & Services** → **Credentials**
2. Click on your API key in the list
3. Under "API restrictions", click **"Restrict key"**
4. Choose: **"HTTP referrers (web sites)"**
5. Add your domain:
   ```
   https://aimarketing.com/*
   https://aimarketing.railway.app/*
   ```
6. Click **"SAVE"**

**Why?**
- Prevents someone from using your key on their website
- Limits API usage to only your domain
- Still works for development (localhost doesn't need restriction)

---

## ❌ **What You DON'T Need**

You do **NOT** need:
- ❌ OAuth 2.0 Client ID
- ❌ Service Account
- ❌ API Keys for user data
- ❌ Complex authentication

Just one simple **API Key** - that's it! ✅

---

## 🎯 **Your API Key**

### What It Looks Like:
```
AIzaSyD-abcdefghijklmnop1234567890123456789
```

### Where to Put It:
Open `backend/.env`:
```
GOOGLE_PAGESPEED_API_KEY=AIzaSyD-abcdefghijklmnop1234567890123456789
```

Replace with your actual key.

### How We Use It:
```javascript
// In backend/src/services/googleService.js
const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
  params: {
    url: 'https://example.com',
    key: 'AIzaSyD...', // Your API key here
    strategy: 'mobile',
  }
});
```

---

## 💰 **Cost**

### PageSpeed Insights API Pricing:
- **Free**: 25,000 requests per day
- **Paid**: $5 for every 1,000 requests after 25,000

### Your Usage Estimate:
```
Users: 100
Audits per day: 10 per user (max)
Total: 1,000 requests/day
Cost: FREE (under 25,000/day limit)
```

**You won't be charged!** Even with heavy usage. 💰

---

## 🔒 **Security Notes**

### Keep Your API Key Safe:
1. ✅ Store in `.env` file (never commit to Git)
2. ✅ Never share publicly
3. ✅ Restrict to your domain (recommended)
4. ✅ Don't put in frontend code

### If Compromised:
1. Go to Google Cloud Console
2. Delete the API key
3. Create a new one
4. Update in `.env`

---

## 🧪 **Test Your Setup**

Once you have your API key, test it:

### Test 1: Check Backend .env
```bash
cd backend
# Open .env and verify:
# GOOGLE_PAGESPEED_API_KEY=AIzaSyD...
```

### Test 2: Restart Backend
```bash
# Press Ctrl+C in backend terminal
npm run dev
```

### Test 3: Run an Audit
1. Go to http://localhost:3000
2. Login
3. Click "Run SEO Audit" on a website
4. Wait 5-10 seconds
5. See real Google metrics!

---

## 📋 **Checklist**

- [ ] Created Google Cloud Project
- [ ] Enabled PageSpeed Insights API
- [ ] Created API Key (not OAuth, not Service Account)
- [ ] Copied API key
- [ ] Updated backend/.env with key
- [ ] Restarted backend
- [ ] Tested with real website
- [ ] See real scores (not random)

---

## ⚠️ **Troubleshooting**

### Issue: "403 Forbidden" or "Permission denied"
**Solution:**
1. Go to Google Cloud Console
2. Make sure **PageSpeed Insights API is ENABLED** (blue checkmark)
3. Try again

### Issue: "Invalid API Key"
**Solution:**
1. Copy API key again from Google Cloud Console
2. Make sure no extra spaces
3. Update .env file
4. Restart backend

### Issue: "Timeout" or "Connection refused"
**Solution:**
1. Check backend is running: `npm run dev`
2. Check .env has API key
3. Try with different website

### Issue: Scores still showing random numbers
**Solution:**
1. Restart backend after updating .env
2. Check API key is correct in .env
3. Check logs in backend terminal for errors

---

## ✅ **You're All Set!**

Just follow these steps and you'll have real Google PageSpeed data in your application! 🎉

---

## Next: After Setting Up Feature 1

Once Feature 1 is working:
1. ✅ Confirm real Google scores
2. ✅ Test with multiple websites
3. ✅ Move to Feature 2: Stripe Payments

Let me know when you're ready! 🚀
