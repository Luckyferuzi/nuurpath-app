import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
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
                } // Fixed: Missing closing brace
                // Fetch dashboard stats
                const statsResponse = await axios.get('http://localhost:5000/api/admin/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });


                setStats(statsResponse.data.stats);
                setUsers(statsResponse.data.recentUsers);
                setBookings(statsResponse.data.recentBookings);
                setLoading(false);
                setError(null); // Clear any previous errors on success
            } catch (err) {
                console.error('Error fetching admin data:', err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setError('Unauthorized access. Please log in again.');
                    logout(); // Assuming logout clears token and redirects
                    navigate('/login');
                } else {
                    setError(err.response?.data?.message || 'Failed to fetch admin data');
                }
                setLoading(false);
            }
        };
        fetchAdminData();
    }, [navigate, logout]); // Added logout to dependency array


    const handleRoleChange = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/admin/users/${userId}/role`, { role: newRole }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }); // Fixed: Removed extra closing parenthesis

            // Refresh users data
            const response = await axios.get('http://localhost:5000/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            setUsers(response.data);
            setError(null); // Clear any previous errors on success
        } catch (err) {
            console.error('Error updating user role:', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Unauthorized to change role. Please log in again.');
                logout();
                navigate('/login');
            } else {
                setError(err.response?.data?.message || 'Failed to update user role');
            }
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Refresh users data
            const response = await axios.get('http://localhost:5000/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            setUsers(response.data);
            setError(null); // Clear any previous errors on success
        } catch (err) {
            console.error('Error deleting user:', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Unauthorized to delete user. Please log in again.');
                logout();
                navigate('/login');
            } else {
                setError(err.response?.data?.message || 'Failed to delete user');
            }
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/admin/bookings/${bookingId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Refresh bookings data
            const response = await axios.get('http://localhost:5000/api/admin/bookings', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            setBookings(response.data);
            setError(null); // Clear any previous errors on success
        } catch (err) {
            console.error('Error deleting booking:', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Unauthorized to delete booking. Please log in again.');
                logout();
                navigate('/login');
            } else {
                setError(err.response?.data?.message || 'Failed to delete booking');
            }
        }
    };

    if (loading) return <div className="container mt-5">Loading admin dashboard...</div>;
    if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;
    if (!stats) return <div className="container mt-5">No admin data found</div>;

    return (
        <div className="container mt-5">
            <div className="row mb-4">
                <div className="col-12">
                    <h2>Admin Dashboard</h2>
                    <p>Welcome, {user?.name} (Admin)</p>
                </div> {/* Fixed: Missing closing div tag */}
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
                                onClick={() => setActiveTab('stats')}
                            >
                                Dashboard Stats
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                User Management
                            </button>

                        </li> {/* Fixed: Missing closing li tag */}
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('bookings')}
                            >
                                Booking Management
                            </button>
                        </li>
                    </ul>
                </div>
            </div> {/* Fixed: Missing closing div tag */}

            {activeTab === 'stats' && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white">
                            <div className="card-body">
                                <h5 className="card-title">Total Users</h5>
                                <p className="card-text h3">{stats.users}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white">
                            <div className="card-body">
                                <h5 className="card-title">Total Bookings</h5>
                                <p className="card-text h3">{stats.bookings}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white">
                            <div className="card-body">
                                <h5 className="card-title">Travel Packages</h5>
                                <p className="card-text h3">{stats.packages}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-warning text-white">
                            <div className="card-body">
                                <h5 className="card-title">Reviews</h5>
                                <p className="card-text h3">{stats.reviews}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h4>User Management</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Joined</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user._id}>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td>
                                                        <select
                                                            className="form-select"
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td>{new Date(user.date).toLocaleDateString()}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDeleteUser(user._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'bookings' && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-primary text-white">
                                <h4>Booking Management</h4>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Package</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookings.map((booking) => (
                                                <tr key={booking._id}>
                                                    <td>{booking.user?.name || 'N/A'}</td>
                                                    <td>{booking.package?.title || 'N/A'}</td>
                                                    <td>{booking.status || 'Active'}</td>
                                                    <td>{new Date(booking.createdAt).toLocaleDateString()}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDeleteBooking(booking._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
