const { pool } = require('../config/database');
const { generateToken, hashPassword, comparePassword } = require('../utils/auth');

// Register a new user
const register = async (req, res) => {
  try {
    const { email, password, fullName, companyName } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, company_name, plan)
       VALUES ($1, $2, $3, $4, 'free')
       RETURNING id, email, full_name, plan`,
      [email.toLowerCase(), passwordHash, fullName, companyName || null]
    );

    const user = result.rows[0];

    // Initialize user settings with default provider
    try {
      await pool.query(
        `INSERT INTO user_settings (user_id, preferred_ai_provider, plan)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, 'openai', user.plan]
      );
      console.log(`✅ Initialized settings for new user ${user.id}`);
    } catch (settingsError) {
      console.error('Error initializing user settings:', settingsError);
      // Don't fail registration if settings init fails, we'll create it on-demand
    }

    const token = generateToken(user.id, user.email, user.plan);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, plan FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, user.plan);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, email, full_name, company_name, plan, api_quota_monthly, api_quota_used,
              subscription_end_date, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        companyName: user.company_name,
        plan: user.plan,
        apiQuotaMonthly: user.api_quota_monthly,
        apiQuotaUsed: user.api_quota_used,
        subscriptionEndDate: user.subscription_end_date,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, companyName } = req.body;

    const result = await pool.query(
      `UPDATE users SET full_name = $1, company_name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, company_name, plan`,
      [fullName || null, companyName || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        companyName: user.company_name,
        plan: user.plan,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
