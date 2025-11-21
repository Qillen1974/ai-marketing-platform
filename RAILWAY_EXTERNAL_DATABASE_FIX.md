# Railway External Database (next.tech) Fix

**Issue:** Backend can't connect to next.tech database
**Cause:** Environment variables not set in Railway Backend service
**Solution:** Add database credentials to Railway

---

## What Happened

Your setup:
- Backend: Deployed on Railway ✅
- Frontend: Deployed on Railway ✅
- Database: Hosted on next.tech (external) ❌ **Not configured in Railway**

When you deployed, Railway backend doesn't know your next.tech database credentials, so it tries to use defaults (`localhost:5432`) which fail.

---

## The Fix - Set Environment Variables in Railway

### Step 1: Get Your next.tech Database Credentials

From your next.tech account, find:
- **Host:** (looks like: `db.something.next.tech`)
- **Port:** (usually 5432)
- **Username:** (your database user)
- **Password:** (your database password)
- **Database Name:** (your database name - likely `ai_marketing`)

### Step 2: Go to Railway Dashboard

1. Open https://railway.app/dashboard
2. Click on your project
3. Click on **Backend** service

### Step 3: Add Environment Variables

1. Click **"Variables"** tab
2. Click **"+ Add Variable"** button
3. Add these variables (copy-paste from next.tech):

```
DB_HOST = <your-next.tech-host>
DB_PORT = 5432
DB_USER = <your-username>
DB_PASSWORD = <your-password>
DB_NAME = ai_marketing
```

**Example (DO NOT USE - just for reference):**
```
DB_HOST = db.neon.tech
DB_PORT = 5432
DB_USER = postgres
DB_PASSWORD = abc123xyz789def
DB_NAME = ai_marketing
```

### Step 4: Verify Variables Are Set

1. In the **Variables** tab, you should see all 5 variables listed
2. Make sure passwords and hostnames are correct
3. No typos!

### Step 5: Redeploy Backend

1. Click **"Deployments"** tab
2. Find the **"Redeploy"** or **"Deploy"** button
3. Click it
4. Wait for build to complete (green checkmark)

### Step 6: Check Logs

After deployment:
1. Click **"View Logs"**
2. Look for success message:
```
✅ Database schema initialized successfully
✅ Database initialization complete
Backend server running on port 5000
```

If you see this, database connection works! ✅

---

## What to Do Right Now

### Your TODO List:

- [ ] Get next.tech database credentials
- [ ] Go to Railway Backend service
- [ ] Add all 5 environment variables
- [ ] Redeploy Backend
- [ ] Check logs for success message
- [ ] Test health endpoint: `curl https://your-backend-url/health`
- [ ] Frontend should automatically work once backend responds

---

## Verify It Works

### Test 1: Health Check
```bash
curl https://your-backend-railway-url/health
```

Should return:
```json
{"status":"healthy","timestamp":"..."}
```

### Test 2: Frontend Can Connect
1. Visit your frontend URL
2. Open browser DevTools (F12)
3. Check Console tab
4. Should NOT see connection errors
5. Should NOT see 404 errors

### Test 3: Try Login
1. Go to Login page
2. Try any credentials
3. Should NOT see "Connection refused" error
4. Should show "Invalid credentials" or similar

---

## Common Issues

### Issue: "Still getting connection refused"

**Solution:**
1. Double-check all 5 variables are set correctly
2. Make sure `DB_HOST` is the FULL hostname from next.tech (not just `db`)
3. Make sure `DB_PASSWORD` is correct (no extra spaces)
4. Try redeploying again
5. Check logs for exact error message

### Issue: "Wrong password error"

**Solution:**
1. Copy password from next.tech again carefully
2. Check for special characters that might need escaping
3. If password has `@`, `#`, `$`, copy it exactly
4. Railway should handle it correctly

### Issue: "Connection timeout"

**Solution:**
1. Check if next.tech database allows external connections
2. Check if Railway's IP is whitelisted in next.tech
3. Try connecting locally with same credentials to verify they work

---

## Environment Variables Explained

```
DB_HOST     = Where the database server is
              (your next.tech hostname)

DB_PORT     = What port PostgreSQL listens on
              (usually 5432)

DB_USER     = Username to login to database
              (your next.tech username)

DB_PASSWORD = Password to login to database
              (your next.tech password)

DB_NAME     = Name of the specific database
              (your database name)
```

---

## Alternative: Using DATABASE_URL

If next.tech provides a full connection string, you can use that instead:

1. Get your full database URL from next.tech (looks like):
```
postgresql://user:password@host:5432/dbname
```

2. Set ONE variable in Railway:
```
DATABASE_URL = postgresql://user:password@host:5432/dbname
```

3. Update `backend/src/config/database.js`:
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

This is simpler if available!

---

## Why This Happened

Before the last deployment:
- ✅ Environment variables were set in Railway
- ✅ Backend could connect to next.tech

After the last deployment:
- ❌ Procfile fix caused fresh deployment
- ❌ Environment variables lost or not carried over
- ❌ Backend reverted to default settings (localhost)

**Solution:** Re-set the environment variables and redeploy.

---

## Complete Checklist

- [ ] Find next.tech credentials (Host, Port, User, Password, DB Name)
- [ ] Go to Railway Backend service
- [ ] Click Variables tab
- [ ] Add DB_HOST variable
- [ ] Add DB_PORT variable (5432)
- [ ] Add DB_USER variable
- [ ] Add DB_PASSWORD variable
- [ ] Add DB_NAME variable (ai_marketing)
- [ ] Click Redeploy
- [ ] Wait for green checkmark
- [ ] View logs and verify success
- [ ] Test health endpoint
- [ ] Test frontend connection

**Time to fix:** 5-10 minutes

---

## Next Steps

1. **Get your credentials from next.tech**
2. **Set them in Railway Backend Variables**
3. **Redeploy**
4. **Check logs**
5. **Test**

Once backend can connect to next.tech database, everything should work! 🚀

---

## If Still Issues

If after setting variables and redeploying you still get connection errors:

1. Copy exact error from logs
2. Verify credentials work locally
3. Check next.tech firewall/whitelist settings
4. Ensure Railway's IP is allowed to connect
5. Check if next.tech requires SSL connection (already handled in code)

Let me know what the logs say! 📋
