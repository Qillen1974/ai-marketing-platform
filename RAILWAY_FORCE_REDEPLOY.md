# Railway Force Redeploy Guide

## Current Issue

The backend logs still show `/v3/` endpoints (old code), but our latest code uses `/v1/` endpoints (new code).

This means **Railway hasn't deployed the latest code yet**.

---

## Why This Happens

Railway's auto-deployment sometimes:
- Caches old deployments
- Doesn't pick up latest commits immediately
- Needs manual trigger to refresh

---

## Solutions

### Solution 1: Manual Redeploy (Try First)

1. Go to Railway: https://railway.app
2. Select your project
3. Click **Backend** service
4. Go to **Deployments** tab
5. Find the latest commit starting with `c357270` or `3e09256`
6. Click the **Redeploy** button on that deployment
7. Wait 2-3 minutes

**If that doesn't work:**

### Solution 2: Rebuild from Source

1. Go to Backend service → **Deployments** tab
2. Look for a **"Rebuild"** or **"Deploy from latest"** button
3. Click it to force build from latest GitHub commit
4. Wait 3-5 minutes for build

**If that doesn't work:**

### Solution 3: Restart Backend Service

1. Go to Backend service
2. Look for **Stop** or **Restart** button
3. Click to restart the service
4. Service will pull latest code automatically
5. Wait 2-3 minutes for restart

**If that doesn't work:**

### Solution 4: Check Git Remote

Make sure Railway is pulling from correct GitHub repo:

1. Backend service → **Settings** or **Integrations**
2. Check the GitHub repository is: `https://github.com/Qillen1974/ai-marketing-platform`
3. Check branch is: `main`
4. If disconnected, reconnect to GitHub

---

## Verify Latest Code Deployed

After redeploying, check backend logs for:

**Correct (new code, should see):**
```
🔍 Fetching backlinks from SE Ranking for: domain.com (Data API, key: fd800428...5e05)
```

**Wrong (old code, should NOT see):**
```
🔄 Trying endpoint: https://api.seranking.com/v3/...
```

---

## What Changed in Latest Code

**Commit:** `3e09256`
- ✅ Uses `/v1` endpoints (Data API)
- ✅ Uses Data API key only
- ✅ Uses `/backlinks/summary` endpoint
- ✅ Removed all `/v3` Project API references

---

## If Still Getting 401 After Redeploy

Once Railway is running the correct code:

1. **Check if the Data API key is correct:**
   ```
   SE_RANKING_API_KEY = fd800428-0578-e416-3a75-c1ba4a5c5e05
   ```

2. **Check if key has API credits:**
   - Go to SE Ranking dashboard
   - Check if you have available credits
   - Some accounts need to purchase credits

3. **If 401 persists after correct code:**
   - The Data API key might not have access
   - Or the key doesn't have active credits
   - Contact SE Ranking support

---

## Summary

**Current Problem:** Old code still running on Railway

**Solution:** Force redeploy the latest code

**Steps:**
1. Go to Railway Backend service
2. Find latest deployment (commit `c357270` or `3e09256`)
3. Click **Redeploy**
4. Wait 2-3 minutes
5. Test backlink discovery
6. Check logs for correct `/v1` endpoints

**Expected Result:** Backlinks will work with `/v1/backlinks/summary` endpoint!
