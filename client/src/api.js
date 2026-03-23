import axios from 'axios';
import { CONFIG } from './config';

// 1. Create the Axios Instance
const axiosInstance = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 2. Add the Interceptor (Attaches Token to every request)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Define the API Service Object
const apiService = {
    auth: {
        register: (data) => axiosInstance.post('/auth/register', data),
        login: (data) => axiosInstance.post('/auth/login', data),
        getMe: () => axiosInstance.get('/auth/me'),
        forgotPassword: (email) => axiosInstance.post('/auth/forgot-password', { email }),
        resetPassword: (token, password) => axiosInstance.post(`/auth/reset-password/${token}`, { password }),
    },
    packages: {
        getAll: (params) => axiosInstance.get('/packages', { params }),
        getById: (id) => axiosInstance.get(`/packages/${id}`),
        create: (data, config) => axiosInstance.post('/packages', data, config),
        update: (id, data, config) => axiosInstance.put(`/packages/${id}`, data, config),
        delete: (id) => axiosInstance.delete(`/packages/${id}`),
        uploadImage: (data) => axiosInstance.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
        reorderFeatured: (packageIds) => axiosInstance.post('/packages/reorder', { packageIds }),
    },
    bookings: {
        create: (data) => axiosInstance.post('/bookings', data),
        getMy: () => axiosInstance.get('/bookings/my-bookings'),
        getAll: () => axiosInstance.get('/bookings'), // Admin only
        updateStatus: (id, status) => axiosInstance.put(`/bookings/${id}`, { status }), // Admin only
    },
    appointments: {
        create: (data) => axiosInstance.post('/appointments', data),
        getMy: () => axiosInstance.get('/appointments/my-appointments'),
        getAll: () => axiosInstance.get('/appointments'), // Admin only
    },
    newsletter: {
        subscribe: (email) => axiosInstance.post('/newsletter/subscribe', { email }),
        getAll: (params) => axiosInstance.get('/newsletter', { params }), // Admin only
    }
};

// 4. Export it
export default apiService;