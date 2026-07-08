const allowedRoles = new Set(['admin', 'manager']);

function adminAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      msg: 'Authentication required',
      message: 'Authentication required',
    });
  }

  const role = String(req.user.role || '').toLowerCase();

  if (!allowedRoles.has(role)) {
    return res.status(403).json({
      msg: 'Admin access required',
      message: 'Admin access required',
    });
  }

  req.user.role = role;

  return next();
}

module.exports = adminAuth;
module.exports.adminAuth = adminAuth;
