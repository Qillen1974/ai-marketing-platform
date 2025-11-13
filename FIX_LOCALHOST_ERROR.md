# Fix ERR_CONNECTION_REFUSED Error

## What This Error Means

Your browser tried to connect to `http://localhost:3000` but couldn't because:
- The frontend server is NOT running, OR
- The frontend server crashed, OR
- Another app is using port 3000

---

## Quick Fix (90% Works)

### Step 1: Stop Everything
Press **Ctrl+C** in all open terminals to stop any running processes.

### Step 2: Clear Next.js Cache
Navigate to the frontend folder and delete the build cache:

**Option A (Command line):**
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend"
rmdir /s /q .next
```

**Option B (File Explorer):**
1. Open File Explorer
2. Go to `frontend` folder
3. Look for `.next` folder
4. Delete it (if hidden files not shown, you may need to enable viewing hidden files)

### Step 3: Start Fresh

**Terminal 1:**
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
npm run dev --workspace=backend
```

Wait for:
```
Backend server running on port 5000
```

**Terminal 2 (NEW terminal window):**
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
npm run dev --workspace=frontend
```

Wait for:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Terminal 3 (Browser):**
Visit: http://localhost:3000

---

## If That Doesn't Work

### Check What Happened

Look at your **frontend terminal** (Terminal 2) very carefully.

**If you see:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```
✅ Frontend IS running - problem is with browser/localhost

**If you see ERROR messages:**
❌ Frontend has a problem - read the error and continue below

---

## Troubleshooting by Error Type

### Error Type 1: "Module not found" or "Can't resolve"

**Problem**: Missing npm packages

**Solution:**
```bash
# Stop frontend (Ctrl+C)
# Go to project root
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Delete node_modules
rmdir /s /q node_modules

# Clear npm cache
npm cache clean --force

# Reinstall
npm install

# Try again
npm run dev --workspace=frontend
```

---

### Error Type 2: "Port 3000 already in use"

**Problem**: Another app is using port 3000

**Solution:**

**Option A - Find what's using it:**
```bash
netstat -ano | findstr :3000
```

Take note of the PID (last number), then:
```bash
taskkill /PID <number> /F
```

Then try `npm run dev --workspace=frontend` again

**Option B - Use different port:**
```bash
set PORT=3001
npm run dev --workspace=frontend
```

Then visit: http://localhost:3001

---

### Error Type 3: "ENOENT: no such file or directory"

**Problem**: Some file is missing

**Solution:**
```bash
# Check frontend folder exists
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend"
dir

# Should show: package.json, next.config.js, src, etc.

# If files are missing, recreate them from backup
# Or reinstall the whole thing
```

---

### Error Type 4: "React error" or "Uncaught error"

**Problem**: Code error in frontend

**Solution:**
1. Check the error message carefully
2. Go to TROUBLESHOOTING.md and look for matching error
3. Or take a screenshot of the error and share it

---

## Windows-Specific Steps

### Using PowerShell (Recommended)

Open PowerShell instead of Command Prompt:

```powershell
# Navigate to project
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Start backend
npm run dev --workspace=backend

# In NEW PowerShell window, start frontend
npm run dev --workspace=frontend
```

### Using Command Prompt

Same commands work, but might have permission issues.

**If you get permission errors:**
1. Right-click Command Prompt
2. Choose "Run as Administrator"
3. Try again

---

## Complete Diagnostic

Run this script to check everything:

```bash
# On Windows, double-click: DIAGNOSE.bat
# Or run in terminal:
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
DIAGNOSE.bat
```

This will check:
- Node.js installed
- npm installed
- Project folder exists
- node_modules exists
- All key files exist
- Ports 3000 and 5000 are free

---

## Step-by-Step Recovery

If everything is broken, do this:

### Step 1: Close Everything
- Close all terminal windows
- Close all browser windows
- Close VS Code if open

### Step 2: Restart Computer
This clears any stuck processes.

### Step 3: Navigate to Project
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
```

### Step 4: Check Status
```bash
npm run dev --workspace=backend
```

Wait 5 seconds, look for: `Backend server running on port 5000`

### Step 5: New Terminal for Frontend
Open a NEW terminal window:
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
npm run dev --workspace=frontend
```

Wait 10 seconds (Next.js takes longer to start), look for: `ready - started server on 0.0.0.0:3000`

### Step 6: Open Browser
Visit: **http://localhost:3000**

If still doesn't work, continue to Advanced Troubleshooting.

---

## Advanced Troubleshooting

### Test Backend is Working

In a new terminal:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"status":"healthy","timestamp":"..."}
```

If you get an error, backend isn't running properly.

### Test Frontend is Running

1. Open Windows Task Manager (Ctrl+Shift+Esc)
2. Look for "node.exe" processes
3. You should see at least 2:
   - One for backend
   - One for frontend

If you don't see frontend, it's not running.

### Check Firewall

Windows Firewall might be blocking localhost:

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Check if "Node.js" is in the list
4. If not, add it

---

## Nuclear Option (Complete Reset)

If absolutely nothing works:

```bash
# 1. Delete everything
rmdir /s /q "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\node_modules"
rmdir /s /q "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend\node_modules"
rmdir /s /q "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\backend\node_modules"
rmdir /s /q "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend\.next"

# 2. Delete lock files
del "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\package-lock.json"
del "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend\package-lock.json"
del "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\backend\package-lock.json"

# 3. Clear npm cache
npm cache clean --force

# 4. Reinstall from scratch
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
npm install

# 5. Try again
npm run dev --workspace=backend
# In new terminal:
npm run dev --workspace=frontend
```

---

## I'm Still Stuck!

Tell me:

1. **What exact command are you running?**
2. **What's shown in the terminal?** (Copy the whole output)
3. **Which terminal - backend or frontend?**
4. **Did you see an error message?** (If yes, copy it exactly)
5. **Did the terminal say "ready" or "running"?**

With this info, I can help you!

---

## Success Indicators

You've fixed it if:
- ✅ Backend terminal shows "Backend server running on port 5000"
- ✅ Frontend terminal shows "ready - started server on 0.0.0.0:3000"
- ✅ Browser shows "AI Marketing Platform" homepage
- ✅ No error messages in either terminal

---

**Start with Quick Fix above, then follow the recovery steps if needed.**
