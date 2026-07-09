import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = () => {
    const auth = useAuth();
    const { user, isAuthenticated, loading } = auth || {};
    const role = String(user?.role || '').toLowerCase();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0B1C3E]"></div>
            </div>
        );
    }

    if (isAuthenticated && ['admin', 'manager'].includes(role)) {
        return <Navigate to="/admin" replace />;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
