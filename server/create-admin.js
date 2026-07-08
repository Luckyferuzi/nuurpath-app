const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

    if (!password || String(password).startsWith('replace-with-')) {
        throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD to a real value before running create-admin.js.');
    }

    console.log('Creating admin user...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.user.upsert({
        where: { email },
        update: {
            role: 'admin',
            password: hashedPassword,
            isVerified: true,
        },
        create: {
            email,
            name: 'Super Admin',
            password: hashedPassword,
            role: 'admin',
            isVerified: true,
        },
    });

    console.log('Admin user ready.');
    console.log(`Email: ${email}`);
    console.log('Password: sourced from ADMIN_BOOTSTRAP_PASSWORD');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
