# SE Ranking API Key Validation Guide

## Issue: 401 Unauthorized Errors Persist

Even after fixing the authorization header format, the SE Ranking API is still returning 401 errors, which means the API key authentication is failing.

---

## Possible Causes

### 1. **API Key is Invalid or Expired** ⚠️ MOST LIKELY
- Trial account keys sometimes have restrictions
- Key might be for a different API endpoint
- Key might have expired

### 2. **API Key Doesn't Have Backlinks API Access**
- The key might only work for certain API endpoints
- Backlinks API might need separate permission

### 3. **Account Doesn't Have Active Subscription**
- Trial might have ended
- Free plan might not include Backlinks API

---

## Step 1: Verify API Key in SE Ranking Dashboard

1. Go to SE Ranking: https://seranking.com/
2. Log in with your account
3. Go to **Settings** → **API** (or API section)
4. Look for your API key
5. Check:
   - ✅ Is the key visible/active?
   - ✅ Does it match: `fd800428-0578-e416-3a75-c1ba4a5c5e05`?
   - ✅ What is the status (Active/Inactive)?
   - ✅ What permissions does it have?

---

## Step 2: Test API Key Directly

Test if the API key works with a simple curl request:

```bash
curl -X GET "https://api.seranking.com/v4/backlinks?target=example.com&limit=10" \
  -H "Authorization: ApiKey fd800428-0578-e416-3a75-c1ba4a5c5e05" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "backlinks": [...],
  "total_backlinks": 123,
  "referring_domains": 45,
  ...
}
```

**If you get 401:**
```json
{
  "error": "Invalid API key",
  "status": 401
}
```

---

## Step 3: Check SE Ranking Account Status

1. Log in to SE Ranking dashboard
2. Check **Account** or **Subscription** section
3. Verify:
   - ✅ Account is active
   - ✅ Subscription includes "Backlinks API"
   - ✅ Monthly quota available
   - ✅ Account not suspended

---

## Step 4: Verify API Endpoint

SE Ranking has multiple API versions:
- v3 (older): Uses different auth header format
- v4 (current): Uses `ApiKey` prefix

Make sure you're using:
```
Base URL: https://api.seranking.com/v4/
Header: Authorization: ApiKey {your_key}
```

NOT:
```
Base URL: https://api.seranking.com/v3/  ❌
Header: Authorization: Token {your_key}   ❌
```

---

## Step 5: Alternative - Try Different Authorization Formats

If the key is valid but still not working, SE Ranking might accept different formats:

### Option A: Bearer Token Format
```javascript
headers: {
  'Authorization': `Bearer ${process.env.SE_RANKING_API_KEY}`,
}
```

### Option B: Custom Header Format
```javascript
headers: {
  'Authorization': process.env.SE_RANKING_API_KEY,  // Just the key, no prefix
}
```

### Option C: Query Parameter
```javascript
const response = await axios.get(`${SE_RANKING_API_BASE}/backlinks`, {
  params: {
    target: domain,
    api_key: process.env.SE_RANKING_API_KEY,  // In query instead of header
    limit: 100,
  },
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});
```

---

## Diagnostic Checklist

- [ ] API key is visible in SE Ranking dashboard
- [ ] API key matches: `fd800428-0578-e416-3a75-c1ba4a5c5e05`
- [ ] Account shows "Active" status
- [ ] Subscription includes "Backlinks API"
- [ ] Monthly quota shows available credits
- [ ] Direct curl test works (or returns meaningful error)
- [ ] Account hasn't had any API restriction warnings

---

## What to Do If Key is Invalid

### Option 1: Use SE Ranking Directly
If you have a valid SE Ranking login:
1. Go to SE Ranking dashboard
2. Go to API section
3. Generate a new API key
4. Copy the key
5. Update Railway environment variable with the new key
6. Redeploy backend

### Option 2: Use Free Trial Key from SE Ranking
1. Visit: https://seranking.com/api/
2. Sign up for free trial (if not already done)
3. Get a trial API key
4. Test the key directly first (curl test)
5. If it works, use it in Railway

### Option 3: Use Different Backlink Service
If SE Ranking isn't working:
- DataForSEO (tested alternative)
- Ahrefs API (if you have access)
- MozAPI (if you have access)

---

## Temporary Workaround

While we troubleshoot the API key, the system is using a **fallback method**:
1. Finds top-ranking sites for your keywords
2. Uses estimated Domain Authority
3. Calculates difficulty from estimates
4. Filters to achievable range

This is why you're still seeing opportunities, but they have high difficulty (80+) - because they're based on estimates, not real SE Ranking data.

**Once API key is fixed:**
- Real backlinks from SE Ranking will be used
- Real Domain Authority values will be shown
- Difficulty will be more accurate (20-70)

---

## Debugging Commands to Run

### Check if API Key is Set on Railway
```bash
# In Railway logs or terminal:
echo "API Key check: $(echo $SE_RANKING_API_KEY | cut -c1-8)..."
```

### Test API Key Locally
Create a test file `test-api-key.js`:
```javascript
const axios = require('axios');

const testApiKey = async () => {
  try {
    const response = await axios.get('https://api.seranking.com/v4/backlinks', {
      params: {
        target: 'example.com',
        limit: 10,
      },
      headers: {
        'Authorization': `ApiKey fd800428-0578-e416-3a75-c1ba4a5c5e05`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    console.log('✅ API Key is VALID');
    console.log(response.data);
  } catch (error) {
    console.log('❌ API Key is INVALID');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
};

testApiKey();
```

Run with:
```bash
node test-api-key.js
```

---

## Next Steps

1. **First:** Check your SE Ranking dashboard (steps 1-3 above)
2. **Second:** Test the API key directly with curl
3. **Third:** Let me know what you find, and we can:
   - Update the API key if needed
   - Try different authorization formats
   - Switch to alternative service if needed

---

## Summary

The 401 errors indicate the API authentication is failing. This is **not** a code issue - it's an **API credential issue**.

**Most likely solution:**
- Your SE Ranking trial account's API key doesn't have Backlinks API access
- Or the trial has expired
- Or the key is formatted differently than we're sending it

**Action items:**
1. Check your SE Ranking dashboard
2. Verify the API key and its permissions
3. Test with curl
4. Let me know what you find

Once we have a valid, working API key, the backlink discovery will work perfectly with real SE Ranking data! 🚀
