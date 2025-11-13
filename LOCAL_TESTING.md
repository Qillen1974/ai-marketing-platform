# Local Development Testing Guide

Complete step-by-step guide to test the AI Marketing Platform on your local machine.

## Prerequisites Check

Before starting, you need:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] PostgreSQL installed and running

---

## Step 1: Check Node.js and npm Installation

Open your terminal/command prompt and run:

```bash
node --version
# Should show v18.0.0 or higher

npm --version
# Should show 9.0.0 or higher
```

If you don't have Node.js, download from: https://nodejs.org/

---

## Step 2: Install and Setup PostgreSQL

### Windows
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run installer and follow prompts
3. Remember the password for "postgres" user (you'll need it)
4. Keep port as 5432 (default)
5. Complete installation

### macOS
```bash
# Install PostgreSQL using Homebrew
brew install postgresql

# Start PostgreSQL service
brew services start postgresql
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
```

---

## Step 3: Create the Database

Open PostgreSQL command line (psql):

### Windows
```bash
# Open Command Prompt or PowerShell and run:
psql -U postgres

# Then in psql, create database:
CREATE DATABASE ai_marketing;

# List databases to verify:
\l

# Exit psql:
\q
```

### macOS/Linux
```bash
# Open Terminal and run:
psql postgres

# Then in psql:
CREATE DATABASE ai_marketing;

# Verify:
\l

# Exit:
\q
```

**You should see** `ai_marketing` in the database list.

---

## Step 4: Navigate to Project Directory

```bash
# Navigate to your project
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Verify you're in the right place
dir
# You should see: backend, frontend, README.md, package.json, etc.
```

---

## Step 5: Configure Backend Environment

1. Open `backend/.env` file
2. Update the PostgreSQL password:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE   <- CHANGE THIS
DB_NAME=ai_marketing
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
```

3. Save the file

---

## Step 6: Install All Dependencies

From the root directory (ai-marketing), run:

```bash
npm install
```

This will install dependencies for both backend and frontend (thanks to workspaces setup).

**Wait time**: 2-5 minutes depending on internet speed

You should see:
```
added XXX packages in XX.XXs
```

---

## Step 7: Start Backend Server (Terminal 1)

Open a NEW terminal window and run:

```bash
npm run dev --workspace=backend
```

**Expected output**:
```
> backend dev
nodemon src/index.js

[nodemon] 3.0.1
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): src/**/*
Database schema initialized successfully
Backend server running on port 5000
Environment: development
API URL: http://localhost:5000
```

✅ **Backend is running!** Leave this terminal open.

---

## Step 8: Start Frontend Server (Terminal 2)

Open ANOTHER NEW terminal window and run:

```bash
npm run dev --workspace=frontend
```

**Expected output**:
```
> frontend dev
next dev

▲ Next.js 14.0.0
- Local:        http://localhost:3000
```

✅ **Frontend is running!** Leave this terminal open.

---

## Step 9: Open Application in Browser

Go to: **http://localhost:3000**

You should see:
- AI Marketing Platform heading
- "Login" button
- "Sign Up" button

---

## Step 10: Test User Registration

### Register New Account
1. Click "Sign Up"
2. Fill in the form:
   ```
   Full Name: John Doe
   Company: Acme Corp (optional)
   Email: john@example.com
   Password: password123
   ```
3. Click "Sign Up" button
4. You should be redirected to dashboard with success message

---

## Step 11: Test Website Management

### Add Website
1. On dashboard, scroll to "Add New Website" section
2. Fill in form:
   ```
   Domain: example.com
   Target Keywords: seo, marketing, digital (optional)
   ```
3. Click "Add Website"
4. You should see success message and website appears in list

### Verify Website Added
- Check "Your Websites" section
- Should show:
  - Website domain
  - Target keywords
  - View and Delete buttons

---

## Step 12: Test SEO Audit

### Run Audit
1. Click "View" on your website in the list
2. Click "Run SEO Audit" button
3. Wait for audit to complete (a few seconds)
4. You should see results with:
   - Overall Score (e.g., 72)
   - Individual scores (On-Page, Technical, Content)
   - Issues found
   - Recommendations

### View Audit Results
- Check "SEO Scores" section
- Review "Issues Found" section
- Read "Recommendations" section

---

## Step 13: Test Keywords Feature

### View Keywords
1. On website details page, click "Keywords" tab
2. You should see tracked keywords with:
   - Keyword name
   - Search volume
   - Difficulty score
   - Current position
   - Trend (up/down/stable)

### Add Keyword (Optional)
- If there are no keywords yet, run an audit first
- Keywords will be populated from audit data

---

## Step 14: Test Dashboard Features

### Check Dashboard Stats
1. Go back to dashboard (click "AI Marketing" logo)
2. Verify stats display:
   - Total Websites: Should show your website count
   - Plan: Should show "FREE"
   - API Usage: Should show usage count

### Test Website Deletion
1. Click "Delete" on a website
2. Confirm deletion
3. Website should disappear from list

---

## Step 15: Test Login/Logout

### Logout
1. Click username in top right
2. Click "Logout" button
3. You should be redirected to home page

### Login
1. Click "Login"
2. Enter your credentials:
   ```
   Email: john@example.com
   Password: password123
   ```
3. Click "Login"
4. You should be back on dashboard

---

## Testing the API Directly (Optional)

If you want to test the API without the UI, use curl or Postman:

### Register User (curl)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"password123",
    "fullName":"Test User",
    "companyName":"Test Company"
  }'
```

**Expected response**:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "testuser@example.com",
    "fullName": "Test User",
    "plan": "free"
  },
  "token": "eyJhbGc..."
}
```

### Login User (curl)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"password123"
  }'
```

Save the token from the response, then use it for protected endpoints.

### Get User Profile (curl)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Add Website (curl)
```bash
curl -X POST http://localhost:5000/api/websites \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "domain":"example.com",
    "targetKeywords":"seo, marketing"
  }'
```

### Run Audit (curl)
```bash
curl -X POST http://localhost:5000/api/audits/1/run \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### Problem: Port 5000 Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process (replace PID with actual number)
kill -9 PID

# Or use a different port
PORT=5001 npm run dev --workspace=backend
```

### Problem: Database Connection Failed

**Error**: `error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Verify PostgreSQL is running
2. Check credentials in `.env` file
3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```
4. Create database if missing:
   ```bash
   createdb ai_marketing
   ```

### Problem: Dependencies Installation Failed

**Error**: `npm ERR! code ERESOLVE`

**Solution**:
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Problem: Frontend Can't Connect to Backend

**Error**: Network error in browser console

**Solution**:
1. Verify backend is running on port 5000
2. Check `.env.local` has correct API_URL
3. Try accessing backend directly: `http://localhost:5000/health`
4. Should return: `{"status":"healthy",...}`

### Problem: TypeScript Errors

**Solution**: These are usually safe to ignore during development. Restart the server:
```bash
# Press Ctrl+C to stop
# Then run again
npm run dev --workspace=frontend
```

---

## Testing Checklist

Use this checklist to verify everything works:

### Backend Tests
- [ ] Backend starts without errors
- [ ] Database schema initialized successfully
- [ ] API responds to health check: `http://localhost:5000/health`
- [ ] Can register user via API
- [ ] Can login and get JWT token
- [ ] Can add website (authenticated)
- [ ] Can run audit (authenticated)
- [ ] Can fetch keywords (authenticated)

### Frontend Tests
- [ ] Frontend loads at `http://localhost:3000`
- [ ] Home page displays login/signup buttons
- [ ] Can register new account
- [ ] Redirects to dashboard after registration
- [ ] Can add website on dashboard
- [ ] Website appears in list
- [ ] Can click View to see website details
- [ ] Can run SEO audit
- [ ] Audit results display correctly
- [ ] Can view keywords
- [ ] Can logout
- [ ] Can login again

### User Flow Tests
- [ ] Register → Login → Add Website → Run Audit → View Results → Logout → Login

### Database Tests
- [ ] Data persists after page reload
- [ ] Website list shows added websites
- [ ] Audit history shows previous audits
- [ ] Keywords persist between audits

---

## Performance Testing (Local)

### Check Response Times

Open browser DevTools (F12):
1. Go to Network tab
2. Perform actions and watch response times
3. Expected times:
   - API calls: 50-200ms
   - Page loads: 1-3s
   - Audit runs: 2-5s

### Monitor Console

Check browser console (F12 → Console) for:
- No red errors
- No warnings (some yellows are okay)
- API responses logged correctly

---

## Data Persistence

The application stores data in PostgreSQL, so:
- ✅ Data persists after page refresh
- ✅ Data persists after logging out and in
- ✅ Data persists between server restarts (database survives)

To reset all data:
```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE ai_marketing;
CREATE DATABASE ai_marketing;
\q

# Restart backend to reinitialize schema
npm run dev --workspace=backend
```

---

## Testing with Multiple Users

To test multi-user features:

### Create Multiple Accounts
1. Register user 1: `user1@example.com`
2. Add website to user 1
3. Logout
4. Register user 2: `user2@example.com`
5. Add website to user 2
6. Verify each user only sees their own websites

---

## Testing Plan Limits

The free plan allows:
- 1 website maximum
- 1,000 API calls per month

To test this:
1. Add 1st website - should succeed
2. Try to add 2nd website - should show error: "Plan limit reached"

---

## Browser DevTools Testing

### Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (register, add website, run audit)
4. Watch API calls:
   - Should see 200 status codes for success
   - Should see 400s for validation errors
   - Should see 401 for unauthorized
   - Should see 500 for server errors

### Check Console for Errors
1. Go to Console tab
2. Look for red error messages
3. Check localStorage for token storage

### Check Application/Storage
1. Go to Application/Storage tab
2. Check LocalStorage
3. Should see token stored

---

## Next Steps After Testing

1. **Identify Issues**: Note any bugs or errors
2. **Test Edge Cases**: Try unusual inputs
3. **Performance**: Check speed and responsiveness
4. **User Experience**: See how intuitive it is
5. **Documentation**: Verify docs match functionality

---

## Support Commands

If you need to troubleshoot, use these:

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check PostgreSQL status (macOS)
brew services list

# Check PostgreSQL status (Linux)
sudo systemctl status postgresql

# List all databases
psql -U postgres -l

# Connect to ai_marketing database
psql -U postgres -d ai_marketing

# View all tables in database
psql -U postgres -d ai_marketing
\dt

# Clear node_modules and reinstall
rm -rf node_modules && npm install
```

---

## Success Indicators

You've successfully set up local testing if:
✅ Backend runs without errors on port 5000
✅ Frontend loads without errors on port 3000
✅ Can register a new user
✅ Can add a website
✅ Can run an SEO audit
✅ Can view keywords
✅ Can logout and login again
✅ Data persists after page reload

---

## Final Checklist

Before moving to the next phase:
- [ ] PostgreSQL installed and running
- [ ] Database `ai_marketing` created
- [ ] Backend `.env` configured
- [ ] Dependencies installed
- [ ] Backend server running on 5000
- [ ] Frontend server running on 3000
- [ ] Can access http://localhost:3000
- [ ] Can complete full user flow
- [ ] No major errors in console

---

**You're all set for local testing!** 🚀

If you encounter issues, refer to the Troubleshooting section above.
