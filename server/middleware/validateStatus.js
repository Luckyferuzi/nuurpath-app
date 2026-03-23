const { check, validationResult } = require('express-validator');

const validateStatus = [
    check('status', 'Status is required').not().isEmpty(),
    check('status', 'Status must be Pending, Confirmed, or Cancelled').isIn(['Pending', 'Confirmed', 'Cancelled']),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = validateStatus;