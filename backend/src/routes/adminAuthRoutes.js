const express = require('express');
const router = express.Router();
const { adminLogin, createAdmin } = require('../controllers/adminAuthController');

// Admin login - no auth required
router.post('/login', adminLogin);

// Create admin - requires admin secret
router.post('/create', createAdmin);

module.exports = router;
