import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const NotificationComponent = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get('http://localhost:5000/api/notifications', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                setNotifications(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching notifications:', err);
                setError('Failed to fetch notifications');
                setLoading(false);
            }
        };

        fetchNotifications();

        // Set up polling for new notifications
        const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, read: true } : n
                )
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/notifications/read-all', {}, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Update local state
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/notifications/${notificationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Update local state
            setNotifications(prev =>
                prev.filter(n => n._id !== notificationId)
            );
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete('http://localhost:5000/api/notifications/clear-all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            setNotifications([]);
        } catch (err) {
            console.error('Error clearing all notifications:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) return null;
    if (error) return null;

    return (
        <div className="position-relative me-3">
            <button
                className="btn btn-outline-secondary position-relative"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="position-absolute end-0 mt-2" style={{ width: '350px', zIndex: 1000 }}>
                    <div className="card">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Notifications</h6>
                            {notifications.length > 0 && (
                                <button
                                    className="btn btn-sm btn-outline-light"
                                    onClick={markAllAsRead}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-muted">No notifications</p>
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification._id}
                                            className={`list-group-item ${!notification.read ? 'bg-light' : ''}`}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <h6 className="mb-0">{notification.title}</h6>
                                                        {!notification.read && (
                                                            <span className="badge bg-primary ms-2">New</span>
                                                        )}
                                                    </div>
                                                    <p className="mb-1 small">{notification.message}</p>
                                                    <div className="small text-muted">
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="ms-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => deleteNotification(notification._id)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    className="btn btn-sm btn-link text-decoration-none"
                                                    onClick={() => markAsRead(notification._id)}
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="card-footer bg-light">
                                <button
                                    className="btn btn-danger btn-sm w-100"
                                    onClick={clearAllNotifications}
                                >
                                    Clear All Notifications
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationComponent;
