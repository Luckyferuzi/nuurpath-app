const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const prisma = require('./db');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');


// Load environment variables
// Try loading from parent directory (root) first, as that's where .env usually is
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            frameSrc: ["'self'", "https://www.google.com", "https://maps.google.com"],
            connectSrc: ["'self'", "https://api.openweathermap.org", "https://maps.googleapis.com", "https://geocoding-api.open-meteo.com", "https://api.open-meteo.com"],
        },
    },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support form submissions

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configure Multer for chat uploads
const chatUploadDir = path.join(__dirname, 'public/uploads/chat');
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, chatUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Configure Multer for package itinerary uploads
const packageUploadDir = path.join(__dirname, 'public/uploads/packages');
if (!fs.existsSync(packageUploadDir)) {
    fs.mkdirSync(packageUploadDir, { recursive: true });
}

const packageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, packageUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const packageUpload = multer({ storage: packageStorage });

// Configure Multer for booking documents (passports, etc.)
const bookingUploadDir = path.join(__dirname, 'public/uploads/bookings');
if (!fs.existsSync(bookingUploadDir)) {
    fs.mkdirSync(bookingUploadDir, { recursive: true });
}

const bookingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, bookingUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const bookingUpload = multer({ storage: bookingStorage });

const PORT = process.env.PORT || 5001;

// Handle uncaught exceptions to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥', err);
    // process.exit(1); // Optional: restart via PM2/Docker
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥', err);
    // process.exit(1);
});

async function startServer() {
    // Connect to Database
    const dbUrl = process.env.DATABASE_URL || "";
    console.log(`🔌 Connecting to database... (URL length: ${dbUrl.length})`);

    try {
        const url = new URL(dbUrl);
        console.log(`👤 Database User: ${url.username}`);
    } catch (e) {
        console.log('⚠️ Could not parse DATABASE_URL to extract username');
    }

    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully.');
    } catch (error) {
        console.error('❌ Database connection failed.');
        console.error('   Error Code:', error.code);
        console.error('   Message:', error.message);
        console.error('   Tip: Ensure your DATABASE_URL in .env includes "?schema=public"');
        process.exit(1);
    }

    // Health Check Endpoint
    app.get('/health', async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.status(200).json({ status: 'UP', database: 'connected', timestamp: new Date() });
        } catch (error) {
            res.status(503).json({ status: 'DOWN', database: 'disconnected', error: error.message, timestamp: new Date() });
        }
    });

    // Define Routes
    app.use('/api', require('./routes/mainRoutes'));
    app.use('/api/package-bookings', require('./routes/packageBookingAdminRoutes'));
    app.use('/api/auth', require('./routes/authRoutes'));
    // app.use('/api/auth', require('./routes/passwordResetRoutes'));
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

    app.post('/api/chat/upload', upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Return the URL to the file
        const fileUrl = `/uploads/chat/${req.file.filename}`;
        res.json({ 
            url: fileUrl, 
            name: req.file.originalname, 
            type: req.file.mimetype 
        });
    });

    app.post('/api/packages/upload-image', packageUpload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const fileUrl = `/uploads/packages/${req.file.filename}`;
        res.json({ url: fileUrl });
    });

    app.post('/api/bookings/upload', bookingUpload.single('passport'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const fileUrl = `/uploads/bookings/${req.file.filename}`;
        res.json({ url: fileUrl });
    });


    // Serve Frontend in Production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static(path.join(__dirname, '../client/build')));

        app.get('*', (req, res) => {
            // Don't interfere with API routes or the pages router above
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
            }
        });
    }

    // Global Error handling middleware
    app.use(require('./middleware/errorMiddleware'));

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`   Local: http://localhost:${PORT}`);
        console.log(`   Health Check: http://localhost:${PORT}/api`);
        console.log(`   System Status: http://localhost:${PORT}/health`);
    });

    // Initialize Socket.IO
    const onlineUsers = new Map();

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });
    
    // Make io accessible to routes
    app.set('io', io);

    io.on("connection", (socket) => {
        console.log(`User Connected: ${socket.id}`);

        socket.on("register_user", (userData) => {
            // Store user info with socket ID
            // userData should include { name, email, role }
            const user = { ...userData, socketId: socket.id };
            onlineUsers.set(socket.id, user);
            
            // Join a room with their email for private notifications
            if (userData.email) {
                socket.join(userData.email);
            }

            // Broadcast updated user list to all clients
            io.emit("active_users", Array.from(onlineUsers.values()));
        });

        socket.on("join_room", async (room) => {
            socket.join(room);
            try {
                // Fetch last 50 messages for this room
                const messages = await prisma.chatMessage.findMany({
                    where: { room },
                    orderBy: { createdAt: 'asc' },
                    take: 50
                });
                socket.emit("load_messages", messages);

                // If no messages exist, send a welcome message from the bot
                if (messages.length === 0) {
                    const welcomeMsg = {
                        room: room,
                        author: "Support Bot",
                        email: "bot@nuurpath.com",
                        message: "Welcome to NuurPath Travels! How can we assist you today?",
                        time: new Date().toISOString()
                    };

                    // Save welcome message to database
                    await prisma.chatMessage.create({
                        data: { ...welcomeMsg }
                    });

                    // Emit to the room so the user sees it immediately
                    io.to(room).emit("receive_message", welcomeMsg);
                }

            } catch (err) {
                console.error("Error fetching chat history:", err);
            }
        });

        socket.on("typing", (data) => {
            socket.to(data.room).emit("display_typing", data);
        });

        socket.on("stop_typing", (data) => {
            socket.to(data.room).emit("hide_typing", data);
        });

        socket.on("send_message", async (data) => {
            socket.to(data.room).emit("receive_message", data);
            
            // Persist message
            try {
                // If it's a file message, ensure we have some text content for the DB
                const messageContent = data.message || (data.file ? `Sent a file: ${data.file.name}` : "");

                await prisma.chatMessage.create({
                    data: {
                        room: data.room,
                        author: data.author,
                        email: data.email,
                        message: messageContent,
                        time: data.time
                    }
                });

                // Automated Bot Responses
                // Only reply if the sender is the customer (room owner) and not the bot itself
                if (data.email === data.room && data.author !== "Support Bot") {
                    const lowerMsg = (messageContent || "").toLowerCase();
                    let botResponseText = null;

                    if (lowerMsg.includes("price") || lowerMsg.includes("cost")) {
                        botResponseText = "Our packages vary in price. You can view details on the Packages page or contact us for a custom quote.";
                    } else if (lowerMsg.includes("contact") || lowerMsg.includes("phone") || lowerMsg.includes("email")) {
                        botResponseText = "You can reach us at +255 764 770 939 or via email at info@nuurpath.com.";
                    } else if (lowerMsg.includes("location") || lowerMsg.includes("address") || lowerMsg.includes("office")) {
                        botResponseText = "We are located at GSM PLAZA, 2nd Floor, Dar Es Salaam, Tanzania.";
                    } else if (lowerMsg.includes("book") || lowerMsg.includes("reservation")) {
                        botResponseText = "You can book directly through our website by selecting a package, or let us know here what you're looking for!";
                    }

                    if (botResponseText) {
                        const botMsg = {
                            room: data.room,
                            author: "Support Bot",
                            email: "bot@nuurpath.com",
                            message: botResponseText,
                            time: new Date().toISOString()
                        };

                        // Simulate typing delay
                        setTimeout(async () => {
                            io.to(data.room).emit("receive_message", botMsg);
                            try {
                                await prisma.chatMessage.create({ data: botMsg });
                            } catch (err) {
                                console.error("Error saving bot response:", err);
                            }
                        }, 1000);
                    }
                }

            } catch (err) {
                console.error("Error saving message:", err);
            }

            // Also send to specific recipient if provided (for notifications when they aren't in the room)
            if (data.recipientEmail) {
                socket.to(data.recipientEmail).emit("receive_message", data);
            }
        });

        socket.on("mark_read", async (data) => {
            const { room, readerEmail } = data;
            try {
                // Update messages in DB where the current user is NOT the sender
                await prisma.chatMessage.updateMany({
                    where: {
                        room: room,
                        email: { not: readerEmail },
                        read: false
                    },
                    data: { read: true }
                });
                
                // Notify the room (specifically the sender) that messages are read
                socket.to(room).emit("messages_read", { room });
            } catch (err) {
                console.error("Error marking messages read:", err);
            }
        });

        socket.on("resolve_chat", async ({ room }) => {
            const systemMsg = {
                room,
                author: "System",
                email: "system@nuurpath.com",
                message: "This chat has been marked as resolved.",
                time: new Date().toISOString()
            };

            try {
                await prisma.chatMessage.create({ data: systemMsg });
                io.to(room).emit("receive_message", systemMsg);
            } catch (err) {
                console.error("Error resolving chat:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("User Disconnected", socket.id);
            onlineUsers.delete(socket.id);
            io.emit("active_users", Array.from(onlineUsers.values()));
        });
    });
}

startServer();