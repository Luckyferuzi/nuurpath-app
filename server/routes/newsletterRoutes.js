const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);
router.get('/', auth, requireAdmin, newsletterController.getSubscribers);
router.get('/export', auth, requireAdmin, newsletterController.exportSubscribers);
router.put('/:id/status', auth, requireAdmin, newsletterController.updateSubscriberStatus);

module.exports = router;
