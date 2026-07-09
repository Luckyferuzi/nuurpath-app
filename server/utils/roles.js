const USER_ROLE = 'user';
const MANAGER_ROLE = 'manager';
const ADMIN_ROLE = 'admin';

function normalizeRole(value, fallback = USER_ROLE) {
    const normalizedRole = String(value || '').trim().toLowerCase();
    return normalizedRole || fallback;
}

function hasRole(userOrRole, allowedRoles) {
    const roleValue = typeof userOrRole === 'object' && userOrRole !== null
        ? userOrRole.role
        : userOrRole;
    const normalizedRole = normalizeRole(roleValue, '');

    if (!normalizedRole) {
        return false;
    }

    return allowedRoles
        .map((allowedRole) => normalizeRole(allowedRole, ''))
        .includes(normalizedRole);
}

function isAdmin(userOrRole) {
    return hasRole(userOrRole, [ADMIN_ROLE]);
}

function isManager(userOrRole) {
    return hasRole(userOrRole, [MANAGER_ROLE]);
}

function isAdminOrManager(userOrRole) {
    return hasRole(userOrRole, [ADMIN_ROLE, MANAGER_ROLE]);
}

module.exports = {
    ADMIN_ROLE,
    MANAGER_ROLE,
    USER_ROLE,
    hasRole,
    isAdmin,
    isAdminOrManager,
    isManager,
    normalizeRole,
};
