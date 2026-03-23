const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. Create Admin User
  // Default password is 'password123'
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nuurpath.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@nuurpath.com',
      password: hashedPassword,
      role: 'admin',
      emailSubscriptions: true,
      isVerified: true
    },
  });
  
  console.log(`👤 Admin user created: ${admin.email} (Password: password123)`);

  // Create Regular User
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Guest Traveler',
      email: 'user@example.com',
      password: hashedPassword,
      role: 'user'
    },
  });

  // Clear existing packages to prevent duplicates
  // Note: We must delete dependent data (like bookings) first if they exist, 
  // but for a fresh seed, deleting packages is usually enough if cascading is set up or DB is empty.
  await prisma.package.deleteMany({});

  // 2. Create Packages
  const packages = [
    {
        title: 'Premium Umrah Holiday Package 24th Dec 2025 - 3rd Jan 2026',
        destination: 'Makkah & Madinah',
        duration: '10 Days',
        type: 'umrah',
        price: 2600,
        images: ['https://images.unsplash.com/photo-1565552629477-e027f78f998c?q=80&w=1000&auto=format&fit=crop'],
        isFeatured: true,
        description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
    },
    {
        title: 'Umrah January 2026 15th Jan - 26th Jan 2026',
        destination: 'Makkah & Madinah',
        duration: '10 Days',
        type: 'umrah',
        price: 1800,
        images: ['https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop'],
        isFeatured: true,
        description: 'Experience a deeply spiritual Ramadan journey with luxury 5-star hotel stays. Includes visa processing, guided tours, and premium transportation.'
    },
    {
        title: 'Luxury Dubai City Escape',
        destination: 'United Arab Emirates',
        duration: '7 Days',
        type: 'leisure',
        price: 1800,
        images: ['https://images.unsplash.com/photo-1512453979798-5ea904ac6605?q=80&w=1000&auto=format&fit=crop'],
        isFeatured: false,
        description: 'Discover the future in the heart of the desert with private tours, yacht experiences, and desert safaris.'
    }
  ];

  for (const pkg of packages) {
    await prisma.package.create({
      data: pkg
    });
  }
  
  console.log(`📦 ${packages.length} packages created.`);

  // 3. Create Appointment
  await prisma.appointment.create({
    data: {
        userId: user.id,
        serviceType: 'Private Consultation',
        appointmentDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        notes: 'Interested in Hajj packages.',
        contactName: 'Guest Traveler',
        contactPhone: '+1234567890'
    }
  });
  console.log('✅ Sample appointment created.');

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });