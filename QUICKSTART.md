# Quick Start Guide - AI Marketing Platform

Get up and running in 5 minutes!

## Prerequisites
- Node.js 18+
- PostgreSQL running locally

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
```bash
# Create database
createdb ai_marketing

# Update backend/.env with your PostgreSQL password
# Change: DB_PASSWORD=your_postgres_password_here
```

### 3. Start Servers
```bash
# Terminal 1: Backend (port 5000)
npm run dev --workspace=backend

# Terminal 2: Frontend (port 3000)
npm run dev --workspace=frontend
```

## Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health

## First Steps in App

1. **Register**: Click "Sign Up" on homepage
   ```
   Email: test@example.com
   Password: password123
   Full Name: Test User
   ```

2. **Add Website**: On dashboard, enter your domain
   ```
   Domain: example.com
   Keywords: seo, marketing (optional)
   ```

3. **Run Audit**: Click "Run SEO Audit" button
   - Wait for analysis to complete
   - View scores and recommendations

4. **View Keywords**: Switch to "Keywords" tab
   - See tracked keywords
   - Check search volume and difficulty

## API Quick Test

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "fullName":"Test User"
  }'

# Login (get token from response)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'

# Get Profile (use token from login)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Key Features Implemented

✅ User authentication (registration, login)
✅ Website management (add, edit, delete)
✅ SEO audits with mock data
✅ Keyword research tracking
✅ Dashboard with real-time stats
✅ Plan-based quotas (Free/Pro/Enterprise)
✅ Responsive UI with Tailwind CSS
✅ State management with Zustand
✅ PostgreSQL database schema

## Next: Features to Add

1. **Payment Integration** (Stripe)
   - Upgrade users to Pro/Enterprise
   - Track subscription status

2. **Real SEO Data** (Integrations)
   - Semrush API for keyword data
   - Google Search Console integration
   - Page speed analysis

3. **Automation**
   - Scheduled audits
   - Email reports
   - Slack notifications

4. **Advanced Features**
   - Competitor analysis
   - Backlink monitoring
   - Content recommendations
   - AI-generated insights

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Kill process: `lsof -i :5000 \| kill -9 PID` |
| DB Connection Error | Check PostgreSQL running: `psql -U postgres` |
| API connection failed | Ensure backend running on 5000 |
| Dependencies error | `rm -rf node_modules && npm install` |

## Project Architecture

```
Frontend (React/Next.js)
    ↓ (Axios API calls)
Backend API (Express.js)
    ↓ (SQL queries)
PostgreSQL Database
```

### Data Flow
1. User registers → Stored in `users` table
2. User adds website → Stored in `websites` table
3. User runs audit → Analysis saved in `seo_reports`
4. Keywords tracked → Stored in `keywords` table

## Database Tables

- **users**: User accounts, plans, API quotas
- **websites**: Tracked websites per user
- **seo_reports**: Audit results and scores
- **keywords**: Tracked keywords and metrics
- **audit_results**: Detailed issue findings
- **payments**: Payment history (for Stripe)

## Important Files

- `backend/src/index.js` - Express server entry point
- `backend/src/config/database.js` - Database setup
- `frontend/src/app/page.tsx` - Home page
- `frontend/src/app/dashboard/page.tsx` - Main dashboard
- `frontend/src/stores/authStore.ts` - Auth state management

## Development Workflow

1. **Feature Development**
   ```bash
   # Start both servers
   npm run dev --workspace=backend
   npm run dev --workspace=frontend
   ```

2. **Database Changes**
   - Edit `database.js` schema
   - Restart backend to apply

3. **Testing API**
   - Use Postman/Insomnia
   - Or test in browser at http://localhost:3000

4. **Code Changes**
   - Backend: Auto-restart with nodemon
   - Frontend: Auto-reload with Next.js

## Production Ready

Before deploying:
- [ ] Change JWT_SECRET in `.env`
- [ ] Add rate limiting
- [ ] Implement real API integrations
- [ ] Add comprehensive tests
- [ ] Set up error tracking
- [ ] Configure production database
- [ ] Add email notifications
- [ ] Implement caching

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=ai_marketing
JWT_SECRET=your_secret_key
PORT=5000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Support & Resources

- **PostgreSQL**: https://www.postgresql.org/docs/
- **Express.js**: https://expressjs.com/
- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Ready to build?** Start servers and visit http://localhost:3000! 🚀
