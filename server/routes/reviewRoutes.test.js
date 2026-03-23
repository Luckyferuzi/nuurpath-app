const request = require('supertest');
const express = require('express');
const reviewRoutes = require('../routes/reviewRoutes');

// Mock the controller functions to isolate route testing
jest.mock('../controllers/reviewController', () => ({
  createReview: jest.fn((req, res) => res.status(201).json({ message: 'Review created' })),
  getReviewsByPackageId: jest.fn((req, res) => res.status(200).json([])),
  getReviewsByUserId: jest.fn((req, res) => res.status(200).json([])),
  updateReview: jest.fn((req, res) => res.status(200).json({ message: 'Review updated' })),
  deleteReview: jest.fn((req, res) => res.status(200).json({ message: 'Review deleted' })),
}));

// Mock middlewares to simulate authentication
jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id: 'user123', role: 'USER' };
  next();
});

jest.mock('../middleware/adminAuthMiddleware', () => (req, res, next) => {
  next();
});

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);

describe('Review Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/reviews should be protected and call createReview', async () => {
    const res = await request(app).post('/api/reviews').send({
      packageId: 'pkg123',
      rating: 5,
      comment: 'Great trip!',
    });
    expect(res.statusCode).toBe(201);
    expect(require('../controllers/reviewController').createReview).toHaveBeenCalled();
  });

  test('GET /api/reviews/package/:packageId should be public and call getReviewsByPackageId', async () => {
    const res = await request(app).get('/api/reviews/package/pkg123');
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/reviewController').getReviewsByPackageId).toHaveBeenCalled();
  });

  test('GET /api/reviews/user/:userId should call getReviewsByUserId', async () => {
    const res = await request(app).get('/api/reviews/user/user123');
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/reviewController').getReviewsByUserId).toHaveBeenCalled();
  });

  test('PUT /api/reviews/:id should be protected and call updateReview', async () => {
    const res = await request(app).put('/api/reviews/rev123').send({ rating: 4 });
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/reviewController').updateReview).toHaveBeenCalled();
  });

  test('DELETE /api/reviews/:id should be protected and call deleteReview', async () => {
    const res = await request(app).delete('/api/reviews/rev123');
    expect(res.statusCode).toBe(200);
    expect(require('../controllers/reviewController').deleteReview).toHaveBeenCalled();
  });
});