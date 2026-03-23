const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/unsubscribe/:token', userController.unsubscribe);
router.get('/resubscribe/:token', userController.resubscribe);

module.exports = router;