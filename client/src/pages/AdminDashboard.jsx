import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    return (
        <div className="p-10 container mx-auto">
            <h1 className="text-3xl font-bold text-[#006837] mb-8">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/admin/package-bookings" className="p-8 bg-white border shadow-lg rounded-xl hover:shadow-2xl transition-all">
                    <h2 className="text-xl font-bold text-[#006837]">📦 Package Bookings</h2>
                    <p className="text-gray-500 mt-2">View and manage client bookings.</p>
                </Link>
                <Link to="/admin/consultations" className="p-8 bg-white border shadow-lg rounded-xl hover:shadow-2xl transition-all">
                    <h2 className="text-xl font-bold text-[#006837]">📅 Consultations</h2>
                    <p className="text-gray-500 mt-2">Manage private appointment requests.</p>
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboard; // <--- CRITICAL