const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding packages...');

    const packages = [
        {
            title: "Premium Umrah Package",
            description: "Experience a spiritual journey with our 5-star Umrah package. Includes flights, accommodation near Haram, and guided tours.",
            price: 1500.00,
            destination: "Makkah & Madinah",
            duration: "10 Days",
            type: "Umrah",
            isFeatured: true,
            images: [],
            itinerary: JSON.stringify([
                { day: 1, title: "Arrival", description: "Arrive in Jeddah and transfer to Makkah hotel." },
                { day: 2, title: "Umrah", description: "Perform Umrah rituals with guide." },
                { day: 3, title: "Makkah Ziyarat", description: "Visit historical sites in Makkah." }
            ])
        },
        {
            title: "Hajj Deluxe 2025",
            description: "Complete Hajj package with VIP services. Dedicated tents in Mina, buffet meals, and scholar guidance throughout the pilgrimage.",
            price: 8500.00,
            destination: "Makkah, Mina, Arafat",
            duration: "21 Days",
            type: "Hajj",
            isFeatured: true,
            images: [],
            itinerary: JSON.stringify([
                { day: 1, title: "Arrival in Jeddah", description: "Welcome and transfer to Aziziyah." },
                { day: 8, title: "Mina", description: "Move to Mina tents." },
                { day: 9, title: "Arafat", description: "Day of Arafat." }
            ])
        },
        {
            title: "Turkey Islamic Heritage",
            description: "Explore the rich Islamic history of Istanbul, Bursa, and Konya. Visit the Blue Mosque, Topkapi Palace, and Rumi's tomb.",
            price: 1200.00,
            destination: "Turkey",
            duration: "8 Days",
            type: "Halal Tourism",
            isFeatured: false,
            images: [],
            itinerary: JSON.stringify([
                { day: 1, title: "Istanbul Arrival", description: "Transfer to hotel." },
                { day: 2, title: "Old City Tour", description: "Blue Mosque and Hagia Sophia." }
            ])
        },
        {
            title: "Zanzibar Beach Retreat",
            description: "Relax on the pristine beaches of Zanzibar. Halal-friendly resorts with private pools and fresh seafood.",
            price: 950.00,
            destination: "Zanzibar, Tanzania",
            duration: "5 Days",
            type: "Vacation",
            isFeatured: false,
            images: [],
            itinerary: ""
        },
        {
            title: "Al-Aqsa Tour",
            description: "Visit the third holiest site in Islam. Guided tours of Al-Aqsa compound, Dome of the Rock, and historical sites in Jerusalem.",
            price: 1100.00,
            destination: "Jerusalem",
            duration: "6 Days",
            type: "Islamic Heritage",
            isFeatured: true,
            images: [],
            itinerary: ""
        }
    ];

    for (const pkg of packages) {
        // Check if package exists to avoid duplicates
        const existing = await prisma.package.findFirst({
            where: { title: pkg.title }
        });

        if (!existing) {
            await prisma.package.create({
                data: pkg
            });
            console.log(`   Created: ${pkg.title}`);
        } else {
            console.log(`   Skipped (Exists): ${pkg.title}`);
        }
    }

    console.log('✅ Packages seeded successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });