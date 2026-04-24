import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('stats');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // If in mock mode, simulate data
                if (localStorage.getItem('token') === 'mock_token') {
                    setStats({
                        users: 124,
                        bookings: 45,
                        packages: 12,
                        reviews: 89
                    });
                    setUsers([
                        { _id: '1', name: 'John Doe', email: 'john@example.com', role: 'user', date: new Date() },
                        { _id: '2', name: 'Jane Admin', email: 'admin@nuurpath.com', role: 'admin', date: new Date() }
                    ]);
                    setBookings([
                        { _id: 'b1', user: { name: 'John Doe' }, package: { title: 'Premium Ramadan Umrah' }, status: 'Confirmed', createdAt: new Date() }
                    ]);
                    setLoading(false);
                    return;
                }

                const statsResponse = await axios.get('/api/admin/stats');
                setStats(statsResponse.data.stats);
                setUsers(statsResponse.data.recentUsers || []);
                setBookings(statsResponse.data.recentBookings || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching admin data:', err);
                setError(err.response?.data?.message || 'Failed to connect to admin services');
                setLoading(false);
            }
        };
        fetchAdminData();
    }, [navigate]);

    const handleRoleChange = async (userId, newRole) => {
        try {
            setError(null); // Clear previous errors
            await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user role.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            setError(null); // Clear previous errors
            await axios.delete(`/api/admin/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0c1b33] mx-auto mb-4"></div>
                <p className="font-black uppercase tracking-widest text-xs text-gray-400">Synchronizing Command Center...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen py-10 md:py-20 animate-fade-in">
            <div className="container mx-auto px-4">
                {/* Admin Header */}
                <div className="bg-[#0c1b33] p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl mb-8 border border-white/5 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-10 opacity-10 font-black text-8xl uppercase select-none pointer-events-none hidden md:block">Console</div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">Admin Command Center</h2>
                        <p className="text-yellow-500 font-bold uppercase tracking-[3px] text-[10px] mt-2">Welcome Back, {user?.name}</p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap gap-4 mt-10 relative z-10">
                        {['stats', 'users', 'bookings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    activeTab === tab 
                                    ? 'bg-yellow-500 text-[#0c1b33] shadow-lg scale-105' 
                                    : 'bg-white/5 hover:bg-white/10 text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold text-xs uppercase tracking-widest text-center">
                        ⚠️ {error}
                    </div>
                )}

                {/* Content Sections */}
                {activeTab === 'stats' && stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                        {[
                            { label: 'Total Users', val: stats.users, icon: '👥', color: 'bg-blue-500' },
                            { label: 'Total Bookings', val: stats.bookings, icon: '📅', color: 'bg-green-500' },
                            { label: 'Live Packages', val: stats.packages, icon: '📦', color: 'bg-purple-500' },
                            { label: 'Client Reviews', val: stats.reviews, icon: '⭐', color: 'bg-yellow-500' }
                        ].map((s, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className={`w-12 h-12 ${s.color} rounded-2xl flex items-center justify-center text-xl mb-6 shadow-lg`}>
                                    {s.icon}
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-1">{s.label}</h4>
                                <p className="text-3xl font-black text-[#0c1b33] tracking-tighter">{s.val}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="font-black uppercase tracking-tighter text-[#0c1b33] text-xl">User Database</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                                        <th className="p-6">Profile</th>
                                        <th className="p-6">Access Role</th>
                                        <th className="p-6">Joined Date</th>
                                        <th className="p-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-gray-600">
                                    {users.map((u) => (
                                        <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-black text-[#0c1b33]">
                                                        {u.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-[#0c1b33] font-bold">{u.name}</p>
                                                        <p className="text-[11px] text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <select 
                                                    value={u.role} 
                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                    className="bg-gray-100 border-none rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-yellow-500"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="p-6 text-[11px] uppercase font-bold text-gray-400">
                                                {new Date(u.date).toLocaleDateString()}
                                            </td>
                                            <td className="p-6">
                                                <button 
                                                    onClick={() => handleDeleteUser(u._id)}
                                                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="font-black uppercase tracking-tighter text-[#0c1b33] text-xl">Global Reservations</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-[2px] text-gray-400">
                                        <th className="p-6">Client</th>
                                        <th className="p-6">Experience Package</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-gray-600">
                                    {bookings.map((b) => (
                                        <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6 font-bold text-[#0c1b33]">{b.user?.name || 'Guest'}</td>
                                            <td className="p-6">
                                                <div className="text-[#0c1b33] font-bold">{b.package?.title}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    b.status === 'Confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                    {b.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-[11px] uppercase font-bold text-gray-400">
                                                {new Date(b.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
