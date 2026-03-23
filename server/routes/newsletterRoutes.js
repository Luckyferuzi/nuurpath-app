const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const auth = require('../middleware/auth');

router.post('/subscribe', newsletterController.subscribe);
router.get('/', auth, newsletterController.getSubscribers);

module.exports = router;