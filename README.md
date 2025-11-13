# AI Marketing Platform

An AI-powered website marketing automation platform that helps users optimize their websites for search engines and drive organic traffic.

## Features

### Core Features (MVP)
- **User Authentication**: Sign up, login with JWT tokens
- **Website Management**: Add and manage multiple websites (based on plan)
- **SEO Audits**: Automated website analysis with actionable insights
- **Keyword Research**: Track keywords and search volume metrics
- **Dashboard**: Real-time analytics and performance tracking
- **Plan Management**: Free, Pro, and Enterprise tiers with different quotas

### Coming Soon
- AI-powered content generation
- Competitor analysis
- Backlink monitoring
- White-label solutions
- Advanced reporting

## Project Structure

```
ai-marketing/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Database and configuration
│   │   ├── controllers/    # API logic
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   └── package.json
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities (API calls, etc.)
│   │   ├── stores/        # Zustand state management
│   │   └── types/         # TypeScript types
│   └── package.json
└── package.json           # Root workspace config
```

## Tech Stack

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcryptjs
- **Payment**: Stripe (coming soon)

### Frontend
- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-marketing
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Backend (.env):
```bash
cp backend/src/config/env.example backend/.env
# Edit backend/.env with your settings
```

Frontend (.env.local):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. **Set up PostgreSQL database**
```bash
createdb ai_marketing
```

5. **Start development servers**

Terminal 1 - Backend:
```bash
npm run dev --workspace=backend
```

Terminal 2 - Frontend:
```bash
npm run dev --workspace=frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Websites
- `POST /api/websites` - Add new website (protected)
- `GET /api/websites` - List user's websites (protected)
- `GET /api/websites/:id` - Get website details (protected)
- `PUT /api/websites/:id` - Update website (protected)
- `DELETE /api/websites/:id` - Delete website (protected)

### Audits
- `POST /api/audits/:websiteId/run` - Run SEO audit (protected)
- `GET /api/audits/:websiteId/history` - Get audit history (protected)
- `GET /api/audits/:websiteId/report/:reportId` - Get specific report (protected)

### Keywords
- `GET /api/keywords/:websiteId` - Get keywords for website (protected)
- `GET /api/keywords/:websiteId/research` - Run keyword research (protected)
- `POST /api/keywords/:websiteId` - Add keyword to track (protected)

## Plan Tiers

### Free
- 1 website
- Weekly audits
- Basic keyword research (top 10)
- 1,000 API calls/month
- Community support

### Pro ($49/month)
- 3 websites
- Daily audits
- Full keyword research
- Competitor analysis (3 competitors)
- 10,000 API calls/month
- Email + Chat support

### Enterprise (Custom)
- Unlimited websites
- Real-time audits
- Advanced AI features
- White-label options
- Custom integrations
- Dedicated support

## Database Schema

Key tables:
- **users**: User accounts and subscription info
- **websites**: Monitored websites
- **seo_reports**: Audit results and scores
- **keywords**: Tracked keywords and metrics
- **audit_results**: Detailed audit findings
- **payments**: Payment transaction history

## Future Enhancements

### Phase 2
- [ ] Stripe payment integration
- [ ] Advanced keyword research (Semrush/Ahrefs API)
- [ ] Automated scheduling for audits
- [ ] Email reports
- [ ] Competitor backlink analysis

### Phase 3
- [ ] AI-powered content generation (Claude/GPT)
- [ ] Social media integration
- [ ] Slack notifications
- [ ] Custom alerts
- [ ] API for partners

### Phase 4
- [ ] White-label platform
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Machine learning insights
- [ ] Custom domain support

## Development

### Running Tests
```bash
npm run test --workspace=backend
npm run test --workspace=frontend
```

### Building for Production
```bash
npm run build
```

### Database Migrations
(Coming soon - using tools like Flyway or db-migrate)

## Security

- JWT tokens for authentication
- Password hashing with bcryptjs
- CORS enabled for frontend domain
- SQL injection protection via parameterized queries
- Rate limiting (coming soon)
- API key validation (coming soon)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.

---

**Current Version**: 0.1.0 (MVP)
**Last Updated**: 2025-11-12
