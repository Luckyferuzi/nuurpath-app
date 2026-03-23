const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🛠️  Checking/Creating Package table...');
    
    try {
        // Create Package table based on schema.prisma
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Package" (
                "id" SERIAL NOT NULL,
                "title" TEXT NOT NULL,
                "destination" TEXT NOT NULL,
                "duration" TEXT NOT NULL,
                "type" TEXT NOT NULL,
                "price" DECIMAL(10,2) NOT NULL,
                "images" TEXT[],
                "isFeatured" BOOLEAN NOT NULL DEFAULT false,
                "description" TEXT NOT NULL,
                "itinerary" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,

                CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
            );
        `;
        console.log('✅ Package table ensured.');
    } catch (e) {
        console.error('❌ Error creating table:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();