const express = require('express');
const router = express.Router();
const prisma = require('../db');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrManager } = require('../middleware/adminAuth');
const { serviceInquiryLimiter } = require('../middleware/rateLimitMiddleware');
const softAuth = require('../middleware/softAuth');
const { notifyAdmins } = require('../utils/adminNotifier');
const {
    getPipelineStatusOptions,
    normalizeOperationalStatus,
    shouldSetLastContactedAt,
} = require('../utils/operationalPipeline');
const {
    isNonEmptyString,
    isValidEmail,
    parseOptionalDate,
    sendInvalidId,
    sendValidationError,
    toNonNegativeNumber,
    toPositiveInteger,
    toTrimmedString,
} = require('../utils/validation');
const {
    STAFF_USER_SUMMARY_SELECT,
    buildRequestWorkflowSignals,
    resolveAssignedStaffInput,
} = require('../utils/staffRequestIntelligence');

function normalizeFreeText(value) {
    return String(value || '').trim().toLowerCase();
}

function inferServiceRequestFocus(inquiry) {
    const combinedText = [
        inquiry.service?.title,
        inquiry.serviceType,
        inquiry.message,
    ].filter(Boolean).join(' ').toLowerCase();

    if (combinedText.includes('passport')) {
        return 'Passport support';
    }

    if (combinedText.includes('visa')) {
        return 'Visa support';
    }

    if (combinedText.includes('document')) {
        return 'Document support';
    }

    return inquiry.service?.title || inquiry.serviceType || 'Service support';
}

function inferDocumentReadiness(documentStatus) {
    const normalizedStatus = normalizeFreeText(documentStatus);

    if (!normalizedStatus) {
        return 'Document status not provided yet';
    }

    if (
        normalizedStatus.includes('complete') ||
        normalizedStatus.includes('ready') ||
        normalizedStatus.includes('available') ||
        normalizedStatus.includes('uploaded')
    ) {
        return 'Documents look ready for review';
    }

    if (
        normalizedStatus.includes('missing') ||
        normalizedStatus.includes('not ready') ||
        normalizedStatus.includes('renew') ||
        normalizedStatus.includes('expired')
    ) {
        return 'Documents are still missing or need work';
    }

    return 'Documents need manual review';
}

function inferServicePriority(urgency) {
    const normalizedUrgency = normalizeFreeText(urgency);

    if (
        normalizedUrgency.includes('urgent') ||
        normalizedUrgency.includes('asap') ||
        normalizedUrgency.includes('high') ||
        normalizedUrgency.includes('immediate') ||
        normalizedUrgency.includes('today')
    ) {
        return 'High';
    }

    if (
        normalizedUrgency.includes('soon') ||
        normalizedUrgency.includes('medium') ||
        normalizedUrgency.includes('this week')
    ) {
        return 'Medium';
    }

    return normalizedUrgency ? 'Normal' : 'Standard';
}

function buildServiceNextAction(inquiry) {
    const status = normalizeOperationalStatus(inquiry.status) || 'New';
    const documentStatus = normalizeFreeText(inquiry.documentStatus);
    const priority = inferServicePriority(inquiry.urgency);

    if (status === 'Cancelled' || status === 'Lost') {
        return 'No further action is needed unless the customer asks to restart the request.';
    }

    if (status === 'Completed') {
        return 'The request is complete. Any further contact should be for after-service support only.';
    }

    if (status === 'Confirmed Offline') {
        return 'Keep the customer informed about the final service delivery steps and handoff.';
    }

    if (status === 'Docs Requested') {
        return 'Wait for the requested documents and make it clear in internal notes what is still missing.';
    }

    if (status === 'Docs Received') {
        return 'Review the received documents and confirm whether the case is ready for the next processing step.';
    }

    if (status === 'Quoted') {
        return 'Confirm the quote with the customer and move the request into active follow-up if they are ready.';
    }

    if (status === 'Contacted' || status === 'WhatsApp Follow-up') {
        return 'Continue the conversation on WhatsApp and record the next promised action in internal notes.';
    }

    if (status === 'Qualified') {
        return documentStatus
            ? 'Verify the current document situation and prepare the remaining checklist or submission step.'
            : 'Confirm eligibility requirements and explain the document checklist clearly to the customer.';
    }

    if (priority === 'High') {
        return 'This request sounds urgent. Respond quickly, confirm the exact need, and move it into active follow-up.';
    }

    if (documentStatus.includes('missing') || documentStatus.includes('renew') || documentStatus.includes('expired')) {
        return 'Ask the customer for the missing or corrected documents before proceeding.';
    }

    return 'Review the request details, confirm what support is needed, and contact the customer with the next step.';
}

function serializeServiceInquiry(inquiry) {
    if (!inquiry || typeof inquiry !== 'object') {
        return inquiry;
    }

    const priorityLabel = inferServicePriority(inquiry.urgency);
    const documentReadiness = inferDocumentReadiness(inquiry.documentStatus);

    return {
        ...inquiry,
        ...buildRequestWorkflowSignals(inquiry, {
            waitingForDocuments: inferDocumentReadiness(inquiry.documentStatus).toLowerCase().includes('missing') ||
                inferDocumentReadiness(inquiry.documentStatus).toLowerCase().includes('need') ||
                inferDocumentReadiness(inquiry.documentStatus).toLowerCase().includes('expired') ||
                (normalizeOperationalStatus(inquiry.status) || 'New') === 'Docs Requested',
            priorityLabel,
        }),
        inquiryId: inquiry.id,
        serviceTitle: inquiry.service?.title || inquiry.serviceType,
        customerMessage: inquiry.message || null,
        requestFocus: inferServiceRequestFocus(inquiry),
        documentReadiness,
        priorityLabel,
        nextActionHint: buildServiceNextAction(inquiry),
        status: normalizeOperationalStatus(inquiry.status) || 'New',
    };
}

// @route   GET api/services
// @desc    Get all services
// @access  Public
router.get('/', async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/services/inquiries
// @desc    Create a service inquiry
// @access  Public/User
router.post('/inquiries', serviceInquiryLimiter, softAuth, async (req, res) => {
    try {
        const {
            serviceId,
            serviceType,
            contactName,
            contactEmail,
            contactPhone,
            country,
            preferredDate,
            applicants,
            urgency,
            documentStatus,
            message,
        } = req.body;

        const normalizedServiceId = serviceId === undefined || serviceId === null || serviceId === ''
            ? null
            : toPositiveInteger(serviceId);

        if (serviceId !== undefined && serviceId !== null && serviceId !== '' && normalizedServiceId === null) {
            return sendValidationError(res, 'Service id must be a positive integer.');
        }

        if (!isNonEmptyString(serviceType) && normalizedServiceId === null) {
            return sendValidationError(res, 'A service selection is required.');
        }

        if (!isNonEmptyString(contactName)) {
            return sendValidationError(res, 'Contact name is required.');
        }

        if (!isValidEmail(contactEmail)) {
            return sendValidationError(res, 'A valid contact email is required.');
        }

        if (!isNonEmptyString(contactPhone)) {
            return sendValidationError(res, 'Contact phone is required.');
        }

        const parsedPreferredDate = parseOptionalDate(preferredDate);
        if (preferredDate && parsedPreferredDate === null) {
            return sendValidationError(res, 'Preferred date must be a valid date.');
        }

        const applicantCount = applicants === undefined || applicants === null || applicants === ''
            ? null
            : toPositiveInteger(applicants);

        if (applicants !== undefined && applicants !== null && applicants !== '' && applicantCount === null) {
            return sendValidationError(res, 'Applicants must be a positive integer.');
        }

        let selectedService = null;
        if (normalizedServiceId !== null) {
            selectedService = await prisma.service.findUnique({
                where: { id: normalizedServiceId },
                select: { id: true, title: true },
            });

            if (!selectedService) {
                return res.status(404).json({ msg: 'Selected service does not exist.' });
            }
        }

        let userId = null;
        if (req.user && req.user.id) {
            userId = toPositiveInteger(req.user.id);
            if (userId === null) {
                return sendValidationError(res, 'Invalid user id.');
            }
        }

        const inquiry = await prisma.serviceInquiry.create({
            data: {
                userId,
                serviceId: normalizedServiceId,
                serviceType: selectedService?.title || toTrimmedString(serviceType),
                contactName: toTrimmedString(contactName),
                contactEmail: toTrimmedString(contactEmail),
                contactPhone: toTrimmedString(contactPhone),
                country: isNonEmptyString(country) ? toTrimmedString(country) : null,
                preferredDate: parsedPreferredDate,
                applicants: applicantCount,
                urgency: isNonEmptyString(urgency) ? toTrimmedString(urgency) : null,
                documentStatus: isNonEmptyString(documentStatus) ? toTrimmedString(documentStatus) : null,
                message: isNonEmptyString(message) ? toTrimmedString(message) : null,
                status: 'New',
                lastStatusChangedAt: new Date(),
            },
            include: {
                service: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        await notifyAdmins(req.app, {
            title: 'New Service Inquiry',
            message: `New service inquiry #${inquiry.id} received from ${inquiry.contactName} for ${inquiry.service?.title || inquiry.serviceType}`,
            type: 'NEW_SERVICE_INQUIRY',
            bookingId: inquiry.id,
        });

        return res.status(201).json(serializeServiceInquiry(inquiry));
    } catch (err) {
        console.error('Service inquiry error:', err);
        return res.status(500).json({ msg: 'Unable to submit your service request right now. Please try again.' });
    }
});

// @route   GET api/services/inquiries
// @desc    Get all service inquiries
// @access  Private (Admin/Manager)
router.get('/inquiries', auth, requireAdminOrManager, async (req, res) => {
    try {
        const inquiries = await prisma.serviceInquiry.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: true,
                service: true,
                assignedStaff: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
                lastUpdatedBy: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
            },
        });

        return res.json(inquiries.map(serializeServiceInquiry));
    } catch (err) {
        console.error('Error fetching service inquiries:', err.message);
        return res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/inquiries/:id
// @desc    Update service inquiry status or admin notes
// @access  Private (Admin/Manager)
router.put('/inquiries/:id', auth, requireAdminOrManager, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        const { status, adminNotes, assignedStaffId } = req.body;
        const actorId = toPositiveInteger(req.user.id);
        if (actorId === null) {
            return sendValidationError(res, 'Invalid staff user id.');
        }

        const existingInquiry = await prisma.serviceInquiry.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                assignedStaffId: true,
            },
        });

        if (!existingInquiry) {
            return res.status(404).json({ msg: 'Service inquiry not found' });
        }

        const updateData = {};

        if (status !== undefined) {
            const normalizedStatus = normalizeOperationalStatus(status);
            if (!normalizedStatus) {
                return sendValidationError(res, `Status must match the operational pipeline. Supported stages: ${getPipelineStatusOptions().join(', ')}.`);
            }

            updateData.status = normalizedStatus;
            if (normalizedStatus !== (normalizeOperationalStatus(existingInquiry.status) || 'New')) {
                updateData.lastStatusChangedAt = new Date();
            }
            if (shouldSetLastContactedAt(normalizedStatus)) {
                updateData.lastContactedAt = new Date();
            }
        }

        if (adminNotes !== undefined) {
            updateData.adminNotes = isNonEmptyString(adminNotes) ? toTrimmedString(adminNotes) : null;
        }

        if (assignedStaffId !== undefined) {
            const assignmentResolution = await resolveAssignedStaffInput(prisma, assignedStaffId, req.user);
            if (assignmentResolution.hasAssignmentChange) {
                updateData.assignedStaffId = assignmentResolution.assignedStaffId;
                if (assignmentResolution.assignedStaffId !== existingInquiry.assignedStaffId) {
                    updateData.assignedAt = assignmentResolution.assignedStaffId ? new Date() : null;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return sendValidationError(res, 'No valid inquiry fields were provided for update.');
        }

        updateData.lastUpdatedByUserId = actorId;

        const updatedInquiry = await prisma.serviceInquiry.update({
            where: { id },
            data: updateData,
            include: {
                user: true,
                service: true,
                assignedStaff: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
                lastUpdatedBy: {
                    select: STAFF_USER_SUMMARY_SELECT,
                },
            },
        });

        return res.json(serializeServiceInquiry(updatedInquiry));
    } catch (err) {
        console.error('Error updating service inquiry:', err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Service inquiry not found' });
        }

        return res.status(500).send('Server Error');
    }
});

// @route   POST api/services
// @desc    Create a new service
// @access  Private (Admin)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const { title, description, icon, price } = req.body;

        if (!isNonEmptyString(title) || !isNonEmptyString(description)) {
            return sendValidationError(res, 'Title and description are required.');
        }

        if (price !== undefined && price !== null && price !== '' && toNonNegativeNumber(price) === null) {
            return sendValidationError(res, 'Price must be a valid non-negative number.');
        }

        const newService = await prisma.service.create({
            data: {
                title: toTrimmedString(title),
                description: toTrimmedString(description),
                icon: typeof icon === 'string' ? icon.trim() : icon,
            }
        });

        res.json(newService);
    } catch (err) {
        console.error('Error creating service:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/reorder
// @desc    Reorder services
// @access  Private (Admin)
router.put('/reorder', auth, requireAdmin, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return sendValidationError(res, 'orderedIds must be a non-empty array of ids.');
        }

        const normalizedIds = orderedIds.map((id) => toPositiveInteger(id));
        if (normalizedIds.some((id) => id === null)) {
            return sendValidationError(res, 'orderedIds must contain only positive integer ids.');
        }

        const updates = normalizedIds.map((id, index) => 
            prisma.service.update({
                where: { id },
                data: { order: index }
            })
        );

        await prisma.$transaction(updates);
        res.json({ msg: 'Services reordered' });
    } catch (err) {
        console.error('Error reordering services:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/services/:id
// @desc    Update a service
// @access  Private (Admin)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { title, description, icon, price } = req.body;
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        if (title !== undefined && !isNonEmptyString(title)) {
            return sendValidationError(res, 'Title is required.');
        }

        if (description !== undefined && !isNonEmptyString(description)) {
            return sendValidationError(res, 'Description is required.');
        }

        if (price !== undefined && price !== null && price !== '' && toNonNegativeNumber(price) === null) {
            return sendValidationError(res, 'Price must be a valid non-negative number.');
        }

        const updateData = {};
        if (title !== undefined) {
            updateData.title = toTrimmedString(title);
        }

        if (description !== undefined) {
            updateData.description = toTrimmedString(description);
        }

        if (icon !== undefined) {
            updateData.icon = typeof icon === 'string' ? icon.trim() : icon;
        }

        const updatedService = await prisma.service.update({
            where: { id },
            data: updateData
        });

        res.json(updatedService);
    } catch (err) {
        console.error('Error updating service:', err.message);
        if (err.code === 'P2025') {
            return res.status(404).json({ msg: 'Service not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/services/:id
// @desc    Delete a service
// @access  Private (Admin)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const id = toPositiveInteger(req.params.id);
        if (id === null) {
            return sendInvalidId(res);
        }

        await prisma.service.delete({
            where: { id }
        });
        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error('Error deleting service:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
