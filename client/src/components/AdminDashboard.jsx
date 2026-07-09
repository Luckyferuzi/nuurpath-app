import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        pipelineValue: 0,
        newRequests: 0,
        activeFollowUps: 0,
        completedRequests: 0,
        lostOrCancelled: 0,
        totalPackageRequests: 0,
        totalFlightRequests: 0,
        totalConsultations: 0,
        totalServiceInquiries: 0,
        trends: [],
        requestDistribution: [],
    });
    const [loading, setLoading] = useState(true);
    const role = String(user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';

    const COLORS = ['#006837', '#D4AF37', '#0B1C3E', '#5c7cfa'];

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/admin/stats');
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
        alignItems: 'center',
    };

    const summaryCardStyle = {
        backgroundColor: '#fff',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    };

    const summaryItems = [
        { label: 'Package Requests', value: stats.totalPackageRequests, color: '#006837' },
        { label: 'Flight Requests', value: stats.totalFlightRequests, color: '#D4AF37' },
        { label: 'Consultations', value: stats.totalConsultations, color: '#0B1C3E' },
        { label: 'Service Inquiries', value: stats.totalServiceInquiries, color: '#5c7cfa' },
        { label: 'Cancelled or Lost', value: stats.lostOrCancelled, color: '#dc3545' },
    ];

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>{isAdmin ? 'Operations Dashboard' : 'Lead Pipeline Dashboard'}</h2>
                    <p style={{ margin: '6px 0 0 0', color: '#666' }}>
                        Track customer requests, follow-ups, and offline confirmations from one operational pipeline.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#006837', margin: '0 0 10px 0' }}>{loading ? '...' : `$${(stats.pipelineValue || 0).toLocaleString()}`}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Pipeline Value</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.newRequests}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>New Requests</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.activeFollowUps}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Active Follow-Ups</p>
                </div>
                <div style={statCardStyle}>
                    <h3 style={{ fontSize: '36px', color: '#0B1C3E', margin: '0 0 10px 0' }}>{loading ? '...' : stats.completedRequests}</h3>
                    <p style={{ color: '#666', margin: 0, fontWeight: 'bold' }}>Confirmed Offline / Completed</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {summaryItems.map((item) => (
                    <div key={item.label} style={summaryCardStyle}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: item.color, marginTop: '8px' }}>{loading ? '...' : item.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '40px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Request Trends (Last 6 Months)</h3>
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
                                <Line type="monotone" dataKey="Consultations" stroke="#0B1C3E" strokeWidth={2} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="Services" stroke="#5c7cfa" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Pipeline Value Trends</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={stats.trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString()}`} />
                                <Legend />
                                <Line type="monotone" dataKey="PipelineValue" name="Pipeline Value" stroke="#D4AF37" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ color: '#0B1C3E', marginBottom: '20px' }}>Request Distribution</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={stats.requestDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {stats.requestDistribution && stats.requestDistribution.map((entry, index) => (
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
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Consultation Follow-Ups</h3>
                    <p style={{ color: '#555' }}>Review private consultation requests, notes, and next actions.</p>
                </Link>
                <Link
                    to="/admin/package-bookings"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Package Request Pipeline</h3>
                    <p style={{ color: '#555' }}>Move package leads from new inquiry to offline confirmation.</p>
                </Link>
                <Link
                    to="/admin/flight-bookings"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Flight Request Pipeline</h3>
                    <p style={{ color: '#555' }}>Track flight leads, quotes, and WhatsApp follow-up steps.</p>
                </Link>
                <Link
                    to="/admin/service-inquiries"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Service Inquiry Pipeline</h3>
                    <p style={{ color: '#555' }}>Manage visa, passport, and document support follow-ups.</p>
                </Link>
                {isAdmin && (
                    <Link
                        to="/admin/users"
                        style={cardStyle}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                    >
                        <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Users</h3>
                        <p style={{ color: '#555' }}>View users, update roles, and create manager accounts.</p>
                    </Link>
                )}
                {isAdmin && (
                    <Link
                        to="/admin/services"
                        style={cardStyle}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                    >
                        <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Services</h3>
                        <p style={{ color: '#555' }}>Update service offerings and descriptions.</p>
                    </Link>
                )}
                {isAdmin && (
                    <Link
                        to="/admin/packages"
                        style={cardStyle}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                    >
                        <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Packages</h3>
                        <p style={{ color: '#555' }}>Add, edit, or remove travel packages.</p>
                    </Link>
                )}
                <Link
                    to="/admin/reviews"
                    style={cardStyle}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = cardStyle.boxShadow; e.currentTarget.style.transform = 'none'; }}
                >
                    <h3 style={{ color: '#0056b3', marginBottom: '10px' }}>Manage Reviews</h3>
                    <p style={{ color: '#555' }}>Moderate customer reviews and testimonials.</p>
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboard;
