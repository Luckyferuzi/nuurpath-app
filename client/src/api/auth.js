import axios from 'axios';

const API = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_API_URL || 'http://localhost:5001/api',
});

export const register = (userData) => API.post('/auth/register', userData);
export const login = (credentials) => API.post('/auth/login', credentials);
export const getMe = () => API.get('/auth/me'); // Requires token in headers
