require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorMiddleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

// Connect Database
connectDB();

// Security Middleware - Use Helmet early in the stack
app.use(helmet());

// Middleware
app.use(express.json()); // Body parser for JSON data
app.use(cors()); // Enable CORS for frontend communication

// Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/packages', require('./routes/packageRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
// Flight routes disabled until controllers are created
// app.use('/api/flights', require('./routes/flightRoutes'));

// Basic route
app.get('/', (req, res) => {
    res.send('NuurPath Travels API is running!');
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
}

// Handler for routes not found (404)
// app.all('*', (req, res, next) => {
//     next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// Global Error Handling Middleware - MUST be placed LAST
app.use(globalErrorHandler);

// Socket.IO Chat Setup
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // User joins with their userId
    socket.on('join', (userId) => {
        activeUsers.set(userId, socket.id);
        console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const { senderId, receiverId, message } = data;

        // Send to specific user if online
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('chatMessage', {
                senderId,
                message,
                timestamp: new Date().toISOString(),
            });
        }

        // Send confirmation back to sender
        socket.emit('messageSent', {
            receiverId,
            message,
            timestamp: new Date().toISOString(),
            delivered: !!receiverSocketId,
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Clean up active users
        for (const [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
