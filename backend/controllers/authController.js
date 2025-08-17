const bcrypt = require('bcryptjs');​
const jwt = require('jsonwebtoken');​
const User = require('../models/User');​
​
// @routePOST api/auth/register​
// @descRegister user​
// @access Public​

exports.registerUser = async (req, res) => {​
    const { name, email, password, role } = req.body;​
​
    try {​
        let user = await User.findOne({ email });​
        if (user) {​
            return res.status(400).json({ msg: 'User already
exists' });​​

        }​
        user = new User({​
            name,​
            email,​
            password,​
            role: role || 'user', // Allow admin to register
admin, or default to user​
        });​
​
        const salt = await bcrypt.genSalt(10);​
        user.password = await bcrypt.hash(password, salt);​
​
        await user.save();​
​
        const payload = {​
            user: {​
                id: user.id,​
                role: user.role,​
            },​
        };​
​
        jwt.sign(​
            payload,​
            process.env.JWT_SECRET,​
            { expiresIn: '1h' },​
            (err, token) => {​
                if (err) throw err;​
                res.json({ token });​
            }​
        );​
    } catch (err) {​
        console.error(err.message);​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route POST api/auth/login​
// @desc Authenticate user & get token​
// @access Public​
exports.loginUser = async (req, res) => {​
    const { email, password } = req.body;​
​
    try {​
        let user = await User.findOne({ email });​
        if (!user) {​
            return res.status(400).json({ msg: 'Invalid
Credentials' });​​

    }​
    const isMatch = await bcrypt.compare(password,
user.password);​
        if (!isMatch) {​
            return res.status(400).json({ msg: 'Invalid
Credentials' });​
        }​
​
        const payload = {​
            user: {​
                id: user.id,​
                role: user.role,​
            },​
        };​
​
        jwt.sign(​
            payload,​
            process.env.JWT_SECRET,​
            { expiresIn: '1h' },​
            (err, token) => {​
                if (err) throw err;​
                res.json({ token });​
            }​
        );​
    } catch (err) {​
        console.error(err.message);​
        res.status(500).send('Server Error');​
    }​
};​
​
// @route GET api/auth/me​
// @desc Get current user (for profile)​
// @access Private​
exports.getMe = async (req, res) => {​
    try {​
        const user = await
User.findById(req.user.id).select('-password');​
        res.json(user);​
    } catch (err) {​
        console.error(err.message);​
        res.status(500).send('Server Error');​
    }​
};
