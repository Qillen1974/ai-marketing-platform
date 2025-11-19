const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const auditRoutes = require('./routes/auditRoutes');
const keywordRoutes = require('./routes/keywordRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const quotaRoutes = require('./routes/quotaRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');
const redditRoutes = require('./routes/redditRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const aiMessageRoutes = require('./routes/aiMessageRoutes');
const competitorAnalysisRoutes = require('./routes/competitorAnalysisRoutes');
const siteHealthRoutes = require('./routes/siteHealthRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(null, true); // Allow anyway for now, but log it
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Initialize database (async initialization)
let dbReady = false;
(async () => {
  try {
    await initDatabase();
    dbReady = true;
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/quota', quotaRoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminUsersRoutes);

// Reddit community routes
app.use('/api/reddit', redditRoutes);

// Ranking/SEO tracking routes
app.use('/api/rankings', rankingRoutes);

// AI message generation routes
app.use('/api/ai', aiMessageRoutes);

// Competitor analysis routes
app.use('/api/competitors', competitorAnalysisRoutes);

// Site health monitoring routes
app.use('/api/site-health', siteHealthRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
});
