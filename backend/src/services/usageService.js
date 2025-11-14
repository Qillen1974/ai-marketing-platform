const { pool } = require('../config/database');

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    audits: 5,
    backlink_discovery: 10,
    email_sent: 5,
    websites: 1,
    team_members: 1,
  },
  starter: {
    audits: 50,
    backlink_discovery: 100,
    email_sent: 100,
    websites: 10,
    team_members: 1,
  },
  professional: {
    audits: 500,
    backlink_discovery: 500,
    email_sent: 500,
    websites: Infinity,
    team_members: 2,
  },
  enterprise: {
    audits: Infinity,
    backlink_discovery: Infinity,
    email_sent: Infinity,
    websites: Infinity,
    team_members: Infinity,
  },
};

// Get current month in YYYY-MM format
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Track usage of a service
const trackUsage = async (userId, serviceType, count = 1) => {
  try {
    const monthYear = getCurrentMonth();

    const result = await pool.query(
      `INSERT INTO usage_tracking (user_id, service_type, usage_count, month_year)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, service_type, month_year)
       DO UPDATE SET usage_count = usage_count + $3, updated_at = NOW()
       RETURNING usage_count`,
      [userId, serviceType, count, monthYear]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Track usage error:', error);
    throw error;
  }
};

// Get current usage for a user
const getCurrentUsage = async (userId, serviceType) => {
  try {
    const monthYear = getCurrentMonth();

    const result = await pool.query(
      `SELECT usage_count FROM usage_tracking
       WHERE user_id = $1 AND service_type = $2 AND month_year = $3`,
      [userId, serviceType, monthYear]
    );

    return result.rows[0]?.usage_count || 0;
  } catch (error) {
    console.error('Get current usage error:', error);
    return 0;
  }
};

// Check if user has exceeded limit
const checkLimit = async (userId, serviceType, userPlan = 'free') => {
  try {
    const currentUsage = await getCurrentUsage(userId, serviceType);

    // Ensure plan is valid, default to 'free' if not provided or invalid
    const safePlan = userPlan && PLAN_LIMITS[userPlan] ? userPlan : 'free';
    const limit = PLAN_LIMITS[safePlan]?.[serviceType] || 0;

    console.log(`📊 Quota Check - User ${userId}, Service: ${serviceType}, Plan: ${safePlan}, Usage: ${currentUsage}/${limit}`);

    return {
      currentUsage,
      limit,
      remaining: Math.max(0, limit - currentUsage),
      hasExceeded: currentUsage >= limit,
      isUnlimited: limit === Infinity,
    };
  } catch (error) {
    console.error('Check limit error:', error);
    return {
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      hasExceeded: false,
      isUnlimited: false,
    };
  }
};

// Get all usage stats for a user in current month
const getUserMonthlyUsage = async (userId) => {
  try {
    const monthYear = getCurrentMonth();

    const result = await pool.query(
      `SELECT service_type, usage_count FROM usage_tracking
       WHERE user_id = $1 AND month_year = $2`,
      [userId, monthYear]
    );

    const usage = {};
    result.rows.forEach((row) => {
      usage[row.service_type] = row.usage_count;
    });

    return {
      month: monthYear,
      audit: usage.audit || 0,
      backlink_discovery: usage.backlink_discovery || 0,
      email_sent: usage.email_sent || 0,
    };
  } catch (error) {
    console.error('Get user monthly usage error:', error);
    return {
      month: getCurrentMonth(),
      audit: 0,
      backlink_discovery: 0,
      email_sent: 0,
    };
  }
};

// Get usage stats with limits for user
const getUserUsageWithLimits = async (userId, userPlan = 'free') => {
  try {
    const monthlyUsage = await getUserMonthlyUsage(userId);
    const planLimits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;

    return {
      month: monthlyUsage.month,
      plan: userPlan,
      audits: {
        used: monthlyUsage.audit,
        limit: planLimits.audits,
        remaining: Math.max(0, planLimits.audits - monthlyUsage.audit),
        percentage: Math.round((monthlyUsage.audit / planLimits.audits) * 100),
        isUnlimited: planLimits.audits === Infinity,
      },
      backlink_discovery: {
        used: monthlyUsage.backlink_discovery,
        limit: planLimits.backlink_discovery,
        remaining: Math.max(0, planLimits.backlink_discovery - monthlyUsage.backlink_discovery),
        percentage: Math.round((monthlyUsage.backlink_discovery / planLimits.backlink_discovery) * 100),
        isUnlimited: planLimits.backlink_discovery === Infinity,
      },
      email_sent: {
        used: monthlyUsage.email_sent,
        limit: planLimits.email_sent,
        remaining: Math.max(0, planLimits.email_sent - monthlyUsage.email_sent),
        percentage: Math.round((monthlyUsage.email_sent / planLimits.email_sent) * 100),
        isUnlimited: planLimits.email_sent === Infinity,
      },
    };
  } catch (error) {
    console.error('Get user usage with limits error:', error);
    return null;
  }
};

// Reset usage for a user (admin function)
const resetMonthlyUsage = async (userId) => {
  try {
    const result = await pool.query(
      `DELETE FROM usage_tracking WHERE user_id = $1 AND month_year < $2 RETURNING id`,
      [userId, getCurrentMonth()]
    );

    return result.rows.length;
  } catch (error) {
    console.error('Reset monthly usage error:', error);
    throw error;
  }
};

module.exports = {
  trackUsage,
  getCurrentUsage,
  checkLimit,
  getUserMonthlyUsage,
  getUserUsageWithLimits,
  resetMonthlyUsage,
  PLAN_LIMITS,
  getCurrentMonth,
};
