const { pool } = require('../config/database');
const crypto = require('crypto');

// Encryption helper functions
const encryptApiKey = (apiKey) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decryptApiKey = (encryptedData) => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production', 'salt', 32);
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Get user's API keys
const getApiKeys = async (req, res) => {
  try {
    const userId = req.user.userId;

    // First, ensure user_api_keys table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        encrypted_key TEXT NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        last_verified TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, provider)
      );
    `);

    // Also ensure user_settings table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        preferred_ai_provider VARCHAR(50) DEFAULT 'openai',
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const result = await pool.query(
      `SELECT id, provider, is_verified, updated_at as last_updated
       FROM user_api_keys
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    const apiKeys = result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      isConfigured: true,
      lastUpdated: row.last_updated,
    }));

    // Get preferred AI provider
    const settingsResult = await pool.query(
      `SELECT preferred_ai_provider FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    const preferredAiProvider = settingsResult.rows[0]?.preferred_ai_provider || 'openai';

    res.json({
      apiKeys,
      preferredAiProvider,
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
};

// Save API key
const saveApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { provider, apiKey } = req.body;

    // Validation
    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const validProviders = ['openai', 'claude', 'gemini'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Verify API key format (basic check)
    if (apiKey.length < 10) {
      return res.status(400).json({ error: 'API key appears to be invalid' });
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey);

    // Save or update in database
    const result = await pool.query(
      `INSERT INTO user_api_keys (user_id, provider, encrypted_key, is_verified, last_verified)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_key = $3, is_verified = true, last_verified = NOW(), updated_at = NOW()
       RETURNING id, provider, is_verified, updated_at`,
      [userId, provider, encryptedKey]
    );

    res.json({
      message: 'API key saved successfully',
      apiKey: {
        id: result.rows[0].id,
        provider: result.rows[0].provider,
        isVerified: result.rows[0].is_verified,
      },
    });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
};

// Delete API key
const deleteApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { provider } = req.params;

    // Validation
    const validProviders = ['openai', 'claude', 'gemini'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const result = await pool.query(
      `DELETE FROM user_api_keys WHERE user_id = $1 AND provider = $2 RETURNING id`,
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
};

// Set preferred AI provider
const setPreferredAiProvider = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { provider } = req.body;

    // Validation
    const validProviders = ['openai', 'claude', 'gemini'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Check if user has this provider configured
    const checkResult = await pool.query(
      `SELECT id FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (checkResult.rows.length === 0) {
      return res.status(400).json({ error: 'This provider is not configured' });
    }

    // Update or insert settings
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, preferred_ai_provider)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET preferred_ai_provider = $2, updated_at = NOW()
       RETURNING preferred_ai_provider`,
      [userId, provider]
    );

    res.json({
      message: 'Preferred AI provider updated',
      preferredAiProvider: result.rows[0].preferred_ai_provider,
    });
  } catch (error) {
    console.error('Set preferred provider error:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
};

// Get preferred AI provider
const getPreferredAiProvider = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT preferred_ai_provider FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    const provider = result.rows[0]?.preferred_ai_provider || 'openai';

    res.json({ preferredAiProvider: provider });
  } catch (error) {
    console.error('Get preferred provider error:', error);
    res.status(500).json({ error: 'Failed to fetch preference' });
  }
};

// Get decrypted API key for internal use
const getDecryptedApiKey = async (userId, provider) => {
  try {
    const result = await pool.query(
      `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return decryptApiKey(result.rows[0].encrypted_key);
  } catch (error) {
    console.error('Get decrypted API key error:', error);
    return null;
  }
};

module.exports = {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  setPreferredAiProvider,
  getPreferredAiProvider,
  getDecryptedApiKey,
  encryptApiKey,
  decryptApiKey,
};
