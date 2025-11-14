const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (userId, email, planOrRole, role = 'user') => {
  // Support both old and new signatures for backward compatibility
  // Old: generateToken(userId, email, plan)
  // New: generateToken(userId, email, plan, role)
  const actualRole = typeof planOrRole === 'string' && ['admin', 'user'].includes(planOrRole) && role === 'user' ? planOrRole : role;
  const actualPlan = typeof planOrRole === 'string' && !['admin', 'user'].includes(planOrRole) ? planOrRole : 'free';

  const token = jwt.sign(
    { userId, email, plan: actualPlan, role: actualRole },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: '30d' }
  );
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    return decoded;
  } catch (error) {
    return null;
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

const comparePassword = async (password, hashedPassword) => {
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
};
