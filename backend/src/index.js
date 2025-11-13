const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const auditRoutes = require('./routes/auditRoutes');
const keywordRoutes = require('./routes/keywordRoutes');
const backlinkRoutes = require('./routes/backlinkRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/backlinks', backlinkRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/monitoring', monitoringRoutes);

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
