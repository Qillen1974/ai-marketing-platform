const { pool } = require('../config/database');
const { checkLimit, trackUsage } = require('../services/usageService');

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log(`📊 Admin fetching users - Page: ${page}, Limit: ${limit}, Search: ${search}`);

    let query = `
      SELECT id, email, full_name, company_name, plan, role, created_at, updated_at
      FROM users
      WHERE role = 'user'
    `;
    let params = [];

    if (search) {
      query += ` AND (email ILIKE $1 OR full_name ILIKE $1 OR company_name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await pool.query(
      query.replace('SELECT id, email, full_name, company_name, plan, role, created_at, updated_at FROM users', 'SELECT COUNT(*) FROM users'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const users = result.rows.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      companyName: user.company_name,
      plan: user.plan,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details with usage stats
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📋 Admin fetching user details - User ID: ${userId}`);

    const userResult = await pool.query(
      'SELECT id, email, full_name, company_name, plan, role, created_at, updated_at FROM users WHERE id = $1 AND role = $2',
      [userId, 'user']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get usage stats
    const usageResult = await pool.query(
      `SELECT service_type, usage_count, month_year
       FROM usage_tracking
       WHERE user_id = $1
       ORDER BY month_year DESC`,
      [userId]
    );

    const usage = usageResult.rows.map((row) => ({
      serviceType: row.service_type,
      usageCount: row.usage_count,
      monthYear: row.month_year,
    }));

    // Get websites count
    const websitesResult = await pool.query('SELECT COUNT(*) FROM websites WHERE user_id = $1', [userId]);
    const websitesCount = parseInt(websitesResult.rows[0].count);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        companyName: user.company_name,
        plan: user.plan,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      usage,
      websitesCount,
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Change user plan
const changeUserPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPlan } = req.body;

    if (!newPlan) {
      return res.status(400).json({ error: 'New plan is required' });
    }

    const validPlans = ['free', 'starter', 'professional', 'enterprise'];
    if (!validPlans.includes(newPlan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT id, plan FROM users WHERE id = $1 AND role = $2', [userId, 'user']);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const oldPlan = user.plan;

    // Update plan
    const updateResult = await pool.query(
      'UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2 RETURNING id, plan',
      [newPlan, userId]
    );

    console.log(`✅ Admin changed user ${userId} plan from ${oldPlan} to ${newPlan}`);

    res.json({
      message: 'User plan updated successfully',
      user: {
        id: updateResult.rows[0].id,
        plan: updateResult.rows[0].plan,
        oldPlan,
      },
    });
  } catch (error) {
    console.error('Change user plan error:', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
};

// Reset user monthly usage
const resetUserUsage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { serviceType } = req.body;

    if (!serviceType) {
      return res.status(400).json({ error: 'Service type is required' });
    }

    const validServices = ['audit', 'backlink_discovery', 'email_sent'];
    if (!validServices.includes(serviceType)) {
      return res.status(400).json({ error: 'Invalid service type' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND role = $2', [userId, 'user']);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete current month's usage for this service
    const getCurrentMonth = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    const result = await pool.query(
      `DELETE FROM usage_tracking
       WHERE user_id = $1 AND service_type = $2 AND month_year = $3
       RETURNING usage_count`,
      [userId, serviceType, getCurrentMonth()]
    );

    const deletedUsage = result.rows.length > 0 ? result.rows[0].usage_count : 0;

    console.log(`✅ Admin reset ${serviceType} usage for user ${userId} (deleted ${deletedUsage} usage)`);

    res.json({
      message: `${serviceType} usage reset for current month`,
      deletedUsage,
    });
  } catch (error) {
    console.error('Reset user usage error:', error);
    res.status(500).json({ error: 'Failed to reset user usage' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists and is not an admin
    const userResult = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    // Delete user (cascades will handle websites, reports, etc.)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`✅ Admin deleted user ${userId} (${user.email})`);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  getAllUsers,
  getUserDetails,
  changeUserPlan,
  resetUserUsage,
  deleteUser,
};
