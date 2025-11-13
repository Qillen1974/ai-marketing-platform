# Railway Deployment - Quick Start Checklist

## Step 1: Prepare Your Code (5 minutes)

- [ ] All changes committed to git
- [ ] Run backend locally to verify: `npm start` from `/backend`
- [ ] Run frontend locally to verify: `npm run dev` from `/frontend`
- [ ] Backend listens on port 5000
- [ ] Frontend listens on port 3000

## Step 2: Push to GitHub (5 minutes)

```bash
cd "path\to\ai-marketing"
git init
git add .
git commit -m "AI Marketing Platform - Ready for Railway"
git remote add origin https://github.com/YOUR_USERNAME/ai-marketing-platform.git
git branch -M main
git push -u origin main
```

- [ ] Repository created on GitHub
- [ ] Code pushed to main branch
- [ ] Repository is public (or you're authorized)

## Step 3: Create Railway Account (2 minutes)

- [ ] Sign up at https://railway.app
- [ ] Connect GitHub account to Railway
- [ ] Authorize Railway to access your repositories

## Step 4: Deploy PostgreSQL Database (3 minutes)

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Railway creates a PostgreSQL instance
5. **Copy these credentials** (you'll need them for backend):
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

- [ ] PostgreSQL created and running
- [ ] Credentials copied and saved

## Step 5: Deploy Backend Service (10 minutes)

1. In your Railway project, click **"New Service"**
2. Select **"GitHub"**
3. Choose `ai-marketing-platform` repository
4. Select `backend` as the root directory

**Configure Build & Start:**
- Build Command: `npm install`
- Start Command: `npm start`
- Port: `5000` (or Railway auto-assigns)

**Add Environment Variables:**
```
DB_HOST=<PGHOST from PostgreSQL service>
DB_PORT=5432
DB_USER=<PGUSER from PostgreSQL service>
DB_PASSWORD=<PGPASSWORD from PostgreSQL service>
DB_NAME=<PGDATABASE from PostgreSQL service>

JWT_SECRET=your_super_secret_jwt_key_change_this_12345
NODE_ENV=production
PORT=8000

GOOGLE_PAGESPEED_API_KEY=<your Google API key>
SERPER_API_KEY=<your Serper API key>
RESEND_API_KEY=<your Resend API key (optional)>
FROM_EMAIL=noreply@yourdomain.com

FRONTEND_URL=https://your-railway-frontend-url.railway.app
```

**Deploy:**
- Railway automatically builds and deploys
- Wait for deployment to complete
- Copy your backend URL (e.g., `https://ai-marketing-backend-prod.railway.app`)

- [ ] Backend service created
- [ ] Environment variables added
- [ ] Build successful
- [ ] Service running (check logs)
- [ ] Backend URL copied

## Step 6: Deploy Frontend Service (10 minutes)

1. In your Railway project, click **"New Service"**
2. Select **"GitHub"**
3. Choose `ai-marketing-platform` repository
4. Select `frontend` as the root directory

**Configure Build & Start:**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Port: `3000`

**Add Environment Variables:**
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<your-backend-url>/api
```

Replace `<your-backend-url>` with the URL from Step 5.

**Deploy:**
- Railway automatically builds and deploys
- Wait for deployment to complete
- Copy your frontend URL (e.g., `https://ai-marketing-frontend-prod.railway.app`)

- [ ] Frontend service created
- [ ] Backend URL configured correctly
- [ ] Build successful
- [ ] Service running (check logs)
- [ ] Frontend URL available

## Step 7: Test Your Deployment (10 minutes)

### Test Backend API
```bash
curl https://your-backend-url.railway.app/health
```
Expected response:
```json
{"status":"healthy","timestamp":"..."}
```

- [ ] Backend health check passes

### Test Frontend
1. Open https://your-frontend-url.railway.app in browser
2. You should see the login page
3. Try to sign up with test email
4. Try to log in
5. Add a website
6. Try to discover opportunities

- [ ] Frontend loads without errors
- [ ] Can sign up
- [ ] Can log in
- [ ] Can add website
- [ ] Can discover opportunities

## Step 8: Post-Deployment Configuration (Optional)

### Custom Domain
1. In Railway dashboard, open frontend service
2. Click **"Domains"**
3. Add your custom domain
4. Update DNS records as Railway instructs

- [ ] Custom domain configured (optional)

### Email Sending (Optional)
If you have a Resend account:
1. Get your Resend API key from https://resend.com
2. Update backend environment variable `RESEND_API_KEY`
3. Set `FROM_EMAIL` to your Resend verified domain

- [ ] Resend configured (optional)

## Step 9: Update Local Development (Final Step)

Update your local `.env` files to match production URLs (for testing):

**frontend/.env.production:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
```

- [ ] Frontend production env updated
- [ ] Ready to test on Railway

---

## Common Issues & Solutions

### Backend won't start
- Check logs in Railway dashboard
- Verify PostgreSQL credentials are correct
- Ensure NODE_ENV is set to `production`

### Frontend shows 404 errors
- Clear browser cache
- Verify NEXT_PUBLIC_API_URL is correct
- Check backend is running

### API calls fail
- Check CORS is enabled (it is by default)
- Verify API_URL and FRONTEND_URL match across services
- Check backend logs for errors

### Emails not sending
- Verify RESEND_API_KEY is set
- Ensure FROM_EMAIL domain is verified in Resend
- Check backend logs

---

## Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Full Deployment Guide: See `RAILWAY_DEPLOYMENT_GUIDE.md`

---

## Timeline
- **Total Time**: ~45 minutes
- **Hardest Part**: Getting environment variables right
- **Most Common Issue**: Backend/Frontend URL mismatch

**You've got this! 🚀**
