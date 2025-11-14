const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_marketing',
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
});

// Initialize database schema
const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        company_name VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'free',
        stripe_customer_id VARCHAR(255),
        subscription_end_date TIMESTAMP,
        api_quota_monthly INTEGER DEFAULT 1000,
        api_quota_used INTEGER DEFAULT 0,
        quota_reset_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS websites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        target_keywords TEXT,
        last_audit_date TIMESTAMP,
        monitoring_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, domain)
      );

      CREATE TABLE IF NOT EXISTS seo_reports (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        audit_date TIMESTAMP DEFAULT NOW(),
        on_page_score INTEGER,
        technical_score INTEGER,
        content_score INTEGER,
        overall_score INTEGER,
        total_issues INTEGER,
        critical_issues INTEGER,
        recommendations TEXT,
        report_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS keywords (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        keyword VARCHAR(255) NOT NULL,
        search_volume INTEGER,
        difficulty INTEGER,
        current_position INTEGER,
        trend VARCHAR(50),
        monthly_searches INTEGER,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(website_id, keyword)
      );

      CREATE TABLE IF NOT EXISTS audit_results (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        audit_date TIMESTAMP DEFAULT NOW(),
        on_page_issues JSONB,
        technical_issues JSONB,
        content_recommendations JSONB,
        priority_ranking INTEGER,
        mobile_friendly BOOLEAN,
        page_speed_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id VARCHAR(255),
        amount INTEGER,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50),
        plan VARCHAR(50),
        billing_period_start TIMESTAMP,
        billing_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
      CREATE INDEX IF NOT EXISTS idx_seo_reports_website_id ON seo_reports(website_id);
      CREATE INDEX IF NOT EXISTS idx_keywords_website_id ON keywords(website_id);
      CREATE INDEX IF NOT EXISTS idx_audit_results_website_id ON audit_results(website_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS backlink_campaigns (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        campaign_name VARCHAR(255) NOT NULL,
        campaign_type VARCHAR(50), -- 'guest_posts', 'broken_links', 'resource_pages', 'directories'
        target_backlinks INTEGER DEFAULT 10,
        status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backlink_opportunities (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES backlink_campaigns(id) ON DELETE SET NULL,
        source_url VARCHAR(255) NOT NULL,
        source_domain VARCHAR(255) NOT NULL,
        domain_authority INTEGER,
        page_authority INTEGER,
        spam_score INTEGER,
        opportunity_type VARCHAR(50), -- 'guest_post', 'broken_link', 'resource_page', 'directory'
        relevance_score INTEGER, -- 0-100
        difficulty_score INTEGER, -- 0-100
        contact_email VARCHAR(255),
        contact_method VARCHAR(50), -- 'email', 'contact_form', 'social'
        status VARCHAR(50) DEFAULT 'discovered', -- 'discovered', 'contacted', 'pending', 'secured', 'rejected'
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(website_id, source_domain)
      );

      CREATE INDEX IF NOT EXISTS idx_backlink_campaigns_website_id ON backlink_campaigns(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_website_id ON backlink_opportunities(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_campaign_id ON backlink_opportunities(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status ON backlink_opportunities(status);

      CREATE TABLE IF NOT EXISTS outreach_messages (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        opportunity_id INTEGER NOT NULL REFERENCES backlink_opportunities(id) ON DELETE CASCADE,
        message_type VARCHAR(50), -- 'initial', 'followup_1', 'followup_2'
        subject VARCHAR(255),
        body TEXT,
        sent_date TIMESTAMP,
        response_received BOOLEAN DEFAULT FALSE,
        response_date TIMESTAMP,
        response_text TEXT,
        status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'opened', 'replied'
        external_message_id VARCHAR(255), -- Resend message ID for tracking
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS acquired_backlinks (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        opportunity_id INTEGER REFERENCES backlink_opportunities(id) ON DELETE SET NULL,
        backlink_url VARCHAR(255) NOT NULL,
        anchor_text VARCHAR(255),
        referring_domain VARCHAR(255),
        domain_authority INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        verified_date TIMESTAMP,
        last_checked TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backlink_checks (
        id SERIAL PRIMARY KEY,
        acquired_backlink_id INTEGER NOT NULL REFERENCES acquired_backlinks(id) ON DELETE CASCADE,
        check_date TIMESTAMP DEFAULT NOW(),
        is_live BOOLEAN,
        status_code INTEGER,
        anchor_text VARCHAR(255),
        position_in_page INTEGER,
        error_message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_outreach_messages_website_id ON outreach_messages(website_id);
      CREATE INDEX IF NOT EXISTS idx_outreach_messages_opportunity_id ON outreach_messages(opportunity_id);
      CREATE INDEX IF NOT EXISTS idx_outreach_messages_status ON outreach_messages(status);
      CREATE INDEX IF NOT EXISTS idx_acquired_backlinks_website_id ON acquired_backlinks(website_id);
      CREATE INDEX IF NOT EXISTS idx_acquired_backlinks_opportunity_id ON acquired_backlinks(opportunity_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_backlink_id ON backlink_checks(acquired_backlink_id);

      CREATE TABLE IF NOT EXISTS usage_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_type VARCHAR(50) NOT NULL, -- 'audit', 'backlink_discovery', 'email_sent'
        usage_count INTEGER DEFAULT 1,
        month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, service_type, month_year)
      );

      CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_month ON usage_tracking(month_year);
    `);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
};

module.exports = {
  pool,
  initDatabase,
};
