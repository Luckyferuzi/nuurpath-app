const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// @route GET api/packages
router.get('/', packageController.getAllPackages);

// @route GET api/packages/:id
router.get('/:id', packageController.getPackageById);

// @route POST api/packages
router.post('/', authMiddleware, adminAuthMiddleware, packageController.createPackage);

// @route PUT api/packages/:id
router.put('/:id', authMiddleware, adminAuthMiddleware, packageController.updatePackage);

// @route DELETE api/packages/:id
router.delete('/:id', authMiddleware, adminAuthMiddleware, packageController.deletePackage);

module.exports = router;
