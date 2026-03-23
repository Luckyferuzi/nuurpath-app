require('dotenv').config();
const { sequelize, User, Package, Booking } = require('./models');

async function seed() {
    try {
        console.log('🌱 Starting database seed...');

        // Sync database (force: true drops tables and recreates them)
        await sequelize.sync({ force: true });
        console.log('✅ Database synced and cleared.');

        // 1. Create Users
        // Note: In a real production app, you should hash these passwords (e.g., using bcrypt)
        // before saving them if your auth controller expects hashed passwords.
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@nuurpath.com',
            password: 'password123', 
            role: 'admin',
            bio: 'System Administrator',
            contactInfo: '+255 700 000 000'
        });

        const managerUser = await User.create({
            name: 'Manager User',
            email: 'manager@nuurpath.com',
            password: 'password123',
            role: 'manager',
            bio: 'Standard account for user management',
            contactInfo: '+255 700 000 001'
        });

        const regularUser = await User.create({
            name: 'Guest Traveler',
            email: 'user@example.com',
            password: 'password123',
            role: 'user',
            bio: 'Regular traveler exploring the world.',
            contactInfo: '+255 600 000 000'
        });

        console.log('✅ Users created.');

        // 2. Create Packages (Data from App.jsx MOCK_PACKAGES)
        const packages = await Package.bulkCreate([
            {
                title: 'Premium Umrah Holiday Package 24th Dec 2025 - 3rd Jan 2026',
                destination: 'Makkah & Madinah',
                duration: '10 Days',
                type: 'umrah',
                price: 2600,
                images: ['umrah1.jpg'],
                isFeatured: true,
                description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
            },
            {
                title: 'Umrah January 2026 15th Jan - 26th Jan 2026',
                destination: 'Makkah & Madinah',
                duration: '10 Days',
                type: 'umrah',
                price: 1800,
                images: ['umrah.jpg'],
                isFeatured: true,
                description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
            },
            {
                title: 'Premium Umrah 1st Ramadan - 11th Ramadan 2026 ',
                destination: 'Makkah & Madinah',
                duration: '10 Days',
                type: 'umrah',
                price: 2000,
                images: ['umrah3.jpg'],
                isFeatured: true,
                description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
            },
            {
                title: 'Premium Umrah 20th Ramadan - 2nd Shawwal 2026 ',
                destination: 'Makkah & Madinah',
                duration: '10 Days',
                type: 'umrah',
                price: 3400,
                images: ['umrah4.jpg'],
                isFeatured: false,
                description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
            },
            {
                title: 'Luxury Dubai City Escape',
                destination: 'United Arab Emirates',
                duration: '7 Days',
                type: 'leisure',
                price: 1800,
                images: ['dubai.jpg'],
                isFeatured: false,
                description: 'Discover the future in the heart of the desert with private tours, yacht experiences, and desert safaris.'
            },
            {
                title: 'Standard Hajj 2024',
                destination: 'Saudi Arabia',
                duration: '21 Days',
                type: 'hajj',
                price: 6200,
                images: ['hajj.jpg'],
                isFeatured: false,
                description: 'Complete your 5th pillar of Islam with a reliable and experienced team offering 24/7 support.'
            },
        ]);

        console.log('✅ Packages created.');

        // 3. Create Bookings (Data from App.jsx MOCK_BOOKINGS)
        // We map the mock data logic to the actual database IDs we just created.
        await Booking.bulkCreate([
            { userId: adminUser.id, packageId: packages[0].id, status: 'Confirmed', travelDate: '2025-12-24', contactName: adminUser.name, contactEmail: adminUser.email, contactPhone: adminUser.contactInfo, passengers: 1, totalPrice: packages[0].price },
            { userId: regularUser.id, packageId: packages[4].id, status: 'Pending', travelDate: '2026-02-10', contactName: regularUser.name, contactEmail: regularUser.email, contactPhone: regularUser.contactInfo, passengers: 2, totalPrice: packages[4].price * 2 },
            { userId: regularUser.id, packageId: packages[5].id, status: 'Confirmed', travelDate: '2024-06-10', contactName: regularUser.name, contactEmail: regularUser.email, contactPhone: regularUser.contactInfo, passengers: 1, totalPrice: packages[5].price },
        ]);

        console.log('✅ Bookings created.');
        console.log('🚀 Seeding complete! You can now start the server.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
