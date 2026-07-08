const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  normalizeStatus,
  sendInvalidId,
  sendValidationError,
  toPositiveInteger,
} = require('../utils/validation');

const CONSULTATION_STATUSES = ['Pending', 'Contacted', 'Completed', 'Cancelled'];

// 1. Get ALL Private Consultations
// @route   GET /api/consultations
// @access  Private (Admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const consultations = await prisma.privateConsultation.findMany({
      orderBy: { createdAt: 'desc' }, // Newest first
      include: { user: true }         // Also fetch the user details (like email)
    });
    res.json(consultations);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// 2. Update Status (Pending -> Completed)
// @route   PUT /api/consultations/:id
// @access  Private (Admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  const { status } = req.body;
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    const normalizedStatus = normalizeStatus(status, CONSULTATION_STATUSES);
    if (!normalizedStatus) {
      return sendValidationError(res, 'Status must be Pending, Contacted, Completed, or Cancelled.');
    }

    const updated = await prisma.privateConsultation.update({
      where: { id },
      data: { status: normalizedStatus }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
