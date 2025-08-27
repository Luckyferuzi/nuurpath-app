import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css'; // Add some basic styling

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/'); // Redirect to the home page after logout
    };

    // Links for all users
    const commonLinks = (
        <>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/packages">Packages</Link></li>
        </>
    );

    // Links for authenticated users
    const authLinks = (
        <>
            <li><Link to="/dashboard">Dashboard</Link></li>
            {user && user.role === 'admin' && (
                <li><Link to="/admin">Admin</Link></li>
            )}
            <li><button onClick={handleLogout}>Logout</button></li>
        </>
    );

    // Links for guests (not logged in)
    const guestLinks = (
        <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
        </>
    );

    return (
        <nav className="navbar">
            <h1>
                <Link to="/">NuurPath Travels</Link>
            </h1>
            <ul>
                {commonLinks}
                {isAuthenticated ? authLinks : guestLinks}
            </ul>
        </nav>
    );
};

export default Navbar;