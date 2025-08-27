import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import your AuthContext

/**
 * @function PrivateRoute
 * @description A component that protects routes, ensuring only authenticated users can access them.
 * If the user is not authenticated, they are redirected to the login page.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components (the protected route content).
 * @returns {React.ReactNode} The protected route content if authenticated, or a Redirect component.
 */
const PrivateRoute = ({ children }) => {
    // Access authentication state from the AuthContext
    const { isAuthenticated, loading } = useAuth();

    // While authentication status is being checked, show a loading indicator
    if (loading) {
        return <div className="text-center p-4 text-gray-700">Loading user data...</div>; // Or a more sophisticated spinner
    }

    // If the user is authenticated, render the child components (the protected route)
    if (isAuthenticated) {
        return children;
    }

    // If the user is NOT authenticated, redirect them to the login page
    return <Navigate to="/login" replace />;
};

export default PrivateRoute;
