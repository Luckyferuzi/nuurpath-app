const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@nuurpath.com';
    const passwordAttempt = 'admin123';

    console.log(`🔐 Testing login for: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('❌ User not found.');
        return;
    }

    console.log('👤 User found. Verifying password...');
    
    // Check if password is plain text (common seeding issue)
    if (user.password === passwordAttempt) {
        console.log('⚠️  WARNING: Password stored as PLAIN TEXT in DB. Login expects Hash.');
        console.log('❌ Login will fail via API.');
        return;
    }

    const isMatch = await bcrypt.compare(passwordAttempt, user.password);

    if (isMatch) {
        console.log('✅ Password MATCHES! Login should work.');
    } else {
        console.log('❌ Password MISMATCH.');
        console.log('   The password in the DB does not match "admin123".');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });