const { verifyToken } = require('../utils/auth');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const checkPlanAccess = (allowedPlans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({ error: 'Plan access denied' });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  checkPlanAccess,
};
