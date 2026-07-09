const { isAdminOrManager } = require('./roles');

function getNotificationRoomForUser(userId) {
    return `user:${userId}`;
}

function getSupportRoomForUser(userId) {
    return `support:user:${userId}`;
}

function getStaffChatRoom() {
    return 'support:staff';
}

function buildChatPresence(user) {
    if (!user || !user.id) {
        return null;
    }

    return {
        userId: user.id,
        email: user.email,
        name: user.name || user.email || 'Customer',
        role: user.role,
        roomKey: getSupportRoomForUser(user.id),
    };
}

function canManageSupportChats(user) {
    return isAdminOrManager(user);
}

module.exports = {
    buildChatPresence,
    canManageSupportChats,
    getNotificationRoomForUser,
    getStaffChatRoom,
    getSupportRoomForUser,
};
