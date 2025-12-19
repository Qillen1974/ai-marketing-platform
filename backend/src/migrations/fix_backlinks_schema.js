const { pool } = require('../config/database');

/**
 * Safe migration to fix backlinks tables schema
 * Adds missing columns without dropping existing data
 */
async function fixBacklinksSchema() {
  const client = await pool.connect();

  try {
    console.log('🔧 Starting backlinks schema fix migration...');

    // Check if backlink_checks table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'backlink_checks'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('📊 backlink_checks table does not exist, creating it...');
      await client.query(`
        CREATE TABLE backlink_checks (
          id SERIAL PRIMARY KEY,
          website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          check_date TIMESTAMP DEFAULT NOW(),
          check_status VARCHAR(50) DEFAULT 'completed',
          total_backlinks INTEGER DEFAULT 0,
          total_referring_domains INTEGER DEFAULT 0,
          dofollow_count INTEGER DEFAULT 0,
          nofollow_count INTEGER DEFAULT 0,
          new_backlinks_count INTEGER DEFAULT 0,
          lost_backlinks_count INTEGER DEFAULT 0,
          average_domain_authority DECIMAL,
          top_referring_domains JSONB,
          anchor_text_distribution JSONB,
          api_response_data JSONB,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ backlink_checks table created');
    } else {
      console.log('📊 backlink_checks table exists, checking columns...');

      // List of columns to ensure exist
      const columnsToAdd = [
        { name: 'website_id', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS website_id INTEGER REFERENCES websites(id) ON DELETE CASCADE' },
        { name: 'check_date', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS check_date TIMESTAMP DEFAULT NOW()' },
        { name: 'check_status', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS check_status VARCHAR(50) DEFAULT \'completed\'' },
        { name: 'total_backlinks', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS total_backlinks INTEGER DEFAULT 0' },
        { name: 'total_referring_domains', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS total_referring_domains INTEGER DEFAULT 0' },
        { name: 'dofollow_count', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS dofollow_count INTEGER DEFAULT 0' },
        { name: 'nofollow_count', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS nofollow_count INTEGER DEFAULT 0' },
        { name: 'new_backlinks_count', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS new_backlinks_count INTEGER DEFAULT 0' },
        { name: 'lost_backlinks_count', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS lost_backlinks_count INTEGER DEFAULT 0' },
        { name: 'average_domain_authority', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS average_domain_authority DECIMAL' },
        { name: 'top_referring_domains', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS top_referring_domains JSONB' },
        { name: 'anchor_text_distribution', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS anchor_text_distribution JSONB' },
        { name: 'api_response_data', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS api_response_data JSONB' },
        { name: 'error_message', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS error_message TEXT' },
        { name: 'created_at', sql: 'ALTER TABLE backlink_checks ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()' },
      ];

      for (const col of columnsToAdd) {
        try {
          await client.query(col.sql);
          console.log(`  ✅ Column ${col.name} ensured`);
        } catch (err) {
          console.log(`  ⚠️ Column ${col.name}: ${err.message}`);
        }
      }
    }

    // Check if backlinks table exists
    const backlinksTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'backlinks'
      );
    `);

    if (!backlinksTableCheck.rows[0].exists) {
      console.log('🔗 backlinks table does not exist, creating it...');
      await client.query(`
        CREATE TABLE backlinks (
          id SERIAL PRIMARY KEY,
          website_id INTEGER NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          backlink_check_id INTEGER REFERENCES backlink_checks(id) ON DELETE CASCADE,
          referring_url VARCHAR(500) NOT NULL,
          referring_domain VARCHAR(255) NOT NULL,
          target_url VARCHAR(500) NOT NULL,
          target_page VARCHAR(500),
          anchor_text TEXT,
          link_type VARCHAR(50),
          is_dofollow BOOLEAN DEFAULT TRUE,
          inlink_rank INTEGER,
          domain_authority INTEGER,
          page_authority INTEGER,
          status VARCHAR(50) DEFAULT 'active',
          first_found_date TIMESTAMP DEFAULT NOW(),
          last_seen_date TIMESTAMP DEFAULT NOW(),
          backlink_data JSONB,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(website_id, referring_url, target_url)
        );
      `);
      console.log('✅ backlinks table created');
    } else {
      console.log('🔗 backlinks table exists, checking columns...');

      const backlinksColumns = [
        { name: 'backlink_check_id', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS backlink_check_id INTEGER REFERENCES backlink_checks(id) ON DELETE CASCADE' },
        { name: 'referring_domain', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS referring_domain VARCHAR(255)' },
        { name: 'target_page', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS target_page VARCHAR(500)' },
        { name: 'link_type', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS link_type VARCHAR(50)' },
        { name: 'is_dofollow', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS is_dofollow BOOLEAN DEFAULT TRUE' },
        { name: 'inlink_rank', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS inlink_rank INTEGER' },
        { name: 'domain_authority', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS domain_authority INTEGER' },
        { name: 'page_authority', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS page_authority INTEGER' },
        { name: 'status', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'active\'' },
        { name: 'first_found_date', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS first_found_date TIMESTAMP DEFAULT NOW()' },
        { name: 'last_seen_date', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS last_seen_date TIMESTAMP DEFAULT NOW()' },
        { name: 'backlink_data', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS backlink_data JSONB' },
        { name: 'notes', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS notes TEXT' },
        { name: 'updated_at', sql: 'ALTER TABLE backlinks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()' },
      ];

      for (const col of backlinksColumns) {
        try {
          await client.query(col.sql);
          console.log(`  ✅ Column ${col.name} ensured`);
        } catch (err) {
          console.log(`  ⚠️ Column ${col.name}: ${err.message}`);
        }
      }
    }

    // Create indexes
    console.log('📑 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_backlinks_website_id ON backlinks(website_id)',
      'CREATE INDEX IF NOT EXISTS idx_backlinks_check_id ON backlinks(backlink_check_id)',
      'CREATE INDEX IF NOT EXISTS idx_backlinks_referring_domain ON backlinks(referring_domain)',
      'CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status)',
      'CREATE INDEX IF NOT EXISTS idx_backlinks_last_seen ON backlinks(last_seen_date)',
      'CREATE INDEX IF NOT EXISTS idx_backlink_checks_website_id ON backlink_checks(website_id)',
      'CREATE INDEX IF NOT EXISTS idx_backlink_checks_date ON backlink_checks(check_date)',
      'CREATE INDEX IF NOT EXISTS idx_backlink_checks_status ON backlink_checks(check_status)',
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (err) {
        console.log(`  ⚠️ Index: ${err.message}`);
      }
    }

    console.log('✅ Backlinks schema fix completed!');

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  fixBacklinksSchema()
    .then(() => {
      console.log('Schema fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBacklinksSchema };
