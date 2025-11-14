const { pool } = require('../config/database');
const {
  checkLimit,
  getUserUsageWithLimits,
  PLAN_LIMITS,
} = require('../services/usageService');

// Get user's current quota and usage
const getQuota = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user info to check plan
    const userResult = await pool.query(
      'SELECT id, plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const usageWithLimits = await getUserUsageWithLimits(userId, user.plan);

    res.json({
      plan: user.plan,
      usage: usageWithLimits,
      planLimits: PLAN_LIMITS[user.plan],
    });
  } catch (error) {
    console.error('Get quota error:', error);
    res.status(500).json({ error: 'Failed to fetch quota information' });
  }
};

// Check if user can perform an action
const checkQuota = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { serviceType } = req.body;

    if (!serviceType) {
      return res.status(400).json({ error: 'Service type is required' });
    }

    // Get user info to check plan
    const userResult = await pool.query(
      'SELECT id, plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const quotaStatus = await checkLimit(userId, serviceType, user.plan);

    res.json({
      canProceed: !quotaStatus.hasExceeded || quotaStatus.isUnlimited,
      quotaStatus,
    });
  } catch (error) {
    console.error('Check quota error:', error);
    res.status(500).json({ error: 'Failed to check quota' });
  }
};

module.exports = {
  getQuota,
  checkQuota,
};
