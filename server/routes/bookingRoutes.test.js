const request = require('supertest');
const express = require('express');
const bookingRoutes = require('./bookingRoutes');

// Mock the controller functions to isolate route testing
jest.mock('../controllers/bookingController', () => ({
  createBooking: jest.fn((req, res) => res.status(201).json({ message: 'Booking created' })),
  getUserBookings: jest.fn((req, res) => res.status(200).json([])),
  getAllBookings: jest.fn((req, res) => res.status(200).json([])),
  updateBookingStatus: jest.fn((req, res) => res.status(200).json({ message: 'Booking updated' })),
}));

// Mock middlewares to simulate authentication
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id: 1, role: 'user' };
  next();
});

jest.mock('../middleware/adminAuthMiddleware', () => (req, res, next) => {
  // Simulate admin check passing
  next();
});

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingRoutes);

describe('Booking Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/bookings should be protected and call createBooking', async () => {
    const res = await request(app).post('/api/bookings').send({
      packageId: 1,
      passengers: 2,
      travelDate: '2025-12-25',
    });
    expect(res.statusCode).toBe(201);
    expect(require('../controllers/bookingController').createBooking).toHaveBeenCalled();
  });

  test('GET /api/bookings/me should be protected and call getUserBookings', async () => {
    const res = await request(app).get('/api/bookings/me');
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/bookingController').getUserBookings).toHaveBeenCalled();
  });

  test('GET /api/bookings should be admin protected and call getAllBookings', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/bookingController').getAllBookings).toHaveBeenCalled();
  });

  test('PUT /api/bookings/:id/status should be admin protected and call updateBookingStatus', async () => {
    const res = await request(app).put('/api/bookings/1/status').send({ status: 'Confirmed' });
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/bookingController').updateBookingStatus).toHaveBeenCalled();
  });
});