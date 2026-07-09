import React from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({
    allowedRoles = ['admin', 'manager'],
    permissionTitle = 'Access Restricted',
    permissionMessage = '',
    fallbackPath = '/dashboard',
}) => {
    const auth = useAuth();
    const { user, isAuthenticated, loading } = auth || {};
    const role = String(user?.role || '').toLowerCase();
    const allowedRoleSet = new Set(allowedRoles.map((allowedRole) => String(allowedRole || '').toLowerCase()));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0B1C3E]"></div>
            </div>
        );
    }

    if (isAuthenticated && allowedRoleSet.has(role)) {
        return <Outlet />;
    }

    if (isAuthenticated) {
        if (permissionMessage) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                    <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
                        <h2 className="text-2xl font-bold text-[#0B1C3E] mb-3">{permissionTitle}</h2>
                        <p className="text-gray-600 mb-6">{permissionMessage}</p>
                        <Link
                            to={fallbackPath}
                            className="inline-flex items-center justify-center rounded-full bg-[#006837] px-6 py-3 text-white font-semibold hover:bg-[#00522b] transition-colors"
                        >
                            Return
                        </Link>
                    </div>
                </div>
            );
        }

        return <Navigate to={fallbackPath} replace />;
    }

    return <Navigate to="/login" replace />;
};

export default AdminRoute;
