require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorMiddleware');

const app = express();

// Connect Database
connectDB();

// Security Middleware - Use Helmet early in the stack
app.use(helmet());

// Middleware
app.use(express.json()); // Body parser for JSON data
app.use(cors()); // Enable CORS for frontend communication

// Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
// Add the new flight routes
app.use('/api/flights', require('./routes/flightRoutes')); // <--- ADD THIS LINE

// Basic route
app.get('/', (req, res) => {
    res.send('NuurPath Travels API is running!');
});

// Handler for routes not found (404)
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware - MUST be placed LAST
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
