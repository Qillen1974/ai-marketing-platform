# Railway Database Connection Fix

**Issue:** Backend can't connect to PostgreSQL
**Error:** `Error initializing database schema: ECONNREFUSED`
**Cause:** PostgreSQL service not linked to Backend service
**Status:** 🔧 Needs manual setup in Railway dashboard

---

## The Problem

Your Railway project has:
- ✅ Backend service (running)
- ✅ Frontend service (running)
- ✅ PostgreSQL database (created)
- ❌ **Database NOT connected to Backend service**

When backend tries to connect to database, it gets `ECONNREFUSED` because:
1. PostgreSQL is isolated in its own service
2. Backend doesn't know the database credentials
3. Backend doesn't know how to reach the database

---

## The Solution - Link PostgreSQL to Backend

### Step 1: Go to Railway Dashboard

1. Open https://railway.app/dashboard
2. Click on your project
3. You should see 3 services:
   - Frontend
   - Backend
   - PostgreSQL

### Step 2: Link PostgreSQL to Backend Service

**Method A: Via Backend Settings**

1. Click **Backend** service
2. Click **"Settings"** tab (right side)
3. Look for **"Add service"** or **"Database"** option
4. Select **PostgreSQL**
5. Railway will automatically inject variables

**Method B: Via PostgreSQL Settings**

1. Click **PostgreSQL** service
2. Click **"Settings"** tab
3. Look for **"Add service"** or **"Link"** option
4. Select **Backend** to link it

### Step 3: Verify Environment Variables

Once linked, Railway automatically adds these environment variables to Backend:

1. Click **Backend** service
2. Click **"Variables"** tab
3. You should see:
   - `DATABASE_URL` ← Auto-generated connection string

   OR these individual variables:
   - `DB_HOST` ← PostgreSQL service name/address
   - `DB_PORT` ← Usually 5432
   - `DB_USER` ← postgres
   - `DB_PASSWORD` ← Auto-generated

### Step 4: Update Backend to Use DATABASE_URL

The easiest way is to use the auto-generated `DATABASE_URL`. Update `backend/src/config/database.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available (Railway auto-generates this)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback for local development
  ...(process.env.DATABASE_URL ? {} : {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ai_marketing',
  }),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ... rest of the file
```

OR keep the current approach and make sure these variables are set:

```
DB_HOST = <PostgreSQL service host>
DB_PORT = 5432
DB_USER = postgres
DB_PASSWORD = <generated password>
DB_NAME = ai_marketing
```

### Step 5: Deploy Backend Again

1. Click **Backend** service
2. Click **"Deployments"** tab
3. Look for **"Redeploy"** or **"Deploy"** button
4. Click it to redeploy with database connection

### Step 6: Check Logs

1. After redeployment, click **"View Logs"**
2. Look for success message:
   ```
   ✅ Database schema initialized successfully
   ✅ Database initialization complete
   Backend server running on port 5000
   ```

---

## Step-by-Step Screenshots

### In Railway Dashboard - Link Database

```
Project Dashboard
├─ Frontend    (running)
├─ Backend     (running)
└─ PostgreSQL  (running)

Click Backend → Settings → "Add service" → Select PostgreSQL
```

### Check Variables

```
Backend Service
├─ Settings tab
├─ Variables tab
└─ Should see:
   DATABASE_URL = postgres://...
   OR
   DB_HOST = <postgres-service>
   DB_USER = postgres
   DB_PASSWORD = <password>
```

---

## Common Issues & Solutions

### Issue: Still getting ECONNREFUSED

**Solution:**
1. Verify PostgreSQL service exists and is running (green status)
2. Verify environment variables are set in Backend service
3. Check if Backend service is using correct DB credentials
4. Try redeploying Backend service

### Issue: Can't find "Add service" button

**Solution:**
1. Click **Backend** service
2. Look for three dots (...) menu
3. Or look for **"Add"** or **"Link"** button
4. Railway UI might be slightly different - look for database linking option

### Issue: Database connection string format wrong

**Solution:**
1. PostgreSQL usually generates: `postgresql://user:password@host:5432/dbname`
2. Node.js expects: `postgres://` or `postgresql://`
3. Make sure it starts with `postgres://` not `postgresql://`

---

## Option 1: Use DATABASE_URL (Easiest)

Railway auto-generates `DATABASE_URL` when you link services.

**Update database.js:**

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

---

## Option 2: Use Individual Variables (Current Approach)

Keep current setup but ensure variables are set:

```
DB_HOST = <PostgreSQL host from Railway>
DB_PORT = 5432
DB_USER = postgres
DB_PASSWORD = <password from Railway>
DB_NAME = ai_marketing
```

Make sure to:
1. Link PostgreSQL to Backend
2. Copy the auto-generated credentials
3. Set them as environment variables in Backend service

---

## Verify It Works

### 1. Check Logs

```
Backend Service → View Logs
Should show: ✅ Database initialization complete
```

### 2. Test Health Endpoint

```bash
curl https://your-backend-url/health
```

Should return:
```json
{"status":"healthy","timestamp":"2024-11-20T..."}
```

### 3. Test API Endpoint

```bash
curl https://your-backend-url/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

Should NOT return database connection error.

---

## After Database Connection Works

Once backend can connect to database:

1. ✅ Frontend can connect to backend
2. ✅ Users can register/login
3. ✅ All features work
4. ✅ Site health audits work
5. ✅ Competitor analysis works

---

## Complete Checklist

- [ ] Go to Railway dashboard
- [ ] Link PostgreSQL to Backend service
- [ ] Check environment variables are set
- [ ] Redeploy Backend service
- [ ] Check logs for success message
- [ ] Test health endpoint
- [ ] Test API endpoint
- [ ] Frontend can connect to backend
- [ ] Users can login
- [ ] Features work

---

## Summary

**What Was Wrong:**
Backend service couldn't reach PostgreSQL because they weren't linked.

**What to Fix:**
1. Link PostgreSQL service to Backend service in Railway
2. Verify environment variables are set
3. Redeploy Backend
4. Check logs for success

**Time to Fix:** 5 minutes

---

**Next Action:** Go to your Railway dashboard and link PostgreSQL to Backend! 🚀
