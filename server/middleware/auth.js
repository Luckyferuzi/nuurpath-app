const jwt = require('jsonwebtoken');
const prisma = require('../db');

module.exports = async function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.user.id },
      select: { passwordChangedAt: true }
    });

    if (!user) {
      return res.status(401).json({ msg: 'User belonging to this token no longer exists' });
    }

    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (changedTimestamp > decoded.iat) {
        return res.status(401).json({ msg: 'User recently changed password! Please log in again.' });
      }
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};