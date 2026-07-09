const { normalizeRole } = require('../utils/roles');

function requireRole(allowedRoles, options = {}) {
  const normalizedAllowedRoles = new Set(
    (Array.isArray(allowedRoles) ? allowedRoles : [])
      .map((role) => normalizeRole(role, ''))
      .filter(Boolean)
  );

  const forbiddenMessage = options.forbiddenMessage || 'You do not have permission to perform this action.';

  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        msg: 'Authentication required',
        message: 'Authentication required',
      });
    }

    const role = normalizeRole(req.user.role, '');

    if (!role || !normalizedAllowedRoles.has(role)) {
      return res.status(403).json({
        msg: forbiddenMessage,
        message: forbiddenMessage,
      });
    }

    req.user.role = role;

    return next();
  };
}

const requireAdmin = requireRole(['admin']);
const requireAdminOrManager = requireRole(['admin', 'manager']);

module.exports = requireAdminOrManager;
module.exports.adminAuth = requireAdminOrManager;
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAdminOrManager = requireAdminOrManager;
