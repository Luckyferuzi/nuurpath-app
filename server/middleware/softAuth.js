const env = require('../config/env');
const auth = require('./auth');

async function softAuth(req, res, next) {
  const token = auth.getTokenFromRequest(req);

  if (!token || !env.JWT_SECRET) {
    return next();
  }

  try {
    req.user = await auth.getVerifiedUserFromToken(token);
  } catch (err) {
    // Optional auth should never block guest flows.
  }

  return next();
}

module.exports = softAuth;
module.exports.softAuth = softAuth;
