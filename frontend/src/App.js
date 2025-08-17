import React from 'react';​
import { BrowserRouter as Router, Routes, Route } from

'react-router-dom';​
import Navbar from './components/Navbar';​
import HomePage from './pages/HomePage';​
import PackagesPage from './pages/PackagesPage';​
import PackageDetailsPage from './pages/PackageDetailsPage';​
import LoginPage from './pages/LoginPage';​
import RegisterPage from './pages/RegisterPage';​
import UserDashboard from './pages/UserDashboard';​
import AdminDashboard from './pages/AdminDashboard';​
import PrivateRoute from './components/PrivateRoute'; // For
protected routes​
import AdminRoute from './components/AdminRoute'; // For
admin-only routes​
​
function App() {​
    return (​
        <Router>​
        <Navbar />​
        <Routes>​
        <Route path="/" element={<HomePage />} />​
        <Route path="/packages" element={<PackagesPage />}
/>​
        <Route path="/packages/:id"
element={<PackageDetailsPage />} />​
        <Route path="/login" element={<LoginPage />} />​
        <Route path="/register" element={<RegisterPage />}
/>​
        <Route path="/dashboard"
element={<PrivateRoute><UserDashboard /></PrivateRoute>} />​
        <Route path="/admin"
element={<AdminRoute><AdminDashboard /></AdminRoute>} />​
                {/* Add other routes like booking, contact, etc.
*/}​
            </Routes>​
        </Router>​
    );​
}​
​
export default App;​
