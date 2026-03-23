const prisma = require('../db');
const { validationResult } = require('express-validator');

exports.createAppointment = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { serviceType, appointmentDate, notes } = req.body;

    try {
        const appointment = await prisma.appointment.create({
            data: {
                userId: req.user.id,
                serviceType,
                appointmentDate: new Date(appointmentDate),
                notes,
                status: 'Pending'
            }
        });

        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            where: { userId: req.user.id },
            orderBy: { appointmentDate: 'asc' }
        });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { appointmentDate: 'asc' }
        });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const appointment = await prisma.appointment.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });
        res.json(appointment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Check user authorization (owner or admin)
        if (appointment.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Update status to Cancelled instead of deleting to keep records
        await prisma.appointment.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'Cancelled' }
        });

        res.json({ msg: 'Appointment cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};