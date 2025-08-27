import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PackagesPage from './pages/PackagesPage';
import PackageDetailsPage from './pages/PackageDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute
import AdminRoute from './components/AdminRoute';     // Import AdminRoute

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/packages" element={<PackagesPage />} />
                <Route path="/packages/:id" element={<PackageDetailsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected Routes (requires any authenticated user) */}
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <UserDashboard />
                        </PrivateRoute>
                    }
                />
                {/* Add other private routes here, e.g., ProfileSettings, MyBookings */}
                {/* <Route
                    path="/my-bookings"
                    element={
                        <PrivateRoute>
                            <MyBookingsPage />
                        </PrivateRoute>
                    }
                /> */}

                {/* Admin-Only Protected Routes (requires authenticated user with 'admin' role) */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />
                {/* Add other admin-only routes here, e.g., AdminPackageManagement, AdminUserManagement */}
            </Routes>
        </Router>
    );
}

export default App;
