const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const services = [
    {
        title: 'Flight Booking',
        description: 'Global flight reservations with competitive pricing and flexible options.',
        icon: 'Plane',
        price: 0.0,
        order: 0
    },
    {
        title: 'Hotel Reservations',
        description: 'Luxury and budget-friendly accommodations tailored to your travel needs.',
        icon: 'Hotel',
        price: 0.0,
        order: 1
    },
    {
        title: 'Holiday Packages',
        description: 'All-inclusive travel packages to the world\'s most beautiful destinations.',
        icon: 'Umbrella',
        price: 500.0,
        order: 2
    },
    {
        title: 'Visa Assistance',
        description: 'Expert guidance and processing for international travel visas.',
        icon: 'FileText',
        price: 50.0,
        order: 3
    }
];

async function main() {
    console.log('🌱 Seeding services...');

    for (const service of services) {
        await prisma.service.upsert({
            where: { id: services.indexOf(service) + 1 }, // Using index as a simple ID map for seeding
            update: service,
            create: service,
        });
    }

    console.log('✅ Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });