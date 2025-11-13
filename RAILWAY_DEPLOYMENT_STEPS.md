# Railway Deployment - Detailed Step-by-Step Guide

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] Railway account created (https://railway.app)
- [ ] GitHub account created
- [ ] GitHub account connected to Railway
- [ ] All API keys ready:
  - [ ] Google PageSpeed API key
  - [ ] Serper API key
  - [ ] JWT Secret (can be any string)
  - [ ] Resend API key (optional)

---

## Phase 1: GitHub Setup (5-10 minutes)

### 1.1: Initialize Git Repository

Open terminal in your project root directory:

```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
git init
git add .
git commit -m "Initial commit - AI Marketing Platform ready for deployment"
```

### 1.2: Create GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `ai-marketing-platform`
3. **Description**: AI Marketing Platform - Backlink Building & SEO Tool
4. **Visibility**: Public (Railway needs to access it)
5. Click **"Create repository"**

### 1.3: Push Code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-marketing-platform.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

**Expected Output:**
```
Enumerating objects: ...
Writing objects: ...
...
branch 'main' set up to track 'origin/main'.
```

---

## Phase 2: Railway Database Setup (5-10 minutes)

### 2.1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"** button
3. Select **"Provision PostgreSQL"**
4. Railway creates a PostgreSQL database automatically

### 2.2: Get Database Credentials

1. In your Railway project, click on the **PostgreSQL** service
2. Go to the **"Variables"** tab
3. You'll see:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

**Important**: Copy these values somewhere safe. You'll need them for the backend service.

Example:
```
PGHOST=railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=xYzAbC123...
PGDATABASE=railway
```

---

## Phase 3: Deploy Backend Service (10-15 minutes)

### 3.1: Add Backend Service

1. In Railway dashboard, click **"New Service"**
2. Select **"GitHub"**
3. Search for and select `ai-marketing-platform`
4. Railway will detect your repository

### 3.2: Configure Backend Service

1. Click on the newly created service
2. Go to **"Settings"** tab
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3.3: Add Environment Variables

1. In the backend service, go to **"Variables"** tab
2. Click **"Add Variable"** for each of these:

**Database Variables** (from Step 2.2):
```
DB_HOST = <PGHOST value>
DB_PORT = 5432
DB_USER = <PGUSER value>
DB_PASSWORD = <PGPASSWORD value>
DB_NAME = <PGDATABASE value>
```

**Application Variables**:
```
JWT_SECRET = your_super_secret_jwt_key_change_this_in_production_12345
NODE_ENV = production
PORT = 8000
```

**API Keys**:
```
GOOGLE_PAGESPEED_API_KEY = <your Google API key>
SERPER_API_KEY = <your Serper API key>
RESEND_API_KEY = <your Resend API key>
FROM_EMAIL = noreply@yourdomain.com
```

**URLs** (fill in after frontend deployment):
```
FRONTEND_URL = https://placeholder.railway.app
```

### 3.4: Deploy

1. Railway automatically detects changes
2. Wait for build to complete (check **"Logs"** tab)
3. Once deployed, you'll see a green checkmark
4. Click on your service to see your backend URL

**Expected URL Format**:
```
https://ai-marketing-backend-prod.railway.app
```

**Copy this URL** - you'll need it for the frontend.

### 3.5: Verify Backend is Running

Open in your browser or use curl:
```bash
curl https://your-backend-url.railway.app/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2024-11-13T..."}
```

---

## Phase 4: Deploy Frontend Service (10-15 minutes)

### 4.1: Add Frontend Service

1. In Railway dashboard, click **"New Service"**
2. Select **"GitHub"**
3. Search for and select `ai-marketing-platform`

### 4.2: Configure Frontend Service

1. Click on the newly created service
2. Go to **"Settings"** tab
3. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 4.3: Add Environment Variables

1. In the frontend service, go to **"Variables"** tab
2. Add these variables:

```
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://your-backend-url/api
```

**Important**: Replace `your-backend-url` with the URL from Step 3.4 (e.g., `https://ai-marketing-backend-prod.railway.app`)

### 4.4: Deploy

1. Railway automatically detects changes
2. Wait for build to complete (may take 2-3 minutes)
3. Check **"Logs"** tab to watch the build
4. Once deployed, you'll see a green checkmark
5. Click on your service to see your frontend URL

**Expected URL Format**:
```
https://ai-marketing-frontend-prod.railway.app
```

---

## Phase 5: Testing Your Deployment (15-20 minutes)

### 5.1: Test Backend API

```bash
curl https://your-backend-url.railway.app/health
```

Should return:
```json
{"status":"healthy","timestamp":"..."}
```

If not working:
- Check backend logs in Railway dashboard
- Verify all environment variables are set
- Ensure PostgreSQL service is running

### 5.2: Test Frontend Loads

1. Open https://your-frontend-url.railway.app in browser
2. You should see the login page
3. Check browser console for any errors (F12 → Console)

If you see errors:
- Check frontend logs in Railway dashboard
- Verify `NEXT_PUBLIC_API_URL` includes `/api` at the end
- Clear browser cache (Ctrl+Shift+Delete)

### 5.3: Test Authentication

1. Click **"Sign Up"**
2. Enter email and password
3. Click **"Register"**
4. Try to **"Log In"** with your credentials

If signup fails:
- Check backend logs for database errors
- Verify database credentials in backend service
- Ensure PostgreSQL service is running

### 5.4: Test Core Features

Once logged in:

1. **Add Website**:
   - Click "Add New Website"
   - Enter domain (e.g., `example.com`)
   - Enter keywords
   - Click "Add Website"

2. **Discover Opportunities**:
   - Go to "Backlink Building"
   - Select your website
   - Click "Discover Opportunities"
   - Wait for results (may take 30 seconds)

3. **Check Opportunities**:
   - Should see a list of opportunities
   - Click "View Opportunities"
   - Should display backlink opportunities

4. **Try Other Features**:
   - Generate email (click 🤖 button)
   - Check outreach history
   - Mark as secured
   - Check acquired backlinks

### 5.5: Final Verification

- [ ] Backend health check works
- [ ] Frontend loads without errors
- [ ] Can sign up
- [ ] Can log in
- [ ] Can add website
- [ ] Can discover opportunities
- [ ] Can generate emails
- [ ] All pages load without 404 errors

---

## Phase 6: Post-Deployment Configuration (Optional)

### 6.1: Update Backend FRONTEND_URL

Now that you have both URLs, update the backend:

1. Go to backend service in Railway
2. Click **"Variables"**
3. Update `FRONTEND_URL`:
```
FRONTEND_URL = https://your-frontend-url.railway.app
```

4. Railway redeploys automatically

### 6.2: Enable Auto-Deploy

By default, Railway auto-deploys when you push to GitHub:

1. Go to backend/frontend service
2. Click **"Settings"**
3. Ensure **"Auto-Deploy"** is enabled

This means: whenever you push code to GitHub, Railway automatically redeploys.

### 6.3: Custom Domain (Optional)

To use your own domain instead of railway.app subdomain:

1. Go to frontend service → **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Railway shows DNS records to update
5. Update your DNS provider with these records
6. Wait for DNS to propagate (5-30 minutes)

### 6.4: Configure Email Sending (Optional)

If you want actual emails to send via Resend:

1. Go to Resend dashboard (https://resend.com)
2. Verify your domain as a sender
3. Get your API key
4. Update backend service:
   - `RESEND_API_KEY` = your API key
   - `FROM_EMAIL` = noreply@yourdomain.com

Then try sending an email - it should actually deliver!

---

## Troubleshooting Guide

### Issue: Backend won't deploy

**Symptoms**: Service shows error, build fails, red X

**Solutions**:
1. Check logs tab for error message
2. Verify all environment variables are set correctly
3. Check PostgreSQL is running (green checkmark)
4. Try restarting service: **"Redeploy"** button

### Issue: Frontend shows 404 errors

**Symptoms**: Pages return 404 or show not found

**Solutions**:
1. Check NEXT_PUBLIC_API_URL includes `/api` at the end
2. Verify backend URL is correct
3. Clear browser cache: Ctrl+Shift+Delete
4. Hard refresh: Ctrl+Shift+R
5. Check browser console for errors

### Issue: Can't log in

**Symptoms**: Login fails, "Invalid credentials" or API error

**Solutions**:
1. Check backend logs for database connection errors
2. Verify database variables: `DB_HOST`, `DB_PASSWORD`, etc.
3. Ensure you signed up first (not just trying to log in)
4. Try clearing browser storage: DevTools → Application → Storage → Clear All

### Issue: API calls return CORS error

**Symptoms**: Console shows "CORS policy blocked"

**Solutions**:
1. Backend has CORS enabled by default
2. Check `NEXT_PUBLIC_API_URL` is set correctly
3. Verify backend and frontend are different services
4. Restart both services

### Issue: Database errors when signing up

**Symptoms**: "Database connection failed" or "relation does not exist"

**Solutions**:
1. Check PostgreSQL service is running (green)
2. Verify `DB_PASSWORD` doesn't have special characters that weren't escaped
3. Check database tables exist: In PostgreSQL service → Logs
4. The tables should auto-create on first backend run

### Issue: Emails not sending

**Symptoms**: "Email sent" shows but no email received

**Solutions**:
1. Check if `RESEND_API_KEY` is set (without it, emails are only saved locally)
2. Verify sender domain is verified in Resend
3. Check Resend API key is valid and active
4. Look at backend logs for Resend API errors

---

## Success Checklist

When everything is working, you should see:

- [ ] ✅ Backend service shows green status
- [ ] ✅ Frontend service shows green status
- [ ] ✅ PostgreSQL service shows green status
- [ ] ✅ Frontend loads without errors
- [ ] ✅ Can sign up and create account
- [ ] ✅ Can add websites
- [ ] ✅ Can discover backlink opportunities
- [ ] ✅ Can view all pages (opportunities, outreach history, acquired backlinks)
- [ ] ✅ Dashboard shows backlink health widget
- [ ] ✅ Backend health check returns 200

---

## Next Steps

Now that your app is live:

1. **Share with others**: Give them the frontend URL to test
2. **Monitor performance**: Check Railway dashboard logs regularly
3. **Set up monitoring**: Railway has built-in monitoring features
4. **Plan Phase 3**: Build additional features
5. **Back up data**: Set up database backups

---

## Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- GitHub: https://github.com
- Resend: https://resend.com

---

**Congratulations! Your AI Marketing Platform is now live! 🎉**
