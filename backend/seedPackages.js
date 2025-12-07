const mongoose = require('mongoose');
const TravelPackage = require('./models/TravelPackage');
require('dotenv').config();

// Connect to database directly
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nuurpath_travels');
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error(err.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Connect to database
connectDB();

const samplePackages = [
    {
        title: "Zanzibar Beach Paradise",
        destination: "Zanzibar, Tanzania",
        duration: "7 Days / 6 Nights",
        price: 1200,
        description: "Experience the pristine white sand beaches and turquoise waters of Zanzibar. This package includes luxury beachfront accommodation, daily breakfast, and exciting water sports activities.",
        itinerary: [
            { day: 1, activity: "Arrival and beachfront resort check-in" },
            { day: 2, activity: "Stone Town historical tour" },
            { day: 3, activity: "Spice plantation visit and swimming with dolphins" },
            { day: 4, activity: "Relaxation day with optional water sports" },
            { day: 5, activity: "Prison Island tour and snorkeling" },
            { day: 6, activity: "Sunset dhow cruise with dinner" },
            { day: 7, activity: "Departure after breakfast" }
        ],
        inclusions: [
            "6 nights luxury beachfront accommodation",
            "Daily breakfast buffet",
            "All mentioned tours and activities",
            "Airport transfers",
            "English-speaking guide"
        ],
        exclusions: [
            "International flights",
            "Travel insurance",
            "Personal expenses",
            "Visa fees",
            "Lunch and dinner (except where specified)"
        ],
        images: [
            "https://images.unsplash.com/photo-1571003123861-29955f02a948",
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d"
        ],
        availability: {
            startDate: new Date("2025-12-15"),
            endDate: new Date("2026-06-30")
        },
        type: "beach"
    },
    {
        title: "Serengeti Safari Adventure",
        destination: "Serengeti National Park, Tanzania",
        duration: "5 Days / 4 Nights",
        price: 1800,
        description: "Embark on an unforgettable safari adventure in the world-famous Serengeti National Park. Witness the Great Migration and experience the Big Five in their natural habitat.",
        itinerary: [
            { day: 1, activity: "Arrival in Arusha, transfer to Serengeti" },
            { day: 2, activity: "Full day game drive in Central Serengeti" },
            { day: 3, activity: "Morning and afternoon game drives" },
            { day: 4, activity: "Hot air balloon safari and bush breakfast" },
            { day: 5, activity: "Final game drive and departure" }
        ],
        inclusions: [
            "4 nights luxury tented camp accommodation",
            "All meals (breakfast, lunch, dinner)",
            "Unlimited game drives with professional guide",
            "Park fees and conservation fees",
            "4x4 safari vehicle with pop-up roof",
            "Hot air balloon safari experience"
        ],
        exclusions: [
            "International flights",
            "Travel insurance",
            "Personal expenses",
            "Visa fees",
            "Alcoholic beverages",
            "Tips and gratuities"
        ],
        images: [
            "https://images.unsplash.com/photo-1589561253898-768105ca91a8",
            "https://images.unsplash.com/photo-1502780417293-65c40a816c4b",
            "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa"
        ],
        availability: {
            startDate: new Date("2025-12-01"),
            endDate: new Date("2026-11-30")
        },
        type: "wildlife"
    },
    {
        title: "Kilimanjaro Cultural Experience",
        destination: "Moshi, Tanzania",
        duration: "4 Days / 3 Nights",
        price: 850,
        description: "Discover the rich cultural heritage of the Chagga people at the foothills of Mount Kilimanjaro. Visit coffee plantations, waterfalls, and traditional villages.",
        itinerary: [
            { day: 1, activity: "Arrival in Moshi, visit Materuni waterfalls" },
            { day: 2, activity: "Chagga cultural tour and traditional lunch" },
            { day: 3, activity: "Coffee plantation tour and tasting" },
            { day: 4, activity: "Departure after breakfast" }
        ],
        inclusions: [
            "3 nights comfortable lodge accommodation",
            "Daily breakfast",
            "All mentioned tours and activities",
            "Cultural guide",
            "Airport transfers"
        ],
        exclusions: [
            "International flights",
            "Travel insurance",
            "Personal expenses",
            "Visa fees",
            "Lunch and dinner (except where specified)"
        ],
        images: [
            "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa",
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
            "https://images.unsplash.com/photo-1571003123861-29955f02a948"
        ],
        availability: {
            startDate: new Date("2025-12-01"),
            endDate: new Date("2026-12-31")
        },
        type: "cultural"
    },
    {
        title: "Ngorongoro Crater Expedition",
        destination: "Ngorongoro Conservation Area, Tanzania",
        duration: "3 Days / 2 Nights",
        price: 1100,
        description: "Explore the world's largest intact volcanic caldera, home to an incredible density of wildlife. The Ngorongoro Crater offers some of the best game viewing in Africa.",
        itinerary: [
            { day: 1, activity: "Arrival and transfer to Ngorongoro" },
            { day: 2, activity: "Full day crater tour with picnic lunch" },
            { day: 3, activity: "Morning visit to Olduvai Gorge, departure" }
        ],
        inclusions: [
            "2 nights luxury lodge accommodation",
            "All meals during stay",
            "Crater service fees",
            "Professional safari guide",
            "4x4 safari vehicle",
            "Park entrance fees"
        ],
        exclusions: [
            "International flights",
            "Travel insurance",
            "Personal expenses",
            "Visa fees",
            "Alcoholic beverages"
        ],
        images: [
            "https://images.unsplash.com/photo-1589561253898-768105ca91a8",
            "https://images.unsplash.com/photo-1502780417293-65c40a816c4b",
            "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa"
        ],
        availability: {
            startDate: new Date("2025-12-01"),
            endDate: new Date("2026-11-30")
        },
        type: "adventure"
    },
    {
        title: "Dar es Salaam City Break",
        destination: "Dar es Salaam, Tanzania",
        price: 600,
        duration: "3 Days / 2 Nights",
        description: "Experience the vibrant coastal city of Dar es Salaam with its mix of modern and traditional culture. Visit markets, museums, and enjoy beachfront dining.",
        itinerary: [
            { day: 1, activity: "Arrival and city orientation tour" },
            { day: 2, activity: "Visit National Museum and Village Museum" },
            { day: 3, activity: "Coco Beach and seafood lunch, departure" }
        ],
        inclusions: [
            "2 nights beachfront hotel accommodation",
            "Daily breakfast",
            "City tour with guide",
            "Museum entrance fees",
            "Airport transfers"
        ],
        exclusions: [
            "International flights",
            "Travel insurance",
            "Personal expenses",
            "Visa fees",
            "Lunch and dinner (except where specified)"
        ],
        images: [
            "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
            "https://images.unsplash.com/photo-1571003123861-29955f02a948",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d"
        ],
        availability: {
            startDate: new Date("2025-12-01"),
            endDate: new Date("2026-12-31")
        },
        type: "city_break"
    }
];

async function seedPackages() {
    try {
        // Clear existing packages
        await TravelPackage.deleteMany({});

        // Insert sample packages
        await TravelPackage.insertMany(samplePackages);

        console.log('✅ Successfully seeded packages!');
        console.log(`📊 Added ${samplePackages.length} sample travel packages`);

        // Fetch and display the packages to verify
        const packages = await TravelPackage.find({});
        console.log('📋 Current packages in database:');
        packages.forEach((pkg, index) => {
            console.log(`${index + 1}. ${pkg.title} - ${pkg.destination} (${pkg.type})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding packages:', error);
        process.exit(1);
    }
}

// Run the seeding function
seedPackages();
