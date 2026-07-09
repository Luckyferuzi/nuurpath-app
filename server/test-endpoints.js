const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const endpoints = [
    // Public Routes
    { method: 'GET', path: '/api', description: 'Health Check' },
    { method: 'GET', path: '/api/services', description: 'Services List' },
    { method: 'GET', path: '/api/packages', description: 'Packages List' },
    { method: 'GET', path: '/api/content/privacy', description: 'Privacy Policy' },
    { method: 'GET', path: '/api/content/terms', description: 'Terms of Use' },
    { method: 'GET', path: '/api/package-bookings', description: 'Admin Package Bookings (Currently Public in server.js)' },
    
    // Protected Routes (Expect 401/403 if no token provided)
    { method: 'GET', path: '/api/users', expectedStatus: [401, 403], description: 'Users List (Protected)' },
    { method: 'GET', path: '/api/bookings', expectedStatus: [401, 403], description: 'Bookings (Protected)' },
    { method: 'GET', path: '/api/admin/stats', expectedStatus: [401, 403], description: 'Admin Stats (Protected)' },
    { method: 'GET', path: '/api/profile', expectedStatus: [401, 403], description: 'User Profile (Protected)' },
    { method: 'GET', path: '/api/notifications', expectedStatus: [401, 403], description: 'Notifications (Protected)' },
    { method: 'GET', path: '/api/flights', expectedStatus: [401, 403], description: 'Flights (Protected)' },
    { method: 'GET', path: '/api/appointments', expectedStatus: [401, 403], description: 'Appointments (Protected)' },
    { method: 'GET', path: '/api/consultations', expectedStatus: [401, 403], description: 'Consultations (Protected)' },
    { method: 'GET', path: '/api/newsletter', expectedStatus: [401, 403], description: 'Newsletter (Protected)' },
];

async function testEndpoints() {
    console.log(`🚀 Testing API endpoints at ${BASE_URL}...\n`);
    let successCount = 0;
    let failCount = 0;

    for (const endpoint of endpoints) {
        try {
            const response = await axios({
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.path}`,
                validateStatus: () => true // Don't throw on error status
            });

            const status = response.status;
            const expected = endpoint.expectedStatus || [200, 201, 304];
            
            // We consider it "Reachable" if it's not 404.
            // If we expect 401 (Protected) and get 401, that's a success for reachability.
            if (status !== 404) {
                const statusIcon = expected.includes(status) ? '✅' : '⚠️';
                console.log(`${statusIcon} ${endpoint.method.padEnd(4)} ${endpoint.path.padEnd(30)} - ${status} ${status !== 200 ? `(${response.statusText})` : ''}`);
                successCount++;
            } else {
                console.log(`❌ ${endpoint.method.padEnd(4)} ${endpoint.path.padEnd(30)} - 404 Not Found`);
                failCount++;
            }
        } catch (error) {
            console.error(`❌ ${endpoint.method.padEnd(4)} ${endpoint.path.padEnd(30)} - Error: ${error.message}`);
            failCount++;
        }
    }
    console.log(`\nTest Complete: ${successCount} reachable, ${failCount} failed.`);
}

testEndpoints();
