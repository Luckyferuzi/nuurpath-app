const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDatabaseConnection() {
    console.log('🔍 Checking database connection...');
    
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error('❌ Error: DATABASE_URL is not defined in .env file.');
        process.exit(1);
    }

    // Mask password for logging
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`   Target: ${maskedUrl}`);

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        console.log('✅ Connection established successfully!');
        
        const res = await client.query('SELECT NOW() as now, version()');
        console.log(`   Database Version: ${res.rows[0].version}`);
        console.log(`   Server Time: ${res.rows[0].now}`);
        
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

checkDatabaseConnection();