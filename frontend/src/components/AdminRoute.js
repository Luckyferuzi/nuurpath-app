import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import your AuthContext

/**
 * @function AdminRoute
 * @description A component that protects routes, ensuring only authenticated users with 'admin' role can access them.
 * If the user is not an admin, they are redirected to the dashboard (or login if not authenticated).
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components (the protected route content).
 * @returns {React.ReactNode} The protected route content if admin, or a Redirect component.
 */
const AdminRoute = ({ children }) => {
    // Access authentication state and user details from the AuthContext
    const { isAuthenticated, user, loading } = useAuth();

    // While authentication status is being checked, show a loading indicator
    if (loading) {
        return <div className="text-center p-4 text-gray-700">Loading user data...</div>; // Or a more sophisticated spinner
    }

    // If the user is authenticated AND has the 'admin' role, render the child components
    if (isAuthenticated && user && user.role === 'admin') {
        return children;
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If authenticated but not an admin, redirect to the user dashboard
    // This prevents regular users from seeing an "access denied" page directly on an admin route
    return <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
