const { pool } = require('../config/database');
const { generateToken, hashPassword, comparePassword } = require('../utils/auth');

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1 AND role = $2',
      [email.toLowerCase(), 'admin']
    );

    if (result.rows.length === 0) {
      console.warn(`⚠️  Admin login attempt with non-admin or non-existent account: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      console.warn(`⚠️  Failed admin login attempt: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, 'admin');

    console.log(`✅ Admin login successful: ${email} (ID: ${user.id})`);

    res.json({
      message: 'Admin login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Create admin account (should only be callable with special secret or by existing admin)
const createAdmin = async (req, res) => {
  try {
    const { email, password, fullName, adminSecret } = req.body;

    // Verify admin secret - this is a backdoor to create the first admin
    const validSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
    if (adminSecret !== validSecret) {
      console.warn(`⚠️  Failed admin creation attempt with invalid secret`);
      return res.status(401).json({ error: 'Invalid admin secret' });
    }

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, plan)
       VALUES ($1, $2, $3, 'admin', 'enterprise')
       RETURNING id, email, full_name, role`,
      [email.toLowerCase(), passwordHash, fullName]
    );

    const user = result.rows[0];
    console.log(`✅ Admin account created: ${email} (ID: ${user.id})`);

    res.status(201).json({
      message: 'Admin account created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
};

module.exports = {
  adminLogin,
  createAdmin,
};
