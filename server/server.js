const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const prisma = require('./db');
const { Server } = require('socket.io');
const asyncHandler = require('./middleware/asyncHandler');
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');
const softAuth = require('./middleware/softAuth');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const logger = require('./utils/logger');
const { getVerifiedUserFromToken } = require('./middleware/auth');
const {
    bookingDocumentUpload,
    chatUpload,
    packageImageUpload,
    publicUploadRoot,
    runUpload,
    sendUploadError,
    resolvePrivateChatUploadPath,
    toProtectedChatUploadUrl,
    toProtectedBookingDocumentUrl,
    toPublicUploadUrl,
} = require('./utils/upload');
const {
    buildChatPresence,
    canManageSupportChats,
    getNotificationRoomForUser,
    getStaffChatRoom,
    getSupportRoomForUser,
} = require('./utils/socketRooms');

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
const CHAT_HISTORY_LIMIT = 50;
const CHAT_MESSAGE_LIMIT_WINDOW_MS = 60 * 1000;
const CHAT_MESSAGE_LIMIT_MAX = 20;

process.on('uncaughtException', (error) => {
    handleFatalError('uncaught_exception', error);
});

process.on('unhandledRejection', (error) => {
    handleFatalError('unhandled_rejection', error);
});

function getSocketAuthToken(socket) {
    const handshakeToken = socket.handshake?.auth?.token;
    if (handshakeToken && String(handshakeToken).trim()) {
        return String(handshakeToken).trim();
    }

    const authorizationHeader = socket.handshake?.headers?.authorization;
    if (authorizationHeader && authorizationHeader.toLowerCase().startsWith('bearer ')) {
        const bearerToken = authorizationHeader.slice(7).trim();
        if (bearerToken) {
            return bearerToken;
        }
    }

    const headerToken = socket.handshake?.headers?.['x-auth-token'];
    if (headerToken && String(headerToken).trim()) {
        return String(headerToken).trim();
    }

    return null;
}

function toPositiveInteger(value) {
    const normalized = Number.parseInt(value, 10);

    if (!Number.isInteger(normalized) || normalized <= 0) {
        return null;
    }

    return normalized;
}

function emitChatError(socket, message) {
    socket.emit('chat_error', {
        message,
    });
}

function buildWelcomeMessage(room) {
    return {
        room,
        author: 'Support Bot',
        email: 'bot@nuurpath.com',
        message: 'Welcome to NuurPath Travels! How can we assist you today?',
        time: new Date().toISOString(),
    };
}

function emitActiveUsersToStaff(io, onlineChatUsers) {
    const activeUsersMap = new Map();

    Array.from(onlineChatUsers.values()).forEach((presence) => {
        if (!presence || canManageSupportChats(presence)) {
            return;
        }

        activeUsersMap.set(presence.userId, presence);
    });

    io.to(getStaffChatRoom()).emit('active_users', Array.from(activeUsersMap.values()));
}

function registerChatPresence(socket, io, onlineChatUsers) {
    const presence = buildChatPresence(socket.user);
    if (!presence) {
        emitChatError(socket, 'Authentication is required to use chat.');
        return;
    }

    socket.join(getSupportRoomForUser(socket.user.id));

    if (canManageSupportChats(socket.user)) {
        socket.join(getStaffChatRoom());
    } else {
        onlineChatUsers.set(socket.id, presence);
    }

    emitActiveUsersToStaff(io, onlineChatUsers);
}

function unregisterChatPresence(socket, io, onlineChatUsers) {
    if (onlineChatUsers.delete(socket.id)) {
        emitActiveUsersToStaff(io, onlineChatUsers);
    }
}

function resolveAuthorizedSupportRoom(socket, payload, { allowStaffSelf = false } = {}) {
    if (!socket.user || !socket.user.id) {
        return { error: 'Authentication is required to use chat.' };
    }

    if (!canManageSupportChats(socket.user)) {
        return {
            room: getSupportRoomForUser(socket.user.id),
            targetUserId: socket.user.id,
            isStaff: false,
        };
    }

    const rawTargetUserId = payload && typeof payload === 'object'
        ? (payload.targetUserId ?? payload.userId ?? payload.roomUserId)
        : payload;
    const targetUserId = toPositiveInteger(rawTargetUserId);

    if (targetUserId === null) {
        if (allowStaffSelf) {
            return {
                room: getSupportRoomForUser(socket.user.id),
                targetUserId: socket.user.id,
                isStaff: true,
            };
        }

        return { error: 'A valid chat target is required.' };
    }

    return {
        room: getSupportRoomForUser(targetUserId),
        targetUserId,
        isStaff: true,
    };
}

function canSendAnotherChatMessage(socket) {
    const now = Date.now();
    const timestamps = Array.isArray(socket.data?.chatMessageTimestamps)
        ? socket.data.chatMessageTimestamps.filter((timestamp) => now - timestamp < CHAT_MESSAGE_LIMIT_WINDOW_MS)
        : [];

    if (timestamps.length >= CHAT_MESSAGE_LIMIT_MAX) {
        socket.data.chatMessageTimestamps = timestamps;
        return false;
    }

    timestamps.push(now);
    socket.data.chatMessageTimestamps = timestamps;
    return true;
}

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

        const fileUrl = toProtectedChatUploadUrl(req.file.filename);

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

    app.get('/api/chat/files/:filename', auth, asyncHandler(async (req, res) => {
        const filePath = resolvePrivateChatUploadPath(req.params.filename);
        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        if (!canManageSupportChats(req.user)) {
            const expectedMessagePath = toProtectedChatUploadUrl(req.params.filename);
            const isAuthorized = await prisma.chatMessage.findFirst({
                where: {
                    room: getSupportRoomForUser(req.user.id),
                    message: expectedMessagePath,
                },
                select: { id: true },
            });

            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'You do not have permission to access this file.' });
            }
        }

        return res.sendFile(filePath);
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

    app.post('/api/bookings/upload', softAuth, asyncHandler(async (req, res) => {
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

    const onlineChatUsers = new Map();

    const io = new Server(server, {
        cors: {
            origin: env.ALLOWED_ORIGINS,
            methods: ['GET', 'POST'],
        },
    });

    app.set('io', io);

    io.use(async (socket, next) => {
        const token = getSocketAuthToken(socket);

        if (!token) {
            next(new Error('Authentication required'));
            return;
        }

        try {
            socket.user = await getVerifiedUserFromToken(token);
            next();
        } catch (error) {
            logger.warn('socket_auth_failed', {
                socketId: socket.id,
                error,
            });
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(getNotificationRoomForUser(socket.user.id));
        socket.data.chatMessageTimestamps = [];

        logger.info('socket_connected', {
            socketId: socket.id,
            userId: socket.user?.id,
            role: socket.user?.role,
        });

        socket.on('register_user', () => {
            registerChatPresence(socket, io, onlineChatUsers);
        });

        socket.on('join_room', async (payload) => {
            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                emitChatError(socket, authorizedRoom.error);
                return;
            }

            socket.join(authorizedRoom.room);
            try {
                const messages = await prisma.chatMessage.findMany({
                    where: { room: authorizedRoom.room },
                    orderBy: { createdAt: 'asc' },
                    take: CHAT_HISTORY_LIMIT,
                });
                socket.emit('load_messages', messages);

                if (messages.length === 0 && !authorizedRoom.isStaff) {
                    const welcomeMsg = buildWelcomeMessage(authorizedRoom.room);

                    await prisma.chatMessage.create({
                        data: { ...welcomeMsg },
                    });

                    io.to(authorizedRoom.room).emit('receive_message', welcomeMsg);
                }
            } catch (error) {
                logger.error('chat_history_load_failed', {
                    room: authorizedRoom.room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('typing', (payload) => {
            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                return;
            }

            socket.to(authorizedRoom.room).emit('display_typing', {
                room: authorizedRoom.room,
                userId: socket.user.id,
            });
        });

        socket.on('stop_typing', (payload) => {
            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                return;
            }

            socket.to(authorizedRoom.room).emit('hide_typing', {
                room: authorizedRoom.room,
                userId: socket.user.id,
            });
        });

        socket.on('send_message', async (payload) => {
            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                emitChatError(socket, authorizedRoom.error);
                return;
            }

            if (!canSendAnotherChatMessage(socket)) {
                emitChatError(socket, 'You are sending messages too quickly. Please wait a moment and try again.');
                return;
            }

            try {
                const messageContent = typeof payload?.message === 'string' ? payload.message.trim() : '';
                if (!messageContent) {
                    emitChatError(socket, 'Message content is required.');
                    return;
                }

                const savedMessage = {
                    room: authorizedRoom.room,
                    author: socket.user.name || (authorizedRoom.isStaff ? 'Support Team' : 'Customer'),
                    email: socket.user.email,
                    message: messageContent,
                    time: new Date().toISOString(),
                };

                await prisma.chatMessage.create({
                    data: savedMessage,
                });

                io.to(authorizedRoom.room).emit('receive_message', savedMessage);

                if (!authorizedRoom.isStaff) {
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
                            room: authorizedRoom.room,
                            author: 'Support Bot',
                            email: 'bot@nuurpath.com',
                            message: botResponseText,
                            time: new Date().toISOString(),
                        };

                        setTimeout(async () => {
                            io.to(authorizedRoom.room).emit('receive_message', botMsg);
                            try {
                                await prisma.chatMessage.create({ data: botMsg });
                            } catch (error) {
                                logger.error('chat_bot_response_save_failed', {
                                    room: authorizedRoom.room,
                                    socketId: socket.id,
                                    error,
                                });
                            }
                        }, 1000);
                    }
                }
            } catch (error) {
                logger.error('chat_message_save_failed', {
                    room: authorizedRoom.room,
                    socketId: socket.id,
                    error,
                });
                emitChatError(socket, 'Unable to send your message right now. Please try again.');
            }
        });

        socket.on('mark_read', async (payload) => {
            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                emitChatError(socket, authorizedRoom.error);
                return;
            }

            try {
                await prisma.chatMessage.updateMany({
                    where: {
                        room: authorizedRoom.room,
                        email: { not: socket.user.email },
                        read: false,
                    },
                    data: { read: true },
                });

                io.to(authorizedRoom.room).emit('messages_read', { room: authorizedRoom.room });
            } catch (error) {
                logger.error('chat_mark_read_failed', {
                    room: authorizedRoom.room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('resolve_chat', async (payload) => {
            if (!canManageSupportChats(socket.user)) {
                emitChatError(socket, 'You do not have permission to resolve this chat.');
                return;
            }

            const authorizedRoom = resolveAuthorizedSupportRoom(socket, payload);
            if (authorizedRoom.error) {
                emitChatError(socket, authorizedRoom.error);
                return;
            }

            const systemMsg = {
                room: authorizedRoom.room,
                author: 'System',
                email: 'system@nuurpath.com',
                message: 'This chat has been marked as resolved.',
                time: new Date().toISOString(),
            };

            try {
                await prisma.chatMessage.create({ data: systemMsg });
                io.to(authorizedRoom.room).emit('receive_message', systemMsg);
            } catch (error) {
                logger.error('chat_resolve_failed', {
                    room: authorizedRoom.room,
                    socketId: socket.id,
                    error,
                });
            }
        });

        socket.on('disconnect', () => {
            logger.info('socket_disconnected', {
                socketId: socket.id,
                userId: socket.user?.id,
            });
            unregisterChatPresence(socket, io, onlineChatUsers);
        });
    });
}

startServer().catch((error) => {
    handleFatalError('server_start_failed', error);
});
