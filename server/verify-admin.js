const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@nuurpath.com';
    
    console.log(`🔍 Checking database for user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email: email },
    });

    if (user) {
        console.log('✅ User found successfully:');
        console.log({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            isVerified: user.isVerified,
            // We don't print the password hash for security, but it exists
            passwordHash: user.password ? '********' : 'MISSING' 
        });
    } else {
        console.error('❌ User NOT found in database.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });