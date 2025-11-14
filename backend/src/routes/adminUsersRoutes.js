const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getAllUsers,
  getUserDetails,
  changeUserPlan,
  resetUserUsage,
  deleteUser,
} = require('../controllers/adminUsersController');

// Admin middleware - verify admin role
const adminMiddleware = async (req, res, next) => {
  try {
    // authMiddleware already verified the token, now check role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// All admin routes require auth and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/plan', changeUserPlan);
router.post('/users/:userId/reset-usage', resetUserUsage);
router.delete('/users/:userId', deleteUser);

module.exports = router;
