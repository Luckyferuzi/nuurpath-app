import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = () => {
    const auth = useAuth();
    const { user, isAuthenticated, loading } = auth || {};
    const role = String(user?.role || '').toLowerCase();
    const allowedRoles = new Set(['admin', 'manager']);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0B1C3E]"></div>
            </div>
        );
    }

    if (isAuthenticated && allowedRoles.has(role)) {
        return <Outlet />;
    }

    if (isAuthenticated) {
        // User is logged in but not an admin
        return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
};

export default AdminRoute;
