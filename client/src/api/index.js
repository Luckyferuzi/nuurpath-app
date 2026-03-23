
import axios from 'axios';


// Note: baseURL and auth headers are configured globally in App.jsx
// This service reuses that configuration.

const api = {
    // Auth
    auth: {
        register: (data) => axios.post('/api/auth/register', data),
        login: (data) => axios.post('/api/auth/login', data),
        getMe: () => axios.get('/api/auth/me'),
        forgotPassword: (email) => axios.post('/api/auth/forgot-password', { email }),
        resetPassword: (token, password) => axios.post(`/api/auth/reset-password/${token}`, { password }),
    },

    // User Profile
    profile: {
        get: () => axios.get('/api/profile'),
        update: (data) => axios.put('/api/profile', data),
        getUserProfile: (userId) => axios.get(`/api/profile/${userId}`),
    },

    // Packages
    packages: {
        getAll: (params) => axios.get('/api/packages', { params }),
        getById: (id) => axios.get(`/api/packages/${id}`),
        create: (data, config) => axios.post('/api/packages', data, config),
        update: (id, data, config) => axios.put(`/api/packages/${id}`, data, config),
        delete: (id) => axios.delete(`/api/packages/${id}`),
        reorderFeatured: (packageIds) => axios.put('/api/packages/reorder-featured', { packageIds }),
        uploadImage: (formData) => axios.post('/api/packages/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    },

    // Bookings (Packages)
    bookings: {
        create: (data) => axios.post('/api/bookings', data),
        getMy: () => axios.get('/api/bookings'),
        getAll: () => axios.get('/api/bookings/all'), // Admin
        updateStatus: (id, status) => axios.put(`/api/bookings/${id}/status`, { status }), // Admin
    },

    // Flights
    flights: {
        create: (data) => axios.post('/api/flights', data),
        getMy: () => axios.get('/api/flights/me'),
        getById: (id) => axios.get(`/api/flights/${id}`),
        cancel: (id) => axios.delete(`/api/flights/${id}`),
        getAll: () => axios.get('/api/flights'), // Admin
        updateStatus: (id, status) => axios.put(`/api/flights/${id}/status`, { status }), // Admin
    },

    // Appointments
    appointments: {
        create: (data) => axios.post('/api/appointments', data),
        getMy: () => axios.get('/api/appointments/me'),
        cancel: (id) => axios.delete(`/api/appointments/${id}`),
        getAll: () => axios.get('/api/appointments'), // Admin
        updateStatus: (id, status) => axios.put(`/api/appointments/${id}/status`, { status }), // Admin
    },

    // Reviews
    reviews: {
        create: (data) => axios.post('/api/reviews', data),
        getByPackage: (packageId) => axios.get(`/api/reviews/${packageId}`),
        getByUser: (userId) => axios.get(`/api/reviews/user/${userId}`),
        update: (id, data) => axios.put(`/api/reviews/${id}`, data),
        delete: (id) => axios.delete(`/api/reviews/${id}`),
    },

    // Notifications
    notifications: {
        getAll: () => axios.get('/api/notifications'),
        getUnread: () => axios.get('/api/notifications/unread'),
        markRead: (id) => axios.put(`/api/notifications/${id}/read`),
        markAllRead: () => axios.put('/api/notifications/read-all'),
        delete: (id) => axios.delete(`/api/notifications/${id}`),
        clearAll: () => axios.delete('/api/notifications/clear-all'),
    },

    // Newsletter
    newsletter: {
        subscribe: (email) => axios.post('/api/newsletter/subscribe', { email }),
        getAll: (params) => axios.get('/api/newsletter', { params }),
    },

    // Admin Dashboard
    admin: {
        getStats: () => axios.get('/api/admin/stats'),
        getUsers: () => axios.get('/api/admin/users'),
        updateUserRole: (userId, role) => axios.put(`/api/admin/users/${userId}/role`, { role }),
        deleteUser: (userId) => axios.delete(`/api/admin/users/${userId}`),
        getAllBookings: () => axios.get('/api/admin/bookings'),
        deleteBooking: (bookingId) => axios.delete(`/api/admin/bookings/${bookingId}`),
    }
};

export default api;