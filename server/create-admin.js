const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@nuurpath.com';
    const password = 'admin123';
    
    console.log(`Creating admin user...`);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            role: 'admin', // Ensure existing user becomes admin
            password: hashedPassword, // Force update password
            isVerified: true // Mark email as verified
        },
        create: {
            email: email,
            name: 'Super Admin',
            password: hashedPassword,
            role: 'admin',
            isVerified: true // Mark email as verified
        },
    });

    console.log('✅ Admin user ready:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });