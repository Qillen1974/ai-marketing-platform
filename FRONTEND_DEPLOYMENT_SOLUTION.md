# Frontend Deployment Solution

**Issue:** 404 on root path - Frontend not deployed
**Cause:** Only backend deployed to Railway, frontend missing
**Solution:** Deploy frontend (2 options)

---

## Why You're Getting 404

```
Your Domain
    ↓
Railway Backend Service (runs: node backend/src/index.js)
    ↓
Tries to serve frontend from `/`
    ↓
❌ No frontend files there!
    ↓
404 Not Found
```

The Procfile only starts the backend. The frontend isn't deployed anywhere.

---

## Solution Options

### Option A: Vercel (RECOMMENDED - Easiest)
✅ **Best for Next.js apps**
✅ **Free tier available**
✅ **Automatic deployments from GitHub**
✅ **Built-in CI/CD**
✅ **Blazing fast**

### Option B: Railway Frontend Service
✅ **Keep everything in one place**
⚠️ **Slightly more setup**
⚠️ **Uses Railway credits**

### Option C: Build Frontend & Serve from Backend
⚠️ **More complex**
⚠️ **Less performant**
⚠️ **Harder to maintain**

---

## RECOMMENDED: Deploy to Vercel (Option A)

### Step 1: Go to Vercel
1. Open https://vercel.com
2. Click **"Sign Up"**
3. Click **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project
1. Click **"Add New..."** → **"Project"**
2. Find `ai-marketing-platform` repository
3. Click **"Import"**

### Step 3: Configure Project
When Vercel shows project settings:

1. **Framework:** Next.js (should auto-detect)
2. **Root Directory:** `frontend`
3. **Build Command:** `next build`
4. **Output Directory:** `.next`
5. **Install Command:** `npm install`

### Step 4: Set Environment Variables
Add these to Vercel dashboard:

1. Click **"Environment Variables"**
2. Add:
```
NEXT_PUBLIC_API_URL = https://your-backend-railway-url/api
```

Replace `your-backend-railway-url` with your actual Railway backend URL.

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait ~2-3 minutes
3. You'll get a live URL like: `https://your-app.vercel.app`

### Step 6: Update Backend CORS
Update your backend `index.js` to allow requests from Vercel:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      'https://your-app.vercel.app',  // Add this!
    ].filter(Boolean);
    // ... rest of CORS config
  }
};
```

---

## ALTERNATIVE: Deploy Frontend to Railway (Option B)

If you prefer everything on Railway:

### Step 1: Create Separate Procfile for Frontend
Create `Procfile.frontend`:
```
web: npm run start --prefix frontend
```

### Step 2: Create New Railway Service
1. Go to https://railway.app/dashboard
2. Click your project
3. Click **"+ Add Service"**
4. Click **"Deploy from GitHub repo"**
5. Select same repo (`ai-marketing-platform`)
6. Set root directory to `frontend`

### Step 3: Configure Service
1. Add start command: `npm run start --prefix frontend`
2. Set environment variables (see below)
3. Deploy

### Step 4: Link Backend to Frontend
Set environment variable in Railway frontend service:
```
NEXT_PUBLIC_API_URL = https://your-backend-url/api
```

---

## ENVIRONMENT VARIABLES NEEDED

### For Frontend (Vercel or Railway)
```
NEXT_PUBLIC_API_URL = https://your-backend-railway-url/api
```

### For Backend (Railway) - Update if needed
```
DB_USER = postgres
DB_PASSWORD = <your_password>
DB_HOST = <railway_postgres_host>
DB_PORT = 5432
DB_NAME = ai_marketing
SE_RANKING_API_KEY = 803e97cc6c39a1ebb35522008ae40b7ed0c44474
NODE_ENV = production
PORT = 5000
FRONTEND_URL = <your_frontend_url>
JWT_SECRET = <secure_string>
```

---

## How to Find Your Backend URL

1. Go to https://railway.app/dashboard
2. Click **Backend** service
3. Click **"Deployments"**
4. Look for domain/URL (should say something like `for-backend-deployment-only-production.up.railway.app`)

**Use this URL in FRONTEND's `NEXT_PUBLIC_API_URL` variable**

---

## Step-by-Step: Vercel Deployment

### 1. Sign Up on Vercel
```
https://vercel.com/signup
```
Choose: "Continue with GitHub"

### 2. Import Project
```
1. Click "Add New" → "Project"
2. Select ai-marketing-platform repo
3. Click "Import"
```

### 3. Configure
```
Root Directory: frontend
Build Command: next build
Install Command: npm install
```

### 4. Add Environment Variables
```
Key: NEXT_PUBLIC_API_URL
Value: https://your-railway-backend-url/api
```

### 5. Deploy
```
Click "Deploy" button
Wait for green checkmark
Get your live URL!
```

### 6. Test
```
Visit: https://your-app.vercel.app
Should see login/signup page
Click login → should connect to backend
```

---

## Verify Everything Works

### Test 1: Frontend Loads
```
Visit: https://your-vercel-url
Should see: "AI Marketing Platform" with Login/Sign Up buttons
```

### Test 2: Backend Responds
```
Backend should be running on Railway
Check health: https://your-railway-backend-url/health
Should return: {"status":"healthy","timestamp":"..."}
```

### Test 3: Frontend Connects to Backend
```
1. Visit frontend
2. Click Login
3. Try login with test credentials
4. Should either:
   - Login successfully (if user exists)
   - Show error (if user doesn't exist)
5. Should NOT show connection errors
```

### Test 4: Site Health Audit
```
1. Login successfully
2. Go to "Site Health"
3. Select a website
4. Click "Start Audit"
5. Should NOT show 404 errors
6. Should show progress bar
```

---

## Common Issues & Solutions

### Issue: NEXT_PUBLIC_API_URL not working
**Solution:**
1. Must start with `NEXT_PUBLIC_` prefix
2. Redeploy after setting variable
3. Check variable is set in Vercel dashboard

### Issue: 404 connecting to backend
**Solution:**
1. Verify backend URL is correct
2. Make sure it includes `/api` at end
3. Example: `https://backend-url.railway.app/api`
4. Not: `https://backend-url.railway.app`

### Issue: CORS errors
**Solution:**
1. Backend needs to allow Vercel URL
2. Update CORS in `backend/src/index.js`
3. Add your Vercel URL to allowedOrigins
4. Redeploy backend

### Issue: "Cannot find module"
**Solution:**
1. Check `package.json` has all dependencies
2. Vercel should auto-install
3. Check build logs in Vercel dashboard

---

## Quick Decision Tree

**Question: Where should I deploy frontend?**

```
Do you want everything on Railway?
├─ YES → Use Option B (Railway Frontend Service)
└─ NO  → Use Option A (Vercel) ← RECOMMENDED

Do you know Vercel?
├─ NO  → Use Option A (Vercel - easier, just GitHub connect)
└─ YES → Either option works
```

**My Recommendation:** Use Vercel (Option A)
- Easiest setup (just connect GitHub)
- Free tier sufficient
- Auto-deploys on push
- Optimized for Next.js

---

## After Deployment

### 1. Update Git (to track what's deployed)
```bash
cd ai-marketing
git add FRONTEND_DEPLOYMENT_SOLUTION.md
git commit -m "docs: Add frontend deployment solution"
git push origin main
```

### 2. Mark Deployment
- [ ] Backend deployed on Railway ✅
- [ ] Frontend deployed on Vercel (or Railway)
- [ ] Environment variables set
- [ ] Both services connected
- [ ] Tested and working

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deploy:** https://nextjs.org/docs/deployment
- **Railway Docs:** https://docs.railway.app
- **Next.js on Railway:** https://docs.railway.app/guides/nextjs

---

## Summary

| Aspect | Vercel (Option A) | Railway (Option B) |
|--------|-------------------|-------------------|
| Setup Time | 5 minutes | 15 minutes |
| Cost | Free | Uses Railway credits |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Ease | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Auto-deploy | ✅ Yes | ✅ Yes |
| Recommended | ✅ YES | Alternative |

---

**Recommendation: Choose Vercel (Option A) - Deploy in 5 minutes!** 🚀
