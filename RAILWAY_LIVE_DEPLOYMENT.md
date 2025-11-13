# Railway Deployment - Live Step-by-Step Guide

This guide will walk you through deploying your application step-by-step on Railway.

---

## Step 1: Push Code to GitHub ✅ (DONE)

Your code is already committed to git. Now push it to GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-marketing-platform.git
git branch -M main
git push -u origin main
```

**What to expect:**
- You'll see progress bars
- Code will be uploaded to GitHub
- You'll see confirmation at the end

**Verify:** Go to https://github.com/YOUR_USERNAME/ai-marketing-platform and confirm your code is there.

---

## Step 2: Create Railway Project & Database (5 minutes)

### 2.1: Go to Railway Dashboard

1. Open https://railway.app/dashboard
2. You should see your Railway account

### 2.2: Create New Project

1. Click the **"New Project"** button (top right)
2. You'll see options. Click **"Provision PostgreSQL"**

**What happens:**
- Railway creates a new PostgreSQL database
- You'll see it added to your project
- A new service will appear

### 2.3: Get Database Credentials

Once PostgreSQL is created:

1. Click on the **"PostgreSQL"** service in your project
2. Go to the **"Variables"** tab
3. You should see these variables:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

**IMPORTANT**: Copy these values somewhere safe. You'll need them for the backend.

**Example:**
```
PGHOST: railway.app
PGPORT: 5432
PGUSER: postgres
PGPASSWORD: abc123xyz...
PGDATABASE: railway
```

---

## Step 3: Deploy Backend Service (15 minutes)

### 3.1: Add Backend Service

1. In your Railway project, click **"New Service"**
2. Click **"GitHub"**
3. You may need to authorize Railway to access GitHub
4. Search for and select: **`ai-marketing-platform`**
5. Click to select it

**What you should see:**
- A new service appears in your project
- It should say "ai-marketing-platform"

### 3.2: Configure Backend Service

1. Click on the backend service (you just added)
2. Go to **"Settings"** tab
3. Look for these fields and update them:

**Settings to change:**
- **Root Directory**: `backend` (type this)
- **Build Command**: `npm install` (or keep default)
- **Start Command**: `npm start` (or change to this if different)

After setting, you should see:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

### 3.3: Add Environment Variables

This is the most important step!

1. Still in the backend service, go to **"Variables"** tab
2. Click **"Add Variable"** and add each of these:

**DATABASE VARIABLES** (from Step 2.3):
```
DB_HOST = [PGHOST value]
DB_PORT = 5432
DB_USER = [PGUSER value]
DB_PASSWORD = [PGPASSWORD value]
DB_NAME = [PGDATABASE value]
```

**APPLICATION VARIABLES**:
```
JWT_SECRET = your_super_secret_jwt_key_change_this_in_production_12345
NODE_ENV = production
PORT = 8000
```

**API KEYS** (use your actual keys):
```
GOOGLE_PAGESPEED_API_KEY = [your Google API key]
SERPER_API_KEY = [your Serper API key]
RESEND_API_KEY = [your Resend API key - can be blank for now]
FROM_EMAIL = noreply@yourdomain.com
```

**URLs** (fill in later after frontend deploys):
```
FRONTEND_URL = https://placeholder.railway.app
```

**How to add variables in Railway:**
1. In Variables tab, you'll see a text field
2. Type: `DB_HOST` and press Tab
3. Enter the value from PGHOST and press Enter
4. Repeat for all variables

### 3.4: Trigger Deployment

1. Look for a **"Deploy"** button or **"Redeploy"** button
2. Click it to start deployment
3. Go to **"Logs"** tab to watch the deployment

**What to watch for in logs:**
```
npm install
npm start
Listening on port 8000
```

**When complete**, you should see:
- A green checkmark ✅ on the service
- No red errors in logs
- The service shows as "Running"

### 3.5: Get Backend URL

1. Click on your backend service
2. Look for the **"Domains"** section (or at the top)
3. You should see a URL like:
   ```
   https://ai-marketing-backend-prod.railway.app
   ```
4. **Copy this URL** - you need it for the frontend!

### 3.6: Test Backend is Working

Open in your browser or use curl:
```bash
curl https://your-backend-url.railway.app/health
```

**You should see:**
```json
{"status":"healthy","timestamp":"2024-11-13T..."}
```

If you see this, ✅ Backend is working!

If not, check logs for errors.

---

## Step 4: Deploy Frontend Service (15 minutes)

### 4.1: Add Frontend Service

1. Back in your Railway project, click **"New Service"**
2. Click **"GitHub"**
3. Search for and select: **`ai-marketing-platform`**
4. Click to select it

**What you should see:**
- A second service appears (frontend)

### 4.2: Configure Frontend Service

1. Click on the frontend service
2. Go to **"Settings"** tab
3. Update these fields:

**Settings to change:**
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4.3: Add Environment Variables

1. Go to **"Variables"** tab
2. Add these variables:

```
NODE_ENV = production
NEXT_PUBLIC_API_URL = https://[YOUR_BACKEND_URL]/api
```

**IMPORTANT**: Replace `[YOUR_BACKEND_URL]` with the URL from Step 3.5

**Example:**
```
NEXT_PUBLIC_API_URL = https://ai-marketing-backend-prod.railway.app/api
```

Make sure you include `/api` at the end!

### 4.4: Trigger Deployment

1. Click **"Deploy"** or **"Redeploy"**
2. Go to **"Logs"** tab to watch

**What to watch for in logs:**
```
npm install
npm run build
npm start
Listening on port 3000
```

This takes longer than backend (2-3 minutes for build).

### 4.5: Get Frontend URL

1. Click on your frontend service
2. Look for the **URL** at the top or in "Domains"
3. You should see something like:
   ```
   https://ai-marketing-frontend-prod.railway.app
   ```
4. **This is your live application URL!**

### 4.6: Update Backend FRONTEND_URL

Now that you have both URLs, go back and update the backend:

1. Click on **backend service**
2. Go to **"Variables"**
3. Find `FRONTEND_URL`
4. Update it with your frontend URL:
   ```
   FRONTEND_URL = https://ai-marketing-frontend-prod.railway.app
   ```
5. Click **"Deploy"** to redeploy backend with updated variable

---

## Step 5: Test Your Deployment (15 minutes)

### 5.1: Test Backend API

```bash
curl https://your-backend-url.railway.app/health
```

**Expected:**
```json
{"status":"healthy","timestamp":"..."}
```

✅ If you see this, backend is working!

### 5.2: Open Frontend in Browser

1. Click on your frontend URL or open in browser:
   ```
   https://ai-marketing-frontend-prod.railway.app
   ```

2. You should see the **login page**

3. If you see errors in browser console (F12 → Console), note them

### 5.3: Test Sign Up

1. Click **"Sign Up"**
2. Enter an email: `test@example.com`
3. Enter a password: `Test123!`
4. Click **"Register"**

**Expected:**
- Success message
- Redirects to login page

**If error:**
- Check backend logs for database errors
- Verify all DB variables are set correctly

### 5.4: Test Login

1. Enter your test email: `test@example.com`
2. Enter your password: `Test123!`
3. Click **"Login"**

**Expected:**
- You see the Dashboard
- Welcome message shows

### 5.5: Test Core Features

Once logged in:

**Test 1: Add Website**
1. Click "Add New Website"
2. Domain: `example.com`
3. Keywords: `digital marketing, seo`
4. Click "Add Website"
5. ✅ Website appears in list

**Test 2: Discover Opportunities**
1. Go to "Backlink Building" (navbar or from dashboard)
2. Select your website
3. Click "Discover Opportunities"
4. Wait for results (30-60 seconds)
5. ✅ You see opportunities with domains and scores

**Test 3: Generate Email**
1. Click "View Opportunities"
2. Click "🤖 Generate Email" on an opportunity
3. Select "Initial Outreach"
4. Click "Generate Email with AI"
5. Wait for email to generate
6. ✅ You see email subject and body

**Test 4: Send Email** (mock - not actually sent without Resend key)
1. Review the generated email
2. Click "Send Email"
3. ✅ See success message

**Test 5: Check Outreach History**
1. Click "📧 Outreach History"
2. ✅ You see your sent email in the list

**Test 6: Mark as Secured**
1. Go back to opportunities
2. Click "✅ Mark as Secured"
3. Enter a test URL: `https://example.com/article`
4. Click "Add Backlink"
5. ✅ Backlink is added

**Test 7: Check Acquired Backlinks**
1. Click "🔗 Acquired Backlinks"
2. ✅ You see your backlink in the dashboard
3. Should show health status

**Test 8: Check Dashboard Widget**
1. Go back to main Dashboard
2. ✅ See backlink health widget below your website

---

## Troubleshooting

### Issue: Backend won't start

**Symptoms**: Red X on service, deploy fails

**Fix**:
1. Click backend service → **Logs**
2. Look for error messages
3. Check if you missed any environment variables
4. Verify DATABASE variables match exactly

### Issue: Frontend shows errors

**Symptoms**: Page loads but shows API errors

**Fix**:
1. Check browser console (F12)
2. Verify `NEXT_PUBLIC_API_URL` includes `/api` at end
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+Shift+R)

### Issue: Can't log in

**Symptoms**: "Invalid credentials" after sign up

**Fix**:
1. Check backend logs
2. Verify DATABASE variables are correct
3. Try signing up again with different email
4. Check database connected

### Issue: API returns 404

**Symptoms**: "Cannot GET /api/..." in logs

**Fix**:
1. Verify backend URL is correct
2. Make sure backend is actually deployed (green checkmark)
3. Wait 30 seconds and try again
4. Check backend logs for errors

---

## Success Checklist

When everything is working:

- [ ] ✅ Backend service shows green status
- [ ] ✅ Frontend service shows green status
- [ ] ✅ PostgreSQL shows green status
- [ ] ✅ Frontend loads without errors
- [ ] ✅ Can sign up with email
- [ ] ✅ Can log in
- [ ] ✅ Can add website
- [ ] ✅ Can discover opportunities
- [ ] ✅ Can generate emails
- [ ] ✅ Can view outreach history
- [ ] ✅ Can mark backlinks as secured
- [ ] ✅ Can view acquired backlinks dashboard
- [ ] ✅ Dashboard shows health widget
- [ ] ✅ No console errors

---

## Your Live Application URLs

**When deployment is complete, you'll have:**

```
Frontend URL: https://ai-marketing-frontend-prod.railway.app
Backend URL:  https://ai-marketing-backend-prod.railway.app
```

(Note: Your exact URLs will be different - Railway generates them)

---

## Next Steps After Deployment

1. **Enable Auto-Deploy** (usually default)
   - Future GitHub pushes auto-deploy

2. **Configure Resend** (optional)
   - Add Resend API key to send real emails
   - Set up verified sender domain

3. **Custom Domain** (optional)
   - Connect your own domain to frontend
   - Configure in Railway Domains settings

4. **Monitoring** (optional)
   - Set up alerts in Railway
   - Monitor logs regularly

5. **Share Your App**
   - Send frontend URL to team/stakeholders
   - They can sign up and test

---

**That's it! Your app is now live! 🎉**
