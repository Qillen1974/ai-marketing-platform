# Railway Cache Issue - Forcing Fresh Deployment

## The Problem

Your logs show:
```
🔍 Fetching backlinks from SE Ranking for: asana.com (Project API, key: 803e97cc...44474)
```

But the code should say "Data API" and use key `fd800428...`.

This means **Railway is serving cached/old code** even though we've updated it multiple times.

---

## Why This Happens

Railway sometimes:
- Caches Docker images from old builds
- Doesn't pull latest code changes
- Needs a complete rebuild, not just redeploy

---

## Solution: Force Clean Rebuild

### Step 1: Delete Railway Cache

1. Go to Railway: https://railway.app
2. Select your project
3. Click **Backend** service
4. Go to **Settings** tab
5. Scroll down to **Build** section
6. Look for **"Clear build cache"** button
7. Click it

**Or:**
1. Go to **Deployments** tab
2. Find latest deployment
3. Look for **"..." (more options)** menu
4. Click **"Rebuild from source"** (this clears cache)

### Step 2: Trigger New Build

After clearing cache:
1. Go to **Deployments**
2. Click **"Deploy"** or **"Rebuild"** button
3. Wait 5-10 minutes for complete build (not just redeploy)

**Look for these signs in the build log:**
```
✓ Pulling dependencies
✓ Building application
✓ Running server
✅ Deployment succeeded
```

### Step 3: Verify New Code Deployed

Once deployed, test backlink discovery and check logs for:

**Correct (new code):**
```
🔍 Fetching backlinks from SE Ranking for: domain.com (Data API, key: fd800428...5e05)
```

**Wrong (old code):**
```
🔍 Fetching backlinks from SE Ranking for: domain.com (Project API, key: 803e97cc...44474)
```

---

## Alternative: Stop and Restart Service

If rebuild doesn't work:

1. Backend service
2. Look for **"Stop"** button
3. Click to stop service
4. Wait 30 seconds
5. Look for **"Start"** button
6. Click to start service
7. Wait 2-3 minutes for startup

This forces Railway to pull latest code fresh.

---

## Nuclear Option: Redeploy from Earlier Commit

If nothing works:

1. Go to **Deployments** tab
2. Find a deployment from an EARLIER commit (before the issues started)
3. Click **Redeploy** on that old version
4. Wait for it to complete
5. Then redeploy the latest `084a953` commit again

This clears all caches by forcing a different version first.

---

## Why This Works

When you force a rebuild:
- ✅ Railway downloads latest code from GitHub
- ✅ Clears Docker cache
- ✅ Rebuilds everything from scratch
- ✅ Pulls latest environment variables
- ✅ Your new code actually runs

---

## Expected Timeline

**After force rebuild:**
- 2-3 min: Build starts
- 5-8 min: Build completes
- 1-2 min: Service starts
- Total: 8-12 minutes

---

## Troubleshooting

**If still wrong after rebuild:**
1. Check Railway is pointing to correct GitHub repo
2. Check you're on `main` branch
3. Check environment variables are set correctly
4. Try stopping/starting service again

**If build fails:**
1. Check build logs for errors
2. Might need to check if GitHub has the latest code
3. Run `git status` locally to verify

---

## Summary

The code is correct locally and committed to GitHub. Railway just hasn't deployed the actual new code yet due to caching.

**Action:**
1. Go to Railway Backend service
2. **Clear build cache** or **Rebuild from source**
3. Wait 10 minutes for new build
4. Test backlink discovery
5. Logs should now show "Data API" with key `fd800428...`

---

## Git Status

Latest commits:
- `084a953` - IMPROVEMENT B: Better backlink targets
- `11bfb2b` - SE Ranking working (but Railway hasn't deployed this yet)
- `3e09256` - Use correct Data API endpoint

All correct code is committed. Just need Railway to actually build and run it.
