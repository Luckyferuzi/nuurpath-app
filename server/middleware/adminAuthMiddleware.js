const prisma = require('../config/db');

module.exports = async function (req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ msg: 'Access denied, not an admin' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
