import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';
import AdminNotificationBell from './AdminNotificationBell';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ totalUsers: 0, activeBookings: 0, totalRevenue: 0, pendingConsultations: 0, trends: [], bookingDistribution: [] });
    const [loading, setLoading] = useState(true);

    const COLORS = ['#006837', '#D4AF37'];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`${CONFIG.API_BASE_URL}/admin/stats`);
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const containerStyle = {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    };

    const cardStyle = {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        textDecoration: 'none',
        color: 'inherit',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
    };

    const statCardStyle = {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
    };

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
                <AdminNotificationBell />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#006837', margin: '0 0 10px 0' }}>{loading ? '...' : `$${(stats.totalRevenue || 0).toLocaleString()}`}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Total Revenue</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.totalUsers}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Total Users</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.activeBookings}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Active Bookings</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.pendingConsultations}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Pending Consultations</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '40px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Booking Trends (Last 6 Months)</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Packages" stroke="#006837" strokeWidth={2} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="Flights" stroke="#D4AF37" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Revenue Trends</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                <Legend />
                                <Line type="monotone" dataKey="Revenue" stroke="#D4AF37" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Booking Distribution</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={stats.bookingDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {stats.bookingDistribution && stats.bookingDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={gridStyle}>
                <Link
                    to="/admin/consultations"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Private Consultations</h3>
                    <p style={{ color: '#555' }}>View and manage private call requests from users.</p>
                </Link>
                <Link
                    to="/admin/package-bookings"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Package Bookings</h3>
                    <p style={{ color: '#555' }}>View all customer package bookings.</p>
                </Link>
                <Link
                    to="/admin/flight-bookings"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Flight Bookings</h3>
                    <p style={{ color: '#555' }}>Manage flight reservation requests.</p>
                </Link>
                <Link
                    to="/admin/users"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Users</h3>
                    <p style={{ color: '#555' }}>View and manage registered users.</p>
                </Link>
                <Link
                    to="/admin/wishlists"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Wishlists</h3>
                    <p style={{ color: '#555' }}>View and manage user wishlist items.</p>
                </Link>
                <Link
                    to="/admin/services"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Services</h3>
                    <p style={{ color: '#555' }}>Update service offerings and descriptions.</p>
                </Link>
                <Link
                    to="/admin/packages"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Packages</h3>
                    <p style={{ color: '#555' }}>Add, edit, or remove travel packages.</p>
                </Link>
                <Link
                    to="/admin/reviews"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Reviews</h3>
                    <p style={{ color: '#555' }}>Moderate customer reviews and testimonials.</p>
                </Link>
                <Link
                    to="/admin/privacy"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Privacy Policy</h3>
                    <p style={{ color: '#555' }}>Edit Privacy Policy content.</p>
                </Link>
                <Link
                    to="/admin/terms"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Terms of Use</h3>
                    <p style={{ color: '#555' }}>Edit Terms of Use content.</p>
                </Link>
                <Link
                    to="/admin/notifications"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Notifications</h3>
                    <p style={{ color: '#555' }}>View system alerts and updates.</p>
                </Link>
                {/* You can add more admin links here in the future */}
            </div>
        </div>
    );
};

export default AdminDashboard;