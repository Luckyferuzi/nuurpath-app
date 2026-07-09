const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdminOrManager } = require('../middleware/adminAuth');
const {
  normalizeOperationalStatus,
  shouldSetLastContactedAt,
} = require('../utils/operationalPipeline');
const {
  sendInvalidId,
  sendValidationError,
  toPositiveInteger,
  isNonEmptyString,
  toTrimmedString,
} = require('../utils/validation');

function serializeConsultationForStaff(consultation) {
  if (!consultation || typeof consultation !== 'object') {
    return consultation;
  }

  return {
    ...consultation,
    requestId: consultation.id,
    status: normalizeOperationalStatus(consultation.status) || 'New',
  };
}

// @route   GET /api/consultations
// @access  Private (Admin/Manager)
router.get('/', auth, requireAdminOrManager, async (req, res) => {
  try {
    const consultations = await prisma.privateConsultation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    return res.json(consultations.map(serializeConsultationForStaff));
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server Error');
  }
});

// @route   PUT /api/consultations/:id
// @access  Private (Admin/Manager)
router.put('/:id', auth, requireAdminOrManager, async (req, res) => {
  try {
    const id = toPositiveInteger(req.params.id);
    if (id === null) {
      return sendInvalidId(res);
    }

    const { status, adminNotes } = req.body;
    const updateData = {};

    if (status !== undefined) {
      const normalizedStatus = normalizeOperationalStatus(status);
      if (!normalizedStatus) {
        return sendValidationError(res, 'Status must match the operational pipeline.');
      }

      updateData.status = normalizedStatus;
      if (shouldSetLastContactedAt(normalizedStatus)) {
        updateData.lastContactedAt = new Date();
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = isNonEmptyString(adminNotes) ? toTrimmedString(adminNotes) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return sendValidationError(res, 'No valid consultation fields were provided for update.');
    }

    const updated = await prisma.privateConsultation.update({
      where: { id },
      data: updateData,
      include: { user: true },
    });

    return res.json(serializeConsultationForStaff(updated));
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ msg: 'Consultation request not found' });
    }

    return res.status(500).send('Server Error');
  }
});

module.exports = router;
