# Setup SE Ranking Project API Key

## Issue Identified
The **Data API key** (`fd800428-0578-e416-3a75-c1ba4a5c5e05`) doesn't have access to the Backlinks API.

SE Ranking has two types of API keys:
- **Data API Key** - For accessing SEO data (may have limited access)
- **Project API Key** - For managing projects and accessing full backlinks data (recommended)

## Solution
We've updated the code to support both key types, with **Project API Key as priority**.

---

## Step 1: Add Project API Key to Railway

Your Project API key is:
```
803e97cc6c39a1ebb35522008ae40b7ed0c44474
```

1. Go to Railway: https://railway.app
2. Select your project
3. Click **Backend** service
4. Go to **Variables** tab
5. Add new variable:
   ```
   Key: SE_RANKING_PROJECT_API_KEY
   Value: 803e97cc6c39a1ebb35522008ae40b7ed0c44474
   ```
6. Click **Save**

**Optional:** You can keep the Data API key for fallback:
```
Key: SE_RANKING_API_KEY
Value: fd800428-0578-e416-3a75-c1ba4a5c5e05
```

---

## Step 2: Redeploy Backend

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest commit (`b9417ba`)
3. Wait 2-3 minutes for deployment

**What to watch for in logs:**
- ✅ `npm install` completes
- ✅ Backend service starts
- ✅ No errors in logs

---

## Step 3: Test Backlink Discovery

Once deployment is complete:

1. Go to your app
2. Select a website
3. Click "Discover Backlink Opportunities"
4. Enter keywords (e.g., "digital marketing")
5. Wait for results

**Check the backend logs for:**

✅ GOOD - Successful API calls:
```
🔍 Fetching backlinks from SE Ranking for: asana.com (using key: 803e97cc...b7ed0c44474)
✅ Retrieved backlink data for asana.com: 142 backlinks
✅ Retrieved backlink data for moz.com: 156 backlinks
📊 Filtering 48 opportunities by achievability...
✅ Filtered to 12 achievable opportunities (from 48)
✅ Found 12 real backlink opportunities from SE Ranking
```

❌ BAD - Still getting 401 errors:
```
❌ Error fetching backlinks for asana.com: Status 401 Invalid API key
```

---

## Expected Results

### Before (Data API Key):
```
❌ 401 Unauthorized errors
⚠️ No opportunities found from SE Ranking API, using fallback method
🔍 Filtered to 0 achievable opportunities (from 18)
✅ Found 3 opportunities (high difficulty 80+)
```

### After (Project API Key):
```
✅ Successfully retrieved backlinks from SE Ranking
📊 Filtering 48 opportunities by achievability...
✅ Filtered to 12 achievable opportunities (from 48)
✅ Found 12 real backlink opportunities from SE Ranking
```

---

## What Changed

Updated `backend/src/services/seRankingService.js`:

```javascript
// Before: Only used one API key
const apiKey = process.env.SE_RANKING_API_KEY;

// After: Tries Project key first, falls back to Data key
const apiKey = process.env.SE_RANKING_PROJECT_API_KEY || process.env.SE_RANKING_API_KEY;
```

This allows the system to:
1. Try **Project API Key** first (recommended for backlinks)
2. Fall back to **Data API Key** if project key isn't set
3. Work with either type seamlessly

---

## API Key Types Reference

| Type | Use Case | Good For |
|------|----------|----------|
| **Data API Key** | Raw SEO data access | Keywords, rankings, general data |
| **Project API Key** | Project management | Backlinks, managing projects, full data access |

For your use case (Backlinks API), **Project API Key is the right choice**.

---

## Summary

✅ **What's Done:**
- Code updated to support both API key types
- Project API Key prioritized in code
- Changes committed and pushed to GitHub

⏳ **What's Next:**
1. Add `SE_RANKING_PROJECT_API_KEY` to Railway variables
2. Redeploy backend
3. Test backlink discovery
4. Verify real SE Ranking data (difficulty 20-70, not 80+)

---

## Troubleshooting

**Still getting 401 errors?**
- Verify the Project API key is correct: `803e97cc6c39a1ebb35522008ae40b7ed0c44474`
- Check that Railway redeployed successfully
- Wait a few minutes for deployment to fully complete

**Getting different error?**
- Check the backend logs for the exact error message
- Let me know what error you see

**Ready to test?**
Follow Step 3 above after Railway finishes deploying!

---

## Questions?

Check `SE_RANKING_API_KEY_VALIDATION.md` if you need to troubleshoot further.

**You're almost there! This Project API Key should work!** 🚀
