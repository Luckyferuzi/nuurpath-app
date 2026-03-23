const express = require('express');
const router = express.Router();

// @route   GET /api
// @desc    API Health Check
// @access  Public
router.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'NuurPath API is running', timestamp: new Date() });
});

module.exports = router;
