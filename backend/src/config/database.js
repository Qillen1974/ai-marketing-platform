const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Only load .env in development, not in production (use Railway env vars)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config();
  }
}

// Use DATABASE_URL if available, otherwise build from environment variables
// In production, fallback to Neon credentials
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      user: process.env.DB_USER || (process.env.NODE_ENV === 'production' ? 'neondb_owner' : 'postgres'),
      password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? 'npg_1upJ2PGSImXz' : 'password'),
      host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'ep-bitter-fog-a1wm9p9c-pooler.ap-southeast-1.aws.neon.tech' : 'localhost'),
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'neondb',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

// Debug logging
console.log('🔧 Database Configuration:');
console.log(`   Using DATABASE_URL: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
if (!process.env.DATABASE_URL) {
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET (using localhost)'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET (using 5432)'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET (using postgres)'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET (using ai_marketing)'}`);
}

const pool = new Pool(poolConfig);

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
        role VARCHAR(50) DEFAULT 'user',
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

      -- Backlink feature removed - focusing on SEO + Keyword Tracking + Reddit

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

      CREATE TABLE IF NOT EXISTS reddit_communities (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        subreddit_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        description TEXT,
        subscribers INTEGER,
        active_users INTEGER,
        relevance_score INTEGER, -- 0-100 based on keyword match
        posting_allowed BOOLEAN DEFAULT TRUE,
        self_promotion_allowed BOOLEAN DEFAULT FALSE,
        requires_karma INTEGER DEFAULT 0,
        subreddit_age_days INTEGER,
        avg_posts_per_day DECIMAL,
        reddit_url VARCHAR(500),
        reddit_icon_url VARCHAR(500),
        community_type VARCHAR(50), -- 'general', 'niche', 'professional'
        difficulty_to_post VARCHAR(50), -- 'easy', 'medium', 'difficult'
        last_scanned TIMESTAMP DEFAULT NOW(),
        tracked BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(website_id, subreddit_name)
      );

      CREATE TABLE IF NOT EXISTS reddit_participations (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        reddit_community_id INTEGER NOT NULL REFERENCES reddit_communities(id) ON DELETE CASCADE,
        participation_type VARCHAR(50), -- 'comment', 'post', 'discussion', 'answer'
        post_title VARCHAR(500),
        post_url VARCHAR(500),
        post_content TEXT,
        reddit_post_id VARCHAR(255),
        upvotes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        posted_date TIMESTAMP,
        traffic_from_reddit INTEGER DEFAULT 0, -- Tracked clicks from Reddit
        status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'posted', 'archived', 'deleted'
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reddit_communities_website_id ON reddit_communities(website_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_communities_tracked ON reddit_communities(tracked);
      CREATE INDEX IF NOT EXISTS idx_reddit_participations_website_id ON reddit_participations(website_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_participations_community_id ON reddit_participations(reddit_community_id);

      CREATE TABLE IF NOT EXISTS keyword_rankings (
        id SERIAL PRIMARY KEY,
        keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        current_position INTEGER, -- NULL if not ranking in top 100
        previous_position INTEGER, -- NULL if first check
        serp_data JSONB, -- Full Serper API response for this keyword
        top_3_results JSONB, -- Top 3 ranking results for this keyword
        search_date TIMESTAMP DEFAULT NOW(),
        is_ranking BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(keyword_id, search_date)
      );

      CREATE TABLE IF NOT EXISTS ranking_history (
        id SERIAL PRIMARY KEY,
        keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        position INTEGER, -- Actual position on this date
        is_ranking BOOLEAN DEFAULT FALSE,
        check_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword_id ON keyword_rankings(keyword_id);
      CREATE INDEX IF NOT EXISTS idx_keyword_rankings_website_id ON keyword_rankings(website_id);
      CREATE INDEX IF NOT EXISTS idx_keyword_rankings_search_date ON keyword_rankings(search_date);
      CREATE INDEX IF NOT EXISTS idx_ranking_history_keyword_id ON ranking_history(keyword_id);
      CREATE INDEX IF NOT EXISTS idx_ranking_history_check_date ON ranking_history(check_date);

      CREATE TABLE IF NOT EXISTS reddit_threads (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        reddit_community_id INTEGER NOT NULL REFERENCES reddit_communities(id) ON DELETE CASCADE,
        thread_id VARCHAR(255) NOT NULL,
        thread_title VARCHAR(500) NOT NULL,
        thread_url VARCHAR(500),
        author VARCHAR(255),
        upvotes INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        posted_date TIMESTAMP,
        relevance_score INTEGER, -- 0-100 based on keyword match
        keyword_matches TEXT[], -- Array of matched keywords
        created_at TIMESTAMP DEFAULT NOW(),
        last_checked TIMESTAMP,
        UNIQUE(website_id, reddit_community_id, thread_id)
      );

      CREATE TABLE IF NOT EXISTS reddit_thread_engagements (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        reddit_thread_id INTEGER NOT NULL REFERENCES reddit_threads(id) ON DELETE CASCADE,
        engagement_type VARCHAR(50), -- 'comment', 'post', 'reply'
        ai_generated_message TEXT,
        user_custom_message TEXT,
        message_sent TEXT, -- Final message that was sent
        posted_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'reviewed', 'sent', 'deleted'
        upvotes INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        traffic_from_reddit INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reddit_threads_website_id ON reddit_threads(website_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_threads_community_id ON reddit_threads(reddit_community_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_threads_relevance ON reddit_threads(relevance_score);
      CREATE INDEX IF NOT EXISTS idx_reddit_thread_engagements_website_id ON reddit_thread_engagements(website_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_thread_engagements_thread_id ON reddit_thread_engagements(reddit_thread_id);
      CREATE INDEX IF NOT EXISTS idx_reddit_thread_engagements_status ON reddit_thread_engagements(status);

      -- SE Ranking API Integration - Competitor Analysis
      CREATE TABLE IF NOT EXISTS competitor_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        competitor_domain VARCHAR(255) NOT NULL,
        user_domain VARCHAR(255) NOT NULL,
        competitor_backlinks INTEGER,
        user_backlinks INTEGER,
        gap_opportunities INTEGER,
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_competitor_analyses_user_id ON competitor_analyses(user_id);
      CREATE INDEX IF NOT EXISTS idx_competitor_analyses_competitor_domain ON competitor_analyses(competitor_domain);

      -- Keyword Gap Analysis
      CREATE TABLE IF NOT EXISTS keyword_gap_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        competitor_domain VARCHAR(255) NOT NULL,
        user_domain VARCHAR(255) NOT NULL,
        common_keywords_count INTEGER,
        competitor_exclusive_count INTEGER,
        user_exclusive_count INTEGER,
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_keyword_gap_analyses_user_id ON keyword_gap_analyses(user_id);
      CREATE INDEX IF NOT EXISTS idx_keyword_gap_analyses_competitor_domain ON keyword_gap_analyses(competitor_domain);

      -- Site Health Monitoring (for automated audits)
      CREATE TABLE IF NOT EXISTS site_health_audits (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        audit_date TIMESTAMP DEFAULT NOW(),
        health_score INTEGER, -- 0-100
        critical_issues INTEGER,
        high_issues INTEGER,
        medium_issues INTEGER,
        low_issues INTEGER,
        total_issues INTEGER,
        previous_score INTEGER, -- For trend tracking
        issue_summary JSONB, -- Top issues grouped by category
        audit_data JSONB, -- Full audit report
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_site_health_audits_website_id ON site_health_audits(website_id);
      CREATE INDEX IF NOT EXISTS idx_site_health_audits_audit_date ON site_health_audits(audit_date);

      -- Quick Wins Analysis
      CREATE TABLE IF NOT EXISTS quick_wins_reports (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        audit_id INTEGER REFERENCES site_health_audits(id),
        quick_wins_data JSONB, -- Array of recommended quick wins with difficulty and impact scores
        total_potential_impact_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_quick_wins_reports_website_id ON quick_wins_reports(website_id);

      -- Backlinks Monitor - Track backlinks to user's domain
      -- Create backlink_checks first since backlinks table references it
      CREATE TABLE IF NOT EXISTS backlink_checks (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

        -- Check metadata
        check_date TIMESTAMP DEFAULT NOW(),
        check_status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'in_progress', 'completed', 'failed'

        -- Summary metrics
        total_backlinks INTEGER DEFAULT 0,
        total_referring_domains INTEGER DEFAULT 0,
        dofollow_count INTEGER DEFAULT 0,
        nofollow_count INTEGER DEFAULT 0,

        -- Changes since last check
        new_backlinks_count INTEGER DEFAULT 0,
        lost_backlinks_count INTEGER DEFAULT 0,

        -- Quality metrics
        average_domain_authority DECIMAL,
        top_referring_domains JSONB, -- Store top 10 referring domains
        anchor_text_distribution JSONB, -- Store anchor text analysis

        -- Full API response for debugging
        api_response_data JSONB,

        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backlinks (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        backlink_check_id INTEGER REFERENCES backlink_checks(id) ON DELETE CASCADE,

        -- Source information
        referring_url VARCHAR(500) NOT NULL,
        referring_domain VARCHAR(255) NOT NULL,

        -- Target information
        target_url VARCHAR(500) NOT NULL,
        target_page VARCHAR(500),

        -- Backlink attributes
        anchor_text TEXT,
        link_type VARCHAR(50), -- 'dofollow', 'nofollow', 'ugc', 'sponsored'
        is_dofollow BOOLEAN DEFAULT TRUE,

        -- SE Ranking metrics (if available)
        inlink_rank INTEGER,
        domain_authority INTEGER,
        page_authority INTEGER,

        -- Status tracking
        status VARCHAR(50) DEFAULT 'active', -- 'active', 'lost', 'broken'
        first_found_date TIMESTAMP DEFAULT NOW(),
        last_seen_date TIMESTAMP DEFAULT NOW(),

        -- Additional metadata
        backlink_data JSONB, -- Store full SE Ranking API response
        notes TEXT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(website_id, referring_url, target_url)
      );

      CREATE INDEX IF NOT EXISTS idx_backlinks_website_id ON backlinks(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlinks_check_id ON backlinks(backlink_check_id);
      CREATE INDEX IF NOT EXISTS idx_backlinks_referring_domain ON backlinks(referring_domain);
      CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status);
      CREATE INDEX IF NOT EXISTS idx_backlinks_last_seen ON backlinks(last_seen_date);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_website_id ON backlink_checks(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_date ON backlink_checks(check_date);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_status ON backlink_checks(check_status);

      -- Backlink discovery settings removed - feature discontinued
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
