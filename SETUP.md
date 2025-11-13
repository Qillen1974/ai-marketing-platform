# Setup Guide - AI Marketing Platform

Complete step-by-step guide to get the application running locally.

## Prerequisites

Before you start, make sure you have:
- **Node.js** 18 or higher ([download](https://nodejs.org/))
- **PostgreSQL** 12 or higher ([download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js) or **yarn**
- A code editor (VS Code recommended)
- A terminal/command prompt

## Step 1: Install PostgreSQL

### Windows
1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Keep default settings for port (5432)
5. Complete the installation

### macOS
```bash
brew install postgresql
brew services start postgresql
```

### Linux
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

## Step 2: Create Database

Open PostgreSQL command line (psql):

```bash
# Login as postgres user
psql -U postgres

# Create database
CREATE DATABASE ai_marketing;

# List databases to confirm
\l

# Exit
\q
```

## Step 3: Configure Backend Environment

1. Navigate to backend directory:
```bash
cd backend
```

2. Create `.env` file (if not already created):
```bash
# Copy from example
cp src/config/env.example .env
```

3. Edit `.env` file with your settings:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_NAME=ai_marketing
JWT_SECRET=your_super_secret_key_change_in_production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
```

## Step 4: Install Dependencies

From the root directory:

```bash
# Install all dependencies
npm install

# Or install for specific workspace
npm install --workspace=backend
npm install --workspace=frontend
```

## Step 5: Start Development Servers

Open two terminal windows:

### Terminal 1 - Backend Server
```bash
npm run dev --workspace=backend
```

You should see:
```
Backend server running on port 5000
Environment: development
API URL: http://localhost:5000
```

### Terminal 2 - Frontend Server
```bash
npm run dev --workspace=frontend
```

You should see:
```
▲ Next.js 14.0.0
- Local:        http://localhost:3000
```

## Step 6: Test the Application

### Option 1: Using Browser
1. Open http://localhost:3000
2. Click "Sign Up"
3. Create a test account:
   - Full Name: Test User
   - Email: test@example.com
   - Password: password123
   - Company: Test Company

4. You should be redirected to the dashboard
5. Add a test website: example.com
6. Click "Run SEO Audit" to test the audit feature

### Option 2: Using API Tests

Create a `test-api.sh` file to test endpoints:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"

# Register
REGISTER=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "fullName":"Test User",
    "companyName":"Test Company"
  }')

echo "Register Response:"
echo $REGISTER

# Extract token
TOKEN=$(echo $REGISTER | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# Get Profile
curl -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN"
```

## Step 7: Database Schema Verification

The schema is automatically created when the backend starts. To verify:

```bash
# Login to PostgreSQL
psql -U postgres -d ai_marketing

# List tables
\dt

# You should see tables:
# - users
# - websites
# - seo_reports
# - keywords
# - audit_results
# - payments

# View table structure
\d users
\d websites

# Exit
\q
```

## Troubleshooting

### Port Already in Use
If port 5000 or 3000 is already in use:

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev --workspace=backend
```

### Database Connection Error
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Verify database exists: `psql -U postgres -l`
- Check port 5432 is accessible

### Dependencies Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend Can't Connect to API
- Ensure backend is running on port 5000
- Check `.env.local` has correct API_URL
- Check CORS is enabled in backend (`cors()` middleware)

## Project Structure After Setup

```
ai-marketing/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # Database setup & schema
│   │   │   └── env.example
│   │   ├── controllers/         # Business logic
│   │   ├── middleware/          # Auth middleware
│   │   ├── routes/              # API routes
│   │   ├── services/            # SEO services
│   │   └── index.js             # Express app
│   ├── .env                     # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # API client
│   │   ├── stores/              # State management
│   │   └── app/globals.css      # Global styles
│   ├── .env.local               # Environment variables
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
└── README.md
```

## Key Endpoints to Test

### Health Check
```bash
curl http://localhost:5000/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"password123",
    "fullName":"Your Name"
  }'
```

### Add Website
```bash
curl -X POST http://localhost:5000/api/websites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "domain":"example.com",
    "targetKeywords":"seo, marketing"
  }'
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload during development
2. **Debugging**: Use `console.log()` in backend, browser DevTools in frontend
3. **Database**: Install pgAdmin for GUI database management
4. **API Testing**: Use Postman or Insomnia for API testing
5. **Logs**: Check terminal output for errors and logs

## Next Steps

After successful setup:

1. **Add More Features**
   - Implement Stripe payment integration
   - Add real SEO API integrations
   - Create scheduled audit jobs

2. **Improve UI**
   - Add more advanced charts
   - Implement real-time notifications
   - Create mobile-responsive design

3. **Testing**
   - Write unit tests
   - Add integration tests
   - Test payment flows

4. **Deployment**
   - Set up production database
   - Configure environment variables
   - Deploy to hosting platform (Vercel, Heroku, AWS, etc.)

## Support

If you encounter any issues:

1. Check error messages in terminal
2. Review logs in browser console
3. Ensure all ports are available
4. Verify all environment variables are set correctly
5. Restart both servers

---

**Happy coding!** 🚀
