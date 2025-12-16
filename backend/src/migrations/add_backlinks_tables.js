const { pool } = require('../config/database');

/**
 * Migration to add backlinks monitor tables
 * This handles both creating new tables and updating existing ones
 */
async function migrateBacklinksTables() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔄 Starting backlinks tables migration...');

    // Drop old backlink tables if they exist (from previous feature versions)
    console.log('🗑️  Dropping old backlink tables if they exist...');
    await client.query('DROP TABLE IF EXISTS backlinks CASCADE');
    await client.query('DROP TABLE IF EXISTS backlink_checks CASCADE');

    // Create backlink_checks table first (since backlinks references it)
    console.log('📊 Creating backlink_checks table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS backlink_checks (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,

        -- Check metadata
        check_date TIMESTAMP DEFAULT NOW(),
        check_status VARCHAR(50) DEFAULT 'completed',

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
        top_referring_domains JSONB,
        anchor_text_distribution JSONB,

        -- Full API response for debugging
        api_response_data JSONB,

        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create backlinks table
    console.log('🔗 Creating backlinks table...');
    await client.query(`
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
        link_type VARCHAR(50),
        is_dofollow BOOLEAN DEFAULT TRUE,

        -- SE Ranking metrics
        inlink_rank INTEGER,
        domain_authority INTEGER,
        page_authority INTEGER,

        -- Status tracking
        status VARCHAR(50) DEFAULT 'active',
        first_found_date TIMESTAMP DEFAULT NOW(),
        last_seen_date TIMESTAMP DEFAULT NOW(),

        -- Additional metadata
        backlink_data JSONB,
        notes TEXT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(website_id, referring_url, target_url)
      );
    `);

    // Create indexes
    console.log('📑 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backlinks_website_id ON backlinks(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlinks_check_id ON backlinks(backlink_check_id);
      CREATE INDEX IF NOT EXISTS idx_backlinks_referring_domain ON backlinks(referring_domain);
      CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status);
      CREATE INDEX IF NOT EXISTS idx_backlinks_last_seen ON backlinks(last_seen_date);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_website_id ON backlink_checks(website_id);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_date ON backlink_checks(check_date);
      CREATE INDEX IF NOT EXISTS idx_backlink_checks_status ON backlink_checks(check_status);
    `);

    await client.query('COMMIT');
    console.log('✅ Backlinks tables migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateBacklinksTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateBacklinksTables };
