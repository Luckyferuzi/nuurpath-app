import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PackagesPage from './pages/PackagesPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import BackendTest from './components/BackendTest';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
    return (
        <Router>
            <Navbar />
            <BackendTest />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/packages" element={<PackagesPage />} />

                {/* Protected Routes */}
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                {/* TODO: Add these routes when pages are created:
                    - /packages/:id (PackageDetailsPage)
                    - /login (LoginPage)
                    - /register (RegisterPage)
                */}
            </Routes>
        </Router>
    );
}

export default App;
