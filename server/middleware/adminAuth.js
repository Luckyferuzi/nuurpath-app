const prisma = require('../db');

module.exports = async function (req, res, next) {
    try {
        // req.user is set by the auth middleware
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
            return res.status(403).json({ msg: 'Access denied. Admin privileges required.' });
        }

        next();
    } catch (err) {
        console.error('Admin Auth Error:', err.message);
        res.status(500).send('Server Error');
    }
};