/**
 * Migration: Add Article Generator Tables
 * Run this script to create the article generator tables
 *
 * Usage: node backend/src/migrations/add_article_generator_tables.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'neondb',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

const runMigration = async () => {
  console.log('🚀 Running Article Generator migration...\n');

  try {
    // Create article_campaigns table
    console.log('Creating article_campaigns table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS article_campaigns (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_url VARCHAR(500) NOT NULL,
        website_name VARCHAR(255),
        website_description TEXT,
        target_audience TEXT,
        auto_keywords TEXT[],
        custom_keywords TEXT[],
        generation_frequency VARCHAR(50) DEFAULT 'manual',
        is_active BOOLEAN DEFAULT true,
        last_article_date TIMESTAMP,
        total_articles_generated INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(website_id)
      );
    `);
    console.log('✅ article_campaigns table created');

    // Create generated_articles table
    console.log('Creating generated_articles table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS generated_articles (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES article_campaigns(id) ON DELETE CASCADE,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500),
        meta_description TEXT,
        html_content TEXT NOT NULL,
        target_keyword VARCHAR(255),
        secondary_keywords TEXT[],
        word_count INTEGER,
        generation_provider VARCHAR(50),
        tokens_used INTEGER,
        generation_time_ms INTEGER,
        images_generated INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'generated',
        published_url VARCHAR(500),
        hero_image_url TEXT,
        content_images JSONB,
        article_metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ generated_articles table created');

    // Create article_generation_usage table
    console.log('Creating article_generation_usage table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS article_generation_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month_year VARCHAR(7) NOT NULL,
        articles_generated INTEGER DEFAULT 0,
        tokens_used INTEGER DEFAULT 0,
        images_generated INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, month_year)
      );
    `);
    console.log('✅ article_generation_usage table created');

    // Create indexes
    console.log('Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_article_campaigns_website_id ON article_campaigns(website_id);
      CREATE INDEX IF NOT EXISTS idx_article_campaigns_user_id ON article_campaigns(user_id);
      CREATE INDEX IF NOT EXISTS idx_generated_articles_campaign_id ON generated_articles(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_generated_articles_website_id ON generated_articles(website_id);
      CREATE INDEX IF NOT EXISTS idx_generated_articles_user_id ON generated_articles(user_id);
      CREATE INDEX IF NOT EXISTS idx_generated_articles_status ON generated_articles(status);
      CREATE INDEX IF NOT EXISTS idx_generated_articles_created_at ON generated_articles(created_at);
      CREATE INDEX IF NOT EXISTS idx_article_generation_usage_user_id ON article_generation_usage(user_id);
    `);
    console.log('✅ Indexes created');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

runMigration();
