const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const demoUserEmail = process.env.DEMO_USER_EMAIL || 'user@example.com';
  const demoUserPassword = process.env.DEMO_USER_PASSWORD || adminPassword;

  if (!adminPassword || String(adminPassword).startsWith('replace-with-')) {
    throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD to a real value before running prisma/seed.js.');
  }

  if (!demoUserPassword || String(demoUserPassword).startsWith('replace-with-')) {
    throw new Error('Set DEMO_USER_PASSWORD to a real value before running prisma/seed.js.');
  }

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedDemoUserPassword = await bcrypt.hash(demoUserPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin User',
      email: adminEmail,
      password: hashedAdminPassword,
      role: 'admin',
      emailSubscriptions: true,
      isVerified: true
    },
  });

  console.log(`Admin user created: ${admin.email} (Password sourced from ADMIN_BOOTSTRAP_PASSWORD)`);

  const user = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      name: 'Guest Traveler',
      email: demoUserEmail,
      password: hashedDemoUserPassword,
      role: 'user'
    },
  });

  await prisma.package.deleteMany({});

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

  console.log(`${packages.length} packages created.`);

  await prisma.appointment.create({
    data: {
        userId: user.id,
        serviceType: 'Private Consultation',
        appointmentDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        notes: 'Interested in Hajj packages.',
        contactName: 'Guest Traveler',
        contactPhone: '+1234567890'
    }
  });
  console.log('Sample appointment created.');

  console.log('Seeding finished.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
