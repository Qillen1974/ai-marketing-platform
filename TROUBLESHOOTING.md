# Troubleshooting Guide

## Error: ERR_CONNECTION_REFUSED on localhost:3000

This error means the frontend server is not running. Let's fix it.

---

## Solution 1: Check if Frontend is Running

### Step 1: Look at Your Frontend Terminal

When you ran `npm run dev --workspace=frontend`, you should see:

**CORRECT OUTPUT:**
```
> frontend@1.0.0 dev
> next dev

▲ Next.js 14.0.0
- Local:        http://localhost:3000
- Environments: .env.local

ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**WRONG OUTPUT (shows errors):**
```
error messages...
Server didn't start
```

---

## Solution 2: If Frontend Didn't Start

### Try These Steps:

**Step 1: Stop the Current Process**
```bash
# Press Ctrl+C in the frontend terminal
# This stops any running process
```

**Step 2: Clear Next.js Cache**
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing\frontend"
rm -rf .next
```

On Windows, if rm doesn't work:
```bash
# Delete the .next folder manually through File Explorer
# Or use:
rmdir /s /q .next
```

**Step 3: Try Running Again**
```bash
npm run dev --workspace=frontend
```

---

## Solution 3: Check Node Modules

Sometimes dependencies don't install properly:

```bash
# Go to project root
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Delete node_modules and package-lock
rm -rf node_modules package-lock.json

# On Windows if rm doesn't work:
# Just delete node_modules folder manually

# Reinstall everything
npm install
```

Then try running the frontend again:
```bash
npm run dev --workspace=frontend
```

---

## Solution 4: Check if Port 3000 is in Use

Sometimes port 3000 is already being used by another application:

**Windows (PowerShell):**
```powershell
# Find what's using port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# If something shows up, try a different port:
$env:PORT=3001; npm run dev --workspace=frontend
```

**Windows (Command Prompt):**
```bash
# Check port usage
netstat -ano | findstr :3000

# If busy, use different port:
set PORT=3001
npm run dev --workspace=frontend
```

**macOS/Linux:**
```bash
# Check what's using port 3000
lsof -i :3000

# If busy, use different port:
PORT=3001 npm run dev --workspace=frontend
```

Then visit: **http://localhost:3001** instead of 3000

---

## Solution 5: Full Clean Install

If nothing above works, do a complete reinstall:

```bash
# Step 1: Go to project directory
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"

# Step 2: Delete everything npm-related
# On Windows, manually delete these folders:
#   - node_modules (entire folder)
#   - frontend\node_modules (if exists)
#   - backend\node_modules (if exists)

# Or use command:
rmdir /s /q node_modules
rmdir /s /q frontend\node_modules
rmdir /s /q backend\node_modules

# Step 3: Delete lock files
del package-lock.json
del frontend\package-lock.json
del backend\package-lock.json

# Step 4: Clear npm cache
npm cache clean --force

# Step 5: Reinstall everything
npm install

# Step 6: Try running frontend
npm run dev --workspace=frontend
```

---

## Solution 6: Verify Frontend Files Exist

Make sure all frontend files are in place:

```bash
# Check if these files exist:
# frontend/package.json
# frontend/src/app/page.tsx
# frontend/next.config.js
# frontend/.env.local

# List the directory
cd frontend
dir src/app
```

Should show files like: `layout.tsx`, `page.tsx`, `globals.css`, etc.

---

## Solution 7: Check for Errors in Terminal

**Look carefully at the frontend terminal output** for error messages:

**Common errors:**

1. **"Module not found: Can't resolve"**
   - Solution: Run `npm install` again

2. **"Port 3000 already in use"**
   - Solution: Use different port (see Solution 4)

3. **"Cannot find module 'next'"**
   - Solution: Delete node_modules and reinstall

4. **"ENOENT: no such file"**
   - Solution: Some files might be missing, check file structure

---

## Step-by-Step Debugging

### 1. Check Backend is Running First

Before starting frontend, make sure backend works:

```bash
# Terminal 1: Start backend
npm run dev --workspace=backend

# Should show:
# Backend server running on port 5000
# Database schema initialized successfully
```

### 2. Then Start Frontend

```bash
# Terminal 2: Start frontend
npm run dev --workspace=frontend

# Watch for these messages:
# - "ready - started server"
# - "http://localhost:3000"
```

### 3. Check Browser Console

If page loads but shows errors:

1. Open browser (F12 key)
2. Go to Console tab
3. Look for red error messages
4. Screenshot the error and refer to that

---

## Testing the Servers

### Test Backend
```bash
# In any terminal, run:
curl http://localhost:5000/api/health

# Should return:
# {"status":"healthy","timestamp":"..."}
```

### Test Frontend
Visit: http://localhost:3000

Should show homepage with:
- AI Marketing Platform heading
- Login button
- Sign Up button

---

## If You're Still Having Issues

Please provide:

1. **What command did you run?**
   ```
   npm run dev --workspace=frontend
   ```

2. **What's the exact error message shown in the terminal?**
   (Copy the whole terminal output)

3. **Which terminal shows the error?**
   (Backend terminal or frontend terminal?)

4. **What does each terminal show?**

---

## Quick Checklist

Before giving up, check:

- [ ] Both servers are started (2 terminal windows)
- [ ] Backend terminal shows "Backend server running on port 5000"
- [ ] Frontend terminal shows "ready - started server on 0.0.0.0:3000"
- [ ] Both show green "ready" or "running" messages
- [ ] No red error messages in either terminal
- [ ] You're visiting http://localhost:3000 (not localhost:3)
- [ ] You waited 5-10 seconds for frontend to fully start
- [ ] Port 3000 isn't being used by another app

---

## Windows-Specific Help

### If you're on Windows and having issues:

1. **Use PowerShell instead of Command Prompt**
   - Opens more modern terminal
   - Better npm support

2. **Make sure Node.js is in PATH**
   ```powershell
   node --version
   npm --version
   # Should both work from any directory
   ```

3. **Try running as Administrator**
   - Right-click terminal
   - Choose "Run as Administrator"
   - Then run the commands

4. **Use full paths if needed**
   ```bash
   C:\Users\charl\Downloads\Claude\ Code\ Coursera\ lesson\ai-marketing>
   npm run dev --workspace=frontend
   ```

---

## Common Terminal Issues

### Issue: Command not found
**Solution**: Make sure you're in the project directory first
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
npm run dev --workspace=frontend
```

### Issue: npm is not recognized
**Solution**: Node.js/npm not installed or not in PATH
- Reinstall Node.js from https://nodejs.org/
- Restart terminal after install

### Issue: Spaces in path
**Solution**: Always use quotes around paths with spaces
```bash
cd "C:\Users\charl\Downloads\Claude Code Coursera lesson\ai-marketing"
# Good: path is quoted
```

---

## Nuclear Option (Last Resort)

If absolutely nothing works:

```bash
# 1. Close all terminal windows
# 2. Restart your computer
# 3. Delete the entire ai-marketing folder
# 4. Go back to SETUP.md and start over

# Or try installing with a simpler path:
# Copy ai-marketing folder to C:\ai-marketing
# Then run from there (shorter path, no spaces)
```

---

## Getting Help

If you're stuck, tell me:

1. **Show the error message** from the terminal
2. **Show what terminals are open** (backend, frontend, other)
3. **Show the exact commands** you're running
4. **Show the output** of each command

I can then help you fix it!

---

**Next: Try Solution 1-3 first, they fix 90% of issues**
