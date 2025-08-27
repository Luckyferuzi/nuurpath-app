import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create the context
const AuthContext = createContext();

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Function to check for token and fetch user on app load
    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Set the token in the headers for all future requests
                axios.defaults.headers.common['x-auth-token'] = token;
                try {
                    const res = await axios.get('/api/auth/me'); // Get user data from your backend
                    setUser(res.data);
                } catch (err) {
                    // Token is invalid or expired, clear it
                    localStorage.removeItem('token');
                    delete axios.defaults.headers.common['x-auth-token'];
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    // Login function to be called from a component
    const login = async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        // Set the token in the headers
        axios.defaults.headers.common['x-auth-token'] = res.data.token;
        const userRes = await axios.get('/api/auth/me');
        setUser(userRes.data);
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the context
export const useAuth = () => useContext(AuthContext);