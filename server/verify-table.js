const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log('🔍 Verifying Appointment table...');
    try {
        // Attempt to count records in the Appointment table
        const count = await prisma.appointment.count();
        console.log(`✅ Success! Appointment table exists and contains ${count} records.`);
    } catch (error) {
        console.error('❌ Error: Appointment table was not found or is inaccessible.');
        console.error(`   Details: ${error.message}`);
        console.error('   Try running: npx prisma db push');
    } finally {
        await prisma.$disconnect();
    }
}

verify();