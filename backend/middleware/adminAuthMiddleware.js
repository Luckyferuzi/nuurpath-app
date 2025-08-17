const auth = require('./authMiddleware');​
const User = require('../models/User');​
​
module.exports = async function (req, res, next) {​
    auth(req, res, async () => { // First authenticate the
user​
    try {​
        const user = await User.findById(req.user.id);​
        if (user && user.role === 'admin') {​
            next();​
        } else {​
            res.status(403).json({ msg: 'Access denied,
not an admin' });​
            }​
        } catch (err) {​
           console.error(err.message);​
           res.status(500).send('Server Error');​
        }​
    });​
};​
