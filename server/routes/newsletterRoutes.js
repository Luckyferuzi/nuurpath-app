const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);
router.get('/', auth, requireAdmin, newsletterController.getSubscribers);
router.get('/export', auth, requireAdmin, newsletterController.exportSubscribers);
router.get('/preview-recipients', auth, requireAdmin, newsletterController.getPreviewRecipients);
router.get('/campaigns', auth, requireAdmin, newsletterController.getCampaignDrafts);
router.post('/campaigns', auth, requireAdmin, newsletterController.createCampaignDraft);
router.post('/campaigns/preview', auth, requireAdmin, newsletterController.previewCampaign);
router.put('/campaigns/:id', auth, requireAdmin, newsletterController.updateCampaignDraft);
router.delete('/campaigns/:id', auth, requireAdmin, newsletterController.deleteCampaignDraft);
router.put('/:id/status', auth, requireAdmin, newsletterController.updateSubscriberStatus);

module.exports = router;
