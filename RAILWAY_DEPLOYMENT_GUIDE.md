# Railway Deployment Guide - AI Marketing Platform

This guide will help you deploy the AI Marketing Platform (Backend + Frontend) to Railway.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Variables Setup](#environment-variables-setup)
5. [Database Setup](#database-setup)
6. [Testing After Deployment](#testing-after-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Tools
- ✅ Railway account (https://railway.app)
- ✅ GitHub account (for connecting your repository)
- ✅ Git installed on your machine
- ✅ All API keys ready:
  - Google PageSpeed API key
  - Serper API key
  - JWT secret (can be any secure string)
  - Resend API key (optional, for email sending)

---

## Backend Deployment

### Step 1: Prepare Backend for Deployment

1. **Update package.json** - Ensure your backend has proper scripts:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

2. **Create a Procfile** (if using traditional deployment):
```
web: node backend/src/index.js
```

### Step 2: Create Git Repository (if not already done)

```bash
cd "path\to\ai-marketing"
git init
git add .
git commit -m "Initial commit - AI Marketing Platform"
```

### Step 3: Push to GitHub

1. Create a new repository on GitHub (https://github.com/new)
2. Name it: `ai-marketing-platform`
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-marketing-platform.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy Backend on Railway

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Select your `ai-marketing-platform` repository
5. Railway should auto-detect it's a Node.js project
6. **Configure Services:**
   - Click **"Add Service"** → **"PostgreSQL"**
   - This creates your database automatically
7. **Set Start Command:**
   - In the backend service settings, set:
   - **Root Directory**: `backend`
   - **Start Command**: `npm install && npm start`

### Step 5: Configure Backend Environment Variables

In Railway dashboard for the backend service:

1. Click **"Variables"**
2. Add these variables:

```
DB_HOST=<railway postgres host>
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<railway postgres password>
DB_NAME=ai_marketing

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345

GOOGLE_PAGESPEED_API_KEY=<your google api key>
SERPER_API_KEY=<your serper api key>

RESEND_API_KEY=<your resend api key>
FROM_EMAIL=noreply@yourdomain.com

NODE_ENV=production
PORT=8000
API_URL=https://your-railway-backend-url.railway.app
FRONTEND_URL=https://your-railway-frontend-url.railway.app
```

**Note**: Railway automatically provides database credentials. Find them in the PostgreSQL service settings.

### Step 6: Deploy Backend

Once variables are set, Railway will automatically build and deploy your backend.

**Expected Result**: You should see a URL like:
```
https://ai-marketing-backend-prod.railway.app
```

---

## Frontend Deployment

### Step 1: Update Frontend Configuration

1. **Update API URL** in `frontend/src/lib/api.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-railway-backend-url.railway.app';
```

2. **Add environment file** `frontend/.env.production`:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

### Step 2: Deploy Frontend on Railway

1. In Railway dashboard, click **"New Service"**
2. Select **"GitHub"** and choose your repository
3. **Configure Service:**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3000`

### Step 3: Configure Frontend Environment Variables

In Railway dashboard for the frontend service:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

### Step 4: Deploy Frontend

Once configured, Railway will build and deploy your frontend.

**Expected Result**: You should see a URL like:
```
https://ai-marketing-frontend-prod.railway.app
```

---

## Environment Variables Setup

### Finding Railway Database Credentials

1. Go to Railway dashboard
2. Open the **PostgreSQL service**
3. Click **"Variables"**
4. Copy these values:
   - `PGHOST` → use as `DB_HOST`
   - `PGPORT` → use as `DB_PORT` (usually 5432)
   - `PGUSER` → use as `DB_USER`
   - `PGPASSWORD` → use as `DB_PASSWORD`
   - `PGDATABASE` → use as `DB_NAME`

### Connecting Frontend to Backend

After backend is deployed, you'll get a URL. Update this in:

1. **Backend `.env`** (if you need to reference frontend):
```
FRONTEND_URL=https://your-railway-frontend-url.railway.app
```

2. **Frontend Environment**:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
```

---

## Database Setup

### Automatic Setup

When the backend deploys for the first time, it automatically:
1. Connects to the PostgreSQL database
2. Runs the `initDatabase()` function
3. Creates all required tables

### Manual Database Setup (if needed)

If you need to manually initialize the database:

1. Connect to Railway PostgreSQL:
```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>
```

2. Run the SQL from `backend/src/config/database.js` manually

### Verify Database Tables

```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>
\dt  # Lists all tables
```

---

## Testing After Deployment

### 1. Test Backend API

```bash
curl https://your-railway-backend-url.railway.app/health
```

Expected response:
```json
{"status": "healthy", "timestamp": "2024-11-13T..."}
```

### 2. Test Frontend

Open in browser:
```
https://your-railway-frontend-url.railway.app
```

You should see the login page.

### 3. Test Authentication Flow

1. Sign up with an email
2. Login
3. Add a website
4. Try to discover backlink opportunities

### 4. Check Logs

In Railway dashboard:
- **Backend service** → **"Logs"** tab to see server logs
- **Frontend service** → **"Logs"** tab to see build logs

---

## Troubleshooting

### Backend Not Starting

**Error**: `Connection refused` or `Database connection error`

**Solution**:
1. Check PostgreSQL service is running in Railway
2. Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` are correct
3. Check backend logs for error messages

### Frontend Shows 404

**Error**: `API not found` or pages return 404

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
2. Check backend is actually running
3. Clear browser cache and reload

### CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Backend already has `cors()` enabled
2. Verify both services have correct environment variables
3. Check that `FRONTEND_URL` is set correctly on backend

### Emails Not Sending

**Error**: `Failed to send email` or Resend errors

**Solution**:
1. Verify `RESEND_API_KEY` is set correctly
2. Ensure sender domain is verified in Resend
3. Check if it's in testing mode (free tier)

### Database Migrations Failed

**Error**: `relation "..." does not exist`

**Solution**:
1. The database tables haven't been created
2. Check that `initDatabase()` ran successfully
3. Manually create tables using SQL from `database.js`

---

## Post-Deployment Checklist

- [ ] Backend deployment successful (health check returns 200)
- [ ] Frontend deployment successful (loads login page)
- [ ] Can sign up and create account
- [ ] Can add website
- [ ] Can discover backlink opportunities
- [ ] Can generate and send emails (if Resend configured)
- [ ] Can navigate all pages without errors
- [ ] Database tables are created
- [ ] Environment variables are configured
- [ ] Both services have proper resource allocation

---

## Next Steps

After successful deployment:

1. **Configure Custom Domain** (optional):
   - Railway allows you to connect a custom domain
   - Go to service settings → **"Domains"**

2. **Set Up Monitoring** (optional):
   - Enable Railway's built-in monitoring
   - Set up alerts for crashes

3. **Enable Auto-Deploy** (recommended):
   - Railway auto-deploys on GitHub pushes
   - This is enabled by default

4. **Backup Strategy**:
   - Set up automated backups for PostgreSQL
   - Export critical data regularly

---

## Useful Commands

### View Logs
```bash
railway logs
```

### SSH into Service
```bash
railway ssh
```

### Restart Service
```bash
railway restart
```

### Environment Variables
```bash
railway variables
```

---

## Support

If you encounter issues:
1. Check Railway documentation: https://docs.railway.app
2. Review the logs in Railway dashboard
3. Verify all environment variables are set
4. Ensure backend and frontend URLs match across services

---

**Good luck with your deployment! 🚀**
