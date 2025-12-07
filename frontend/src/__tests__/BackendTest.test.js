import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BackendTest from '../components/BackendTest';
import { testBackendConnection } from '../api/testConnection';

// Mock the testBackendConnection function
jest.mock('../api/testConnection', () => ({
    testBackendConnection: jest.fn(),
}));

describe('BackendTest Component', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    test('renders loading state initially', () => {
        render(<BackendTest />);
        expect(screen.getByText('Testing connection...')).toBeInTheDocument();
    });

    test('displays successful connection message when backend is reachable', async () => {
        // Mock successful response
        testBackendConnection.mockResolvedValue('NuurPath Travels API is running!');

        render(<BackendTest />);

        await waitFor(() => {
            expect(screen.getByText('✅ Connected successfully!')).toBeInTheDocument();
        });
        expect(screen.getByText('NuurPath Travels API is running!')).toBeInTheDocument();
    });

    test('displays error message when backend connection fails', async () => {
        // Mock error response
        testBackendConnection.mockRejectedValue(new Error('Connection failed'));

        render(<BackendTest />);

        await waitFor(() => {
            expect(screen.getByText('❌ Connection failed')).toBeInTheDocument();
        });
    });
});
