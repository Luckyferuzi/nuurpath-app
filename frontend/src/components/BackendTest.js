import React, { useState, useEffect } from 'react';
import { testBackendConnection } from '../api/testConnection';

const BackendTest = () => {
    const [connectionStatus, setConnectionStatus] = useState('Testing connection...');
    const [backendMessage, setBackendMessage] = useState('');

    useEffect(() => {
        const testConnection = async () => {
            try {
                const message = await testBackendConnection();
                setConnectionStatus('✅ Connected successfully!');
                setBackendMessage(message);
            } catch (error) {
                setConnectionStatus('❌ Connection failed');
                setBackendMessage(error.message);
            }
        };

        testConnection();
    }, []);

    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', margin: '20px' }}>
            <h3>Backend Connection Test</h3>
            <p><strong>Status:</strong> {connectionStatus}</p>
            <p><strong>Message:</strong> {backendMessage}</p>
        </div>
    );
};

export default BackendTest;
