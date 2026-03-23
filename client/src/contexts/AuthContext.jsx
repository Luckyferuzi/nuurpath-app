import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Configure axios base URL
axios.defaults.baseURL = CONFIG.API_BASE_URL.replace('/api', '');

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    // Use an interceptor to ensure the token is always attached to requests
    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(config => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (token) {
                config.headers['x-auth-token'] = token;
            }
            return config;
        });

        const responseInterceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [logout]);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const res = await axios.get('/api/auth/me');
            setUser(res.data);
            setIsAuthenticated(true);
        } catch (err) {
            console.error('Load user error:', err.response?.data || err.message);
            // Only clear token if the error is 401 (Unauthorized) or 403 (Forbidden)
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                delete axios.defaults.headers.common['x-auth-token'];
                setUser(null);
                setIsAuthenticated(false);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = useCallback(async (email, password, rememberMe = false) => {
        try {
            const res = await axios.post('/api/auth/login', { email, password, rememberMe });
            const token = res.data.token;
            if (rememberMe) {
                localStorage.setItem('token', token);
            } else {
                sessionStorage.setItem('token', token);
            }
            await loadUser(); // This will set the header and fetch user
            return { success: true };
        } catch (err) {
            if (err.code === 'ERR_NETWORK') {
                console.error('Login error: Server is unreachable. Please check if the backend is running.');
            } else {
                const errorData = err.response?.data;
                console.error('Login error:', errorData || err.message);
            }
            return { success: false, error: err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Login failed. Please check your credentials.' };
        }
    }, [loadUser]);

    const register = useCallback(async (name, email, password) => {
        try {
            const res = await axios.post('/api/auth/register', { name, email, password });
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                await loadUser();
                return { success: true };
            }
            return { success: true, message: res.data.msg };
        } catch (err) {
            console.error('Register error:', err.response?.data || err.message);
            return { success: false, error: err.response?.data?.msg || err.message };
        }
    }, [loadUser]);

    const googleLogin = useCallback(async (token) => {
        try {
            const res = await axios.post('/api/auth/google', { token });
            localStorage.setItem('token', res.data.token);
            await loadUser();
            return true;
        } catch (err) {
            console.error('Google Login error:', err.response?.data || err.message);
            return false;
        }
    }, [loadUser]);

    const value = useMemo(() => ({
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        googleLogin
    }), [user, isAuthenticated, loading, login, register, logout, googleLogin]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};