const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const prisma = new PrismaClient();

async function main() {
    const email = process.env.TEST_LOGIN_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@example.com';
    const passwordAttempt = process.env.TEST_LOGIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD;

    if (!passwordAttempt || String(passwordAttempt).startsWith('replace-with-')) {
        throw new Error('Set TEST_LOGIN_PASSWORD or ADMIN_BOOTSTRAP_PASSWORD before running test-login.js.');
    }

    console.log(`Testing login for: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('User not found.');
        return;
    }

    console.log('User found. Verifying password...');

    if (user.password === passwordAttempt) {
        console.log('WARNING: Password stored as plain text in DB. Login expects a hash.');
        console.log('Login will fail via API.');
        return;
    }

    const isMatch = await bcrypt.compare(passwordAttempt, user.password);

    if (isMatch) {
        console.log('Password matches. Login should work.');
    } else {
        console.log('Password mismatch.');
        console.log('The password in the DB does not match the supplied test password.');
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });
