# SE Ranking API - Correct Configuration

## What We Discovered

I reviewed SE Ranking's official API documentation and found the **correct authentication format and endpoints**:

### Key Findings from SE Ranking Documentation

✅ **Authentication Format:** `Token` (not `ApiKey` or `Bearer`)
```
Authorization: Token YOUR_API_KEY
```

✅ **Two Different API Versions:**
- **Data API** - `/v1/` endpoints (for Data API keys)
- **Project API** - `/v3/` endpoints (for Project API keys)

---

## What Changed

### Before (Wrong)
```javascript
// Wrong endpoint (v4)
const SE_RANKING_API_BASE = 'https://api.seranking.com/v4';

// Wrong auth format
headers: {
  'Authorization': `ApiKey ${apiKey}`,  // ❌ Should be Token
}
```

### After (Correct)
```javascript
// Correct endpoints based on key type
const SE_RANKING_DATA_API_BASE = 'https://api.seranking.com/v1';      // Data API
const SE_RANKING_PROJECT_API_BASE = 'https://api.seranking.com/v3';   // Project API

// Correct auth format
headers: {
  'Authorization': `Token ${apiKey}`,  // ✅ Token format
}
```

---

## How It Works Now

1. **Check which API key is configured**
   - If `SE_RANKING_PROJECT_API_KEY` is set → Use `/v3/backlinks` endpoint
   - If only `SE_RANKING_API_KEY` is set → Use `/v1/backlinks` endpoint

2. **Use Token authentication**
   - All requests include: `Authorization: Token {key}`

3. **Better logging**
   - Shows which API type is being used (Data or Project)

---

## Updated Configuration

### Your Current Setup

**On Railway, you should have:**
```
SE_RANKING_PROJECT_API_KEY = 803e97cc6c39a1ebb35522008ae40b7ed0c44474
SE_RANKING_API_KEY = fd800428-0578-e416-3a75-c1ba4a5c5e05  (optional, fallback)
```

**Result:**
- Will use `/v3/backlinks` (Project API endpoint)
- Will use `Token` authentication
- Will send: `Authorization: Token 803e97cc6c39a1ebb35522008ae40b7ed0c44474`

---

## Expected Results After Deploying

### Backend Logs Will Show

**Success:**
```
🔍 Fetching backlinks from SE Ranking for: asana.com (Project API, key: 803e97cc...44474)
✅ Retrieved backlink data for asana.com: 142 backlinks
✅ Retrieved backlink data for moz.com: 156 backlinks
✅ Retrieved backlink data for semrush.com: 198 backlinks
✅ Retrieved backlink data for ahrefs.com: 187 backlinks
✅ Retrieved backlink data for backlinko.com: 123 backlinks
📊 Filtering 48 opportunities by achievability...
✅ Filtered to 12 achievable opportunities (from 48)
✅ Found 12 real backlink opportunities from SE Ranking
```

**Failure (if still 401):**
```
🔍 Fetching backlinks from SE Ranking for: asana.com (Project API, key: 803e97cc...44474)
❌ Error fetching backlinks for asana.com: Status 401 Request failed with status code 401
```

---

## What to Do Now

### Step 1: Verify Environment Variables on Railway

Make sure you have:
```
SE_RANKING_PROJECT_API_KEY = 803e97cc6c39a1ebb35522008ae40b7ed0c44474
```

### Step 2: Redeploy Backend

1. Go to Railway: https://railway.app
2. Backend service → Deployments
3. Click **Redeploy** on latest commit `9be822c`
4. Wait 2-3 minutes

### Step 3: Test Backlink Discovery

1. Run backlink discovery in your app
2. Check backend logs
3. If success: You'll see backlinks with difficulty 20-70!
4. If failure: Let me know the exact error

---

## Why This Should Work

1. ✅ Using correct API endpoints (v1 for Data, v3 for Project)
2. ✅ Using correct authentication format (Token)
3. ✅ Supports both API key types
4. ✅ Based on SE Ranking's official documentation

---

## If It Still Doesn't Work

Possible remaining issues:

1. **Project API key doesn't have backlinks permission**
   - Check your SE Ranking account: Does it include "Backlinks" in your plan?
   - Some plans might not include backlinks access

2. **Trial account restrictions**
   - Trial accounts might have limited API access
   - Check if trial period has expired

3. **Different endpoint name**
   - SE Ranking might use `/backlink-checker` instead of `/backlinks`
   - Could be `/domains/backlinks`, `/seo/backlinks`, etc.

4. **Account needs to be re-authenticated**
   - Try generating a new API key in SE Ranking dashboard
   - Update the key on Railway

---

## Alternative: Use Data API Key

If Project API key doesn't work, we can try Data API:

```
SE_RANKING_API_KEY = fd800428-0578-e416-3a75-c1ba4a5c5e05
```

Will automatically use `/v1/backlinks` endpoint.

---

## Summary

✅ **What's Fixed:**
- Using correct SE Ranking API endpoints
- Using correct Token authentication format
- Proper endpoint selection based on key type

✅ **Commit:** `9be822c`

⏳ **Next Step:**
- Redeploy on Railway
- Test backlink discovery
- Check logs for which endpoint/key is being used

**This should be it! The endpoints and auth format are now correct per SE Ranking's documentation.** 🚀
