const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const prisma = require('./db');
const { Server } = require('socket.io');
const asyncHandler = require('./middleware/asyncHandler');
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const logger = require('./utils/logger');
const {
    bookingDocumentUpload,
    chatUpload,
    packageImageUpload,
    publicUploadRoot,
    runUpload,
    sendUploadError,
    toProtectedBookingDocumentUrl,
    toPublicUploadUrl,
} = require('./utils/upload');

const app = express();
const allowedOriginSet = new Set(env.ALLOWED_ORIGINS);
const apiBaseUrl = env.API_BASE_URL.replace(/\/+$/, '');
const apiSocketUrl = apiBaseUrl.startsWith('https://')
    ? `wss://${apiBaseUrl.slice('https://'.length)}`
    : apiBaseUrl.startsWith('http://')
        ? `ws://${apiBaseUrl.slice('http://'.length)}`
        : apiBaseUrl;

function normalizeOrigin(origin) {
    return String(origin || '').trim().replace(/\/+$/, '');
}

function getRequestLogLevel(statusCode) {
    if (statusCode >= 500) {
        return 'error';
    }

    if (statusCode >= 400) {
        return 'warn';
    }

    return 'info';
}

function handleFatalError(type, error) {
    logger.error(type, { error });
    process.exit(1);
}

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOriginSet.has(normalizedOrigin)) {
            return callback(null, true);
        }

        const error = new Error(`Origin not allowed by CORS: ${normalizedOrigin}`);
        error.statusCode = 403;
        error.code = 'CORS_ORIGIN_NOT_ALLOWED';
        error.isOperational = true;

        return callback(error);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'X-Requested-With'],
};

app.use(requestId);
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google.com', 'https://www.gstatic.com'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
            connectSrc: ["'self'", apiBaseUrl, apiSocketUrl, 'https://api.openweathermap.org', 'https://maps.googleapis.com', 'https://geocoding-api.open-meteo.com', 'https://api.open-meteo.com'],
        },
    },
}));
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        if (req.path === '/health' && res.statusCode < 400) {
            return;
        }

        const logLevel = getRequestLogLevel(res.statusCode);
        logger[logLevel]('request_completed', {
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            userId: req.user?.id,
        });
    });

    next();
});
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(publicUploadRoot));

const PORT = env.PORT;

process.on('uncaughtException', (error) => {
    handleFatalError('uncaught_exception', error);
});

process.on('unhandledRejection', (error) => {
    handleFatalError('unhandled_rejection', error);
});

async function startServer() {
    const dbUrl = env.DATABASE_URL || '';
    logger.info('database_connecting', {
        databaseUrlConfigured: Boolean(dbUrl),
        databaseUrlLength: dbUrl.length,
    });

    try {
        const url = new URL(dbUrl);
        logger.info('database_connection_target', {
            databaseUser: url.username || undefined,
        });
    } catch (error) {
        logger.warn('database_url_parse_failed', {
            reason: error.message,
        });
    }

    try {
        await prisma.$connect();
        logger.info('database_connected');
    } catch (error) {
        logger.error('database_connection_failed', {
            code: error.code,
            message: error.message,
            tip: 'Ensure your DATABASE_URL in .env includes "?schema=public"',
        });
        process.exit(1);
    }

    app.get('/health', asyncHandler(async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.status(200).json({ status: 'UP', database: 'connected', timestamp: new Date() });
        } catch (error) {
            logger.warn('health_check_failed', { error });

            const responseBody = {
                status: 'DOWN',
                database: 'disconnected',
                timestamp: new Date(),
            };

            if (!env.isProduction) {
                responseBody.error = error.message;
            }

            res.status(503).json(responseBody);
        }
    }));

    app.get('/', (req, res) => {
        res.json({
            service: 'NuurPath API',
            status: 'running',
            domain: 'https://api.nuurpath.com'
        });
    });

    app.use('/api', require('./routes/mainRoutes'));
    app.use('/api/package-bookings', require('./routes/packageBookingAdminRoutes'));
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/services', require('./routes/serviceRoutes'));
    app.use('/api/content', require('./routes/content'));
    app.use('/api/profile', require('./routes/profileRoutes'));
    app.use('/api/packages', require('./routes/packageRoutes'));
    app.use('/api/bookings', require('./routes/bookingRoutes'));
    app.use('/api/flights', require('./routes/flightRoutes'));
    app.use('/api/reviews', require('./routes/reviewRoutes'));
    app.use('/api/appointments', require('./routes/appointmentRoutes'));
    app.use('/api/consultations', require('./routes/consultationRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));
    app.use('/api/notifications', require('./routes/notificationRoutes'));
    app.use('/api/newsletter', require('./routes/newsletterRoutes'));
    app.use('/api/contact', require('./routes/contactRoutes'));
    app.use('/api/itinerary', require('./routes/itineraryRoutes'));
    app.use('/api/wishlist', require('./routes/wishlistRoutes'));

    app.post('/api/chat/upload', auth, asyncHandler(async (req, res) => {
        try {
            await runUpload(chatUpload.single('file'), req, res);
        } catch (error) {
            return sendUploadError(res, error, 'File too large. Maximum size allowed is 10 MB.');
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.', msg: 'No file uploaded.' });
        }

        const fileUrl = toPublicUploadUrl('chat', req.file.filename);

        return res.json({
            success: true,
            url: fileUrl,
            file: {
                filename: req.file.filename,
                url: fileUrl,
                type: req.file.mimetype,
            },
        });
    }));

    app.post('/api/packages/upload-image', auth, adminAuth, asyncHandler(async (req, res) => {
        try {
            await runUpload(packageImageUpload.single('image'), req, res);
        } catch (error) {
            return sendUploadError(res, error, 'File too large. Maximum size allowed is 5 MB.');
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.', msg: 'No file uploaded.' });
        }

        const fileUrl = toPublicUploadUrl('packages', req.file.filename);

        return res.json({
            success: true,
            url: fileUrl,
            file: {
                filename: req.file.filename,
                url: fileUrl,
            },
        });
    }));

    app.post('/api/bookings/upload', auth, asyncHandler(async (req, res) => {
        try {
            await runUpload(bookingDocumentUpload.single('passport'), req, res);
        } catch (error) {
            return sendUploadError(res, error, 'File too large. Maximum size allowed is 10 MB.');
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.', msg: 'No file uploaded.' });
        }

        const protectedUrl = toProtectedBookingDocumentUrl(req.file.filename);

        return res.json({
            success: true,
            url: protectedUrl,
            file: {
                filename: req.file.filename,
                url: protectedUrl,
                type: req.file.mimetype,
            },
        });
    }));

    app.use(errorHandler);

    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info('server_started', {
            port: PORT,
            localUrl: `http://localhost:${PORT}`,
            apiHealthUrl: `http://localhost:${PORT}/api`,
            systemStatusUrl: `http://localhost:${PORT}/health`,
        });
    });

    const onlineUsers = new Map();

    const io = new Server(server, {
        cors: {
            origin: env.ALLOWED_ORIGINS,
            methods: ['GET', 'POST'],
        },
    });

    app.set('io', io);

    io.on('connection', (socket) => {
        logger.info('socket_connected', {
            socketId: socket.id,
        });

        socket.on('register_user', (userData) => {
            const user = { ...userData, socketId: socket.id };
            onlineUsers.set(socket.id, user);

            if (userData.email) {
                socket.join(userData.email);
            }

            io.emit('active_users', Array.from(onlineUsers.values()));
        });

        socket.on('join_room', async (room) => {
            socket.join(room);
            try {
                const messages = await prisma.chatMessage.findMany({
                    where: { room },
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                });
                socket.emit('load_messages', messages);

                if (messages.length === 0) {
                    const welcomeMsg = {
                        room,
                        author: 'Support Bot',
                        email: 'bot@nuurpath.com',
                        message: 'Welcome to NuurPath Travels! How can we assist you today?',
                        time: new Date().toISOString(),
                    };

                    await prisma.chatMessage.create({
                        data: { ...welcomeMsg },
                    });

                    io.to(room).emit('receive_message', welcomeMsg);
                }
            } catch (error) {
                logger.error('chat_history_load_failed', {
                    room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('typing', (data) => {
            socket.to(data.room).emit('display_typing', data);
        });

        socket.on('stop_typing', (data) => {
            socket.to(data.room).emit('hide_typing', data);
        });

        socket.on('send_message', async (data) => {
            socket.to(data.room).emit('receive_message', data);

            try {
                const messageContent = data.message || (data.file ? `Sent a file: ${data.file.name}` : '');

                await prisma.chatMessage.create({
                    data: {
                        room: data.room,
                        author: data.author,
                        email: data.email,
                        message: messageContent,
                        time: data.time,
                    },
                });

                if (data.email === data.room && data.author !== 'Support Bot') {
                    const lowerMsg = (messageContent || '').toLowerCase();
                    let botResponseText = null;

                    if (lowerMsg.includes('price') || lowerMsg.includes('cost')) {
                        botResponseText = 'Our packages vary in price. You can view details on the Packages page or contact us for a custom quote.';
                    } else if (lowerMsg.includes('contact') || lowerMsg.includes('phone') || lowerMsg.includes('email')) {
                        botResponseText = 'You can reach us at +255 764 770 939 or via email at info@nuurpath.com.';
                    } else if (lowerMsg.includes('location') || lowerMsg.includes('address') || lowerMsg.includes('office')) {
                        botResponseText = 'We are located at GSM PLAZA, 2nd Floor, Dar Es Salaam, Tanzania.';
                    } else if (lowerMsg.includes('book') || lowerMsg.includes('reservation')) {
                        botResponseText = "You can book directly through our website by selecting a package, or let us know here what you're looking for!";
                    }

                    if (botResponseText) {
                        const botMsg = {
                            room: data.room,
                            author: 'Support Bot',
                            email: 'bot@nuurpath.com',
                            message: botResponseText,
                            time: new Date().toISOString(),
                        };

                        setTimeout(async () => {
                            io.to(data.room).emit('receive_message', botMsg);
                            try {
                                await prisma.chatMessage.create({ data: botMsg });
                            } catch (error) {
                                logger.error('chat_bot_response_save_failed', {
                                    room: data.room,
                                    socketId: socket.id,
                                    error,
                                });
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                logger.error('chat_message_save_failed', {
                    room: data.room,
                    socketId: socket.id,
                    error,
                });
            }

            if (data.recipientEmail) {
                socket.to(data.recipientEmail).emit('receive_message', data);
            }
        });

        socket.on('mark_read', async (data) => {
            const { room, readerEmail } = data;
            try {
                await prisma.chatMessage.updateMany({
                    where: {
                        room,
                        email: { not: readerEmail },
                        read: false,
                    },
                    data: { read: true },
                });

                socket.to(room).emit('messages_read', { room });
            } catch (error) {
                logger.error('chat_mark_read_failed', {
                    room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('resolve_chat', async ({ room }) => {
            const systemMsg = {
                room,
                author: 'System',
                email: 'system@nuurpath.com',
                message: 'This chat has been marked as resolved.',
                time: new Date().toISOString(),
            };

            try {
                await prisma.chatMessage.create({ data: systemMsg });
                io.to(room).emit('receive_message', systemMsg);
            } catch (error) {
                logger.error('chat_resolve_failed', {
                    room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info('socket_disconnected', {
                socketId: socket.id,
            });
            onlineUsers.delete(socket.id);
            io.emit('active_users', Array.from(onlineUsers.values()));
        });
    });
}

startServer().catch((error) => {
    handleFatalError('server_start_failed', error);
});
