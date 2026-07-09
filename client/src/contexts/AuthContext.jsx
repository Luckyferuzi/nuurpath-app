import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api, { getStoredAuthToken, setApiAuthFailureHandler } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const clearStoredTokens = useCallback(() => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
    }, []);

    const storeToken = useCallback((token, rememberMe = true) => {
        clearStoredTokens();

        if (rememberMe) {
            localStorage.setItem('token', token);
            return;
        }

        sessionStorage.setItem('token', token);
    }, [clearStoredTokens]);

    const logout = useCallback(() => {
        clearStoredTokens();
        setUser(null);
        setIsAuthenticated(false);
    }, [clearStoredTokens]);

    useEffect(() => {
        setApiAuthFailureHandler((error) => {
            if (error?.response?.status === 401) {
                logout();
            }
        });

        return () => {
            setApiAuthFailureHandler(null);
        };
    }, [logout]);

    const loadUser = useCallback(async () => {
        const token = getStoredAuthToken();
        if (!token) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return null;
        }

        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
            setIsAuthenticated(true);
            return res.data;
        } catch (err) {
            console.error('Load user error:', err.response?.data || err.message);
            if (err.response?.status === 401) {
                logout();
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const finalizeLogin = useCallback(async (token, rememberMe = true) => {
        storeToken(token, rememberMe);
        const currentUser = await loadUser();

        if (!currentUser) {
            logout();
            return {
                success: false,
                error: 'We could not load your account after sign-in. Please try again.',
            };
        }

        return {
            success: true,
            user: currentUser,
        };
    }, [loadUser, logout, storeToken]);

    const login = useCallback(async (email, password, rememberMe = true) => {
        try {
            const res = await api.post('/auth/login', { email, password, rememberMe });
            return await finalizeLogin(res.data.token, rememberMe);
        } catch (err) {
            if (err.code === 'ERR_NETWORK') {
                console.error('Login error: Server is unreachable. Please check if the backend is running.');
            } else {
                const errorData = err.response?.data;
                console.error('Login error:', errorData || err.message);
            }
            return {
                success: false,
                error: err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Login failed. Please check your credentials.',
                redirectTo: err.response?.data?.redirectTo || '',
            };
        }
    }, [finalizeLogin]);

    const staffLogin = useCallback(async (email, password, rememberMe = true) => {
        try {
            const res = await api.post('/auth/staff/login', { email, password, rememberMe });
            return await finalizeLogin(res.data.token, rememberMe);
        } catch (err) {
            const errorData = err.response?.data;
            console.error('Staff login error:', errorData || err.message);
            return {
                success: false,
                error: err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Staff sign-in failed. Please check your credentials.',
                redirectTo: err.response?.data?.redirectTo || '',
            };
        }
    }, [finalizeLogin]);

    const register = useCallback(async (name, email, password) => {
        try {
            const res = await api.post('/auth/register', { name, email, password });
            if (res.data.token) {
                return await finalizeLogin(res.data.token, true);
            }
            return {
                success: true,
                message: res.data.msg || 'Registration successful! You can log in now.',
                emailNotice: res.data.emailNotice || '',
            };
        } catch (err) {
            console.error('Register error:', err.response?.data || err.message);
            return { success: false, error: err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || err.message };
        }
    }, [finalizeLogin]);

    const adminSetup = useCallback(async ({
        name,
        email,
        password,
        setupToken,
        rememberMe = true,
    }) => {
        try {
            const res = await api.post('/auth/admin-setup/register', {
                name,
                email,
                password,
                setupToken,
                rememberMe,
            });

            if (res.data.token) {
                const loginResult = await finalizeLogin(res.data.token, rememberMe);
                if (loginResult.success) {
                    return {
                        ...loginResult,
                        message: res.data.msg || 'Admin setup complete.',
                    };
                }

                return loginResult;
            }

            return {
                success: true,
                message: res.data.msg || 'Admin setup complete.',
            };
        } catch (err) {
            console.error('Admin setup error:', err.response?.data || err.message);
            return {
                success: false,
                error: err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || err.message,
            };
        }
    }, [finalizeLogin]);

    const googleLogin = useCallback(async (token) => {
        if (!token) {
            return {
                success: false,
                error: 'Google sign-in did not return a credential. Please try again.',
            };
        }

        try {
            const res = await api.post('/auth/google', { token });
            return await finalizeLogin(res.data.token, true);
        } catch (err) {
            console.error('Google Login error:', err.response?.data || err.message);
            return {
                success: false,
                error: err.response?.data?.msg || 'Google sign-in failed. Please try again.',
            };
        }
    }, [finalizeLogin]);

    const value = useMemo(() => ({
        user,
        isAuthenticated,
        loading,
        login,
        staffLogin,
        register,
        adminSetup,
        logout,
        googleLogin
    }), [user, isAuthenticated, loading, login, staffLogin, register, adminSetup, logout, googleLogin]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
