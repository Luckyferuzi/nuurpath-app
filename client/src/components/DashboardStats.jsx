import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const DashboardStats = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBookings: 0,
        totalRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${CONFIG.API_BASE_URL}/admin/stats`);
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="animate-pulse h-24 bg-gray-200 rounded-lg mb-6"></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</div>
                <div className="text-3xl font-black text-[#0B1C3E]">
                    ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Bookings</div>
                <div className="text-3xl font-black text-[#0B1C3E]">
                    {stats.totalBookings}
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Users</div>
                <div className="text-3xl font-black text-[#0B1C3E]">
                    {stats.totalUsers}
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;