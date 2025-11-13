# Testing Instructions - AI Marketing Platform

## Current Status
✅ Node.js and npm installed
✅ PostgreSQL installed
✅ Dependencies installed
✅ Ready to run!

---

## Quick Start - 3 Easy Steps

### Step 1: Open Terminal 1 (Backend Server)

```bash
# Navigate to project
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Start backend on port 5000
npm run dev --workspace=backend
```

**Expected Output:**
```
> backend@1.0.0 dev
> nodemon src/index.js

[nodemon] 3.0.1
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): src/**/*
Database schema initialized successfully
Backend server running on port 5000
Environment: development
API URL: http://localhost:5000
```

✅ **Backend is ready!** Leave this terminal running.

---

### Step 2: Open Terminal 2 (Frontend Server)

```bash
# Navigate to same project
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Start frontend on port 3000
npm run dev --workspace=frontend
```

**Expected Output:**
```
> frontend@1.0.0 dev
> next dev

▲ Next.js 14.0.0
- Local:        http://localhost:3000
- Environments: .env.local
```

✅ **Frontend is ready!** Leave this terminal running.

---

### Step 3: Open Browser and Test

Go to: **http://localhost:3000**

You should see the AI Marketing Platform homepage!

---

## Full Testing Workflow

### 1. Register New Account

1. Click **"Sign Up"** button
2. Fill in the form:
   ```
   Full Name: Test User
   Company: My Company (optional)
   Email: testuser@example.com
   Password: password123
   ```
3. Click **"Sign Up"** button
4. You'll be redirected to the dashboard

**Expected**: Dashboard shows your stats

---

### 2. Add a Website

1. On the dashboard, scroll to **"Add New Website"** section
2. Enter:
   ```
   Domain: example.com
   Target Keywords: seo, marketing, digital (optional)
   ```
3. Click **"Add Website"** button

**Expected**: Website appears in the "Your Websites" list

---

### 3. Run SEO Audit

1. In the website list, click **"View"** button on your website
2. You'll see the website details page
3. Click **"Run SEO Audit"** button
4. Wait 2-3 seconds for analysis

**Expected**: SEO Scores appear with:
- Overall Score (0-100)
- On-Page Score
- Technical Score
- Content Score
- Issues Found
- Recommendations

---

### 4. Check Keywords

1. On the website details page, click **"Keywords"** tab
2. You'll see tracked keywords with:
   - Keyword name
   - Search volume
   - Difficulty score
   - Current position
   - Trend (up/down/stable)

**Expected**: 10-20 keywords listed

---

### 5. Test Dashboard

1. Click **"AI Marketing"** logo to go back to dashboard
2. Verify statistics show:
   - Total Websites: 1
   - Plan: FREE
   - API Usage: Shows current usage

---

### 6. Test Login/Logout

1. Click on username in top right
2. Click **"Logout"**
3. Go back to **http://localhost:3000**
4. Click **"Login"**
5. Enter your credentials:
   ```
   Email: testuser@example.com
   Password: password123
   ```
6. Click **"Login"**

**Expected**: Back on dashboard with your data

---

### 7. Test Website Deletion

1. On dashboard, find your website
2. Click **"Delete"** button
3. Confirm deletion
4. Website disappears from list

---

## API Testing (Optional)

If you want to test the API directly using Postman or curl:

### Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T..."
}
```

### Register via API
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"apitest@example.com",
    "password":"password123",
    "fullName":"API Test User"
  }'
```

Expected response includes a `token`.

### Get Profile (use token from register/login)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Kill the process using port 5000
# Windows (PowerShell):
Get-Process | Where-Object {$_.Port -eq 5000}

# Or just try a different port:
PORT=5001 npm run dev --workspace=backend
```

### Database Connection Error

**Error**: `error: connect ECONNREFUSED`

**Solution**:
1. Make sure PostgreSQL is running
2. Check backend `.env` file has correct credentials
3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```
   Should show `ai_marketing` in the list

### Frontend Can't Connect to Backend

**Error**: "Failed to connect to API" or network error

**Solution**:
1. Verify backend is running on port 5000
2. Check browser console (F12) for detailed error
3. Try accessing backend directly: http://localhost:5000/health
4. Should return JSON with status "healthy"

### Dependencies Installation Failed

**Solution**:
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Expected Behavior

### Successful Registration
- ✅ Form validates email format
- ✅ Password is required (min 6 chars recommended)
- ✅ Redirects to dashboard after registration
- ✅ Shows success toast message

### Dashboard Features
- ✅ Shows number of websites
- ✅ Shows current plan (FREE)
- ✅ Shows API quota usage
- ✅ Add website form works
- ✅ Website list displays correctly

### Website Management
- ✅ Can add website with domain
- ✅ Target keywords are optional
- ✅ Can view website details
- ✅ Can delete website

### SEO Audit
- ✅ Runs quickly (2-3 seconds)
- ✅ Shows four scores (overall, on-page, technical, content)
- ✅ Lists issues with severity
- ✅ Shows recommendations
- ✅ Displays as cards/sections

### Keywords
- ✅ Shows keyword table
- ✅ Displays search volume
- ✅ Shows difficulty (0-100)
- ✅ Shows position (or "Not ranked")
- ✅ Shows trend (up/down/stable)

---

## Testing Checklist

Use this to verify everything works:

### UI Tests
- [ ] Home page loads
- [ ] Login page works
- [ ] Register page works
- [ ] Dashboard displays
- [ ] Website details page loads
- [ ] Forms submit without errors
- [ ] Navigation works

### Functionality Tests
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can add website
- [ ] Can view website details
- [ ] Can run audit (results appear)
- [ ] Can see keywords
- [ ] Can logout
- [ ] Can login again
- [ ] Data persists after refresh

### API Tests
- [ ] Backend health check works
- [ ] Can register via API
- [ ] Can login via API
- [ ] Can add website via API
- [ ] Can get profile via API
- [ ] JWT token works
- [ ] Protected routes require token

### Database Tests
- [ ] New user created in database
- [ ] Website stored in database
- [ ] Audit results saved
- [ ] Data persists between sessions

---

## Performance Expectations

- **Page Load**: 1-3 seconds
- **API Response**: 50-200ms
- **Audit Run**: 2-5 seconds (mock data)
- **Form Submit**: <1 second

---

## What's Real vs. Mock

### Real
- ✅ User authentication (JWT tokens)
- ✅ Database storage (PostgreSQL)
- ✅ Website management
- ✅ API responses
- ✅ User sessions

### Mock (For MVP Testing)
- ⏳ SEO audit scores (will integrate real APIs in v1.0)
- ⏳ Keyword research data (will use SemRush/Ahrefs in v1.0)
- ⏳ Payment processing (Stripe coming in v1.0)
- ⏳ Email notifications (coming later)

---

## Next Steps After Testing

1. **Document Issues**: Note any bugs found
2. **Get User Feedback**: See how others use it
3. **Identify Improvements**: What could be better?
4. **Plan Phase 1 Features**:
   - Stripe payment integration
   - Real SEO API connections
   - Email notifications
   - Scheduled audits

---

## Keeping Servers Running

### Option 1: Dual Terminal (Recommended)
- Terminal 1: Backend running
- Terminal 2: Frontend running
- Both visible for monitoring

### Option 2: Background Process
```bash
# Start backend in background
npm run dev --workspace=backend &

# Start frontend in new terminal
npm run dev --workspace=frontend
```

### To Stop Servers
```bash
# Press Ctrl+C in each terminal
# This gracefully shuts down the servers
```

---

## Database Inspection (Optional)

To view data stored in PostgreSQL:

```bash
# Connect to database
psql -U postgres -d ai_marketing

# List tables
\dt

# View users
SELECT * FROM users;

# View websites
SELECT * FROM websites;

# View audits
SELECT * FROM seo_reports;

# Exit
\q
```

---

## Browser DevTools Tips

### Network Tab (F12)
1. Open DevTools
2. Go to Network tab
3. Perform action (register, add website, etc.)
4. Watch API calls
5. Check status codes (200, 400, 401, 500)
6. View response in Preview/Response tab

### Console Tab
1. Look for errors (red text)
2. Check for warnings (yellow text)
3. Inspect API responses logged

### Storage/Application Tab
1. Go to LocalStorage
2. Should see `token` stored after login
3. Token used for authenticated requests

---

## Success Indicators

You've successfully tested the app if:

✅ Can register account
✅ Can login with credentials
✅ Can add website
✅ Can run SEO audit
✅ Audit results display
✅ Keywords are shown
✅ Can logout
✅ Can login again
✅ Data persists
✅ No major errors in console

---

## Support & Resources

- **Questions?** Check LOCAL_TESTING.md for detailed guide
- **API Reference?** See API_DOCS.md
- **Setup Issues?** See SETUP.md
- **Future Plans?** Check ROADMAP.md

---

## You're Ready! 🚀

Everything is set up and ready to test!

Start with the 3-Step Quick Start above, then follow the Full Testing Workflow.

Have fun exploring the platform!

---

**Version**: MVP 0.1.0
**Last Updated**: November 12, 2025
**Status**: Ready for testing
