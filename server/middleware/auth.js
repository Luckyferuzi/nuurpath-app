const jwt = require('jsonwebtoken');
const prisma = require('../db');
const env = require('../config/env');

function getTokenFromRequest(req) {
  const headerToken = req.header('x-auth-token');

  if (headerToken && String(headerToken).trim()) {
    return String(headerToken).trim();
  }

  const authorizationHeader = req.header('Authorization');

  if (authorizationHeader && authorizationHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authorizationHeader.slice(7).trim();

    if (bearerToken) {
      return bearerToken;
    }
  }

  return null;
}

function normalizeUserId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);

  return Number.isNaN(numericValue) ? value : numericValue;
}

function normalizeAuthenticatedUser(decoded = {}) {
  const decodedUser = decoded && typeof decoded.user === 'object' ? decoded.user : {};
  const resolvedId = decodedUser.id ?? decoded.id ?? decoded.userId ?? decodedUser.userId;
  const normalizedId = normalizeUserId(resolvedId);

  return {
    id: normalizedId,
    userId: normalizedId,
    role: decodedUser.role ?? decoded.role,
    email: decodedUser.email ?? decoded.email,
  };
}

function createAuthError(message, statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getVerifiedUserFromToken(token) {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  const normalizedUser = normalizeAuthenticatedUser(decoded);

  if (normalizedUser.id === null || normalizedUser.id === undefined || normalizedUser.id === '') {
    throw createAuthError('Token is not valid');
  }

    const user = await prisma.user.findUnique({
        where: { id: normalizedUser.id },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            passwordChangedAt: true,
        },
  });

  if (!user) {
    throw createAuthError('User belonging to this token no longer exists');
  }

  if (user.passwordChangedAt && decoded.iat) {
    const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);

    if (changedTimestamp > decoded.iat) {
      throw createAuthError('User recently changed password! Please log in again.');
    }
  }

  return {
        id: user.id,
        userId: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: String(user.role || 'user').toLowerCase(),
    };
}

async function auth(req, res, next) {
  if (!env.JWT_SECRET) {
    return res.status(500).json({ msg: 'Server authentication is not configured' });
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ msg: 'Authentication required' });
  }

  try {
    req.user = await getVerifiedUserFromToken(token);

    return next();
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({ msg: 'Invalid or expired authentication token' });
    }

    return res.status(500).json({ msg: 'Server Error' });
  }
}

module.exports = auth;
module.exports.auth = auth;
module.exports.getVerifiedUserFromToken = getVerifiedUserFromToken;
module.exports.getTokenFromRequest = getTokenFromRequest;
module.exports.normalizeAuthenticatedUser = normalizeAuthenticatedUser;
