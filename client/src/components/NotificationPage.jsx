import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();

    // Socket.IO Connection
    const token = localStorage.getItem('token');
    let socket = null;

    if (token) {
        const socketUrl = CONFIG.API_BASE_URL.replace('/api', '');
        socket = io(socketUrl);

        // Fetch user details to register socket
        axios.get(`${CONFIG.API_BASE_URL}/auth/me`, {
            headers: { 'x-auth-token': token }
        }).then(res => {
            const user = res.data;
            socket.emit("register_user", { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            }); // Register user with socket
            setError(null); // Clear any previous errors

        }).catch(err => console.error("Socket auth error:", err));

        // Listen for real-time notifications
        socket.on("receive_notification", (newNotification) => {
            setNotifications(prev => [newNotification, ...prev]);
        });
    }

    return () => {
        if (socket) socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/notifications`);
      
      const data = response.data.notifications || (Array.isArray(response.data) ? response.data : []);
      setNotifications(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load notifications.'); // User-facing error
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications.');
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${CONFIG.API_BASE_URL}/notifications/${id}/read`);
      setError(null); // Clear any previous errors
      setNotifications(prev => prev.map(n => 
        (n.id === id || n._id === id) ? { ...n, read: true } : n
      ));
    } catch (err) {
      setError('Failed to mark notification as read.'); // User-facing error
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${CONFIG.API_BASE_URL}/notifications/read-all`);
      setError(null); // Clear any previous errors
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      setError('Failed to mark all notifications as read.'); // User-facing error
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    try {
      setError(null); // Clear any previous errors
      await axios.delete(`${CONFIG.API_BASE_URL}/notifications/${id}`);
      setNotifications(prev => prev.filter(n => (n.id !== id && n._id !== id)));
    } catch (err) {
      setError('Failed to delete notification.'); // User-facing error
      console.error('Error deleting notification:', err);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading notifications...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[#0B1C3E]">Notifications</h2>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllAsRead} className="text-sm text-[#0B1C3E] hover:text-[#D4AF37] font-medium underline">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">You have no notifications.</p>
          <Link to="/dashboard" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id || notification._id} className={`bg-white border rounded-lg p-5 transition-all flex justify-between items-start ${notification.read ? 'border-gray-200' : 'border-l-4 border-l-[#D4AF37] border-gray-200 shadow-sm bg-blue-50/30'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notification.type === 'PRICE_DROP' ? 'bg-green-100 text-green-800' : notification.type === 'BOOKING_UPDATE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {notification.type ? notification.type.replace('_', ' ') : 'Alert'}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className={`text-gray-800 ${!notification.read ? 'font-medium' : ''}`}>{notification.message || notification.content}</p>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                {!notification.read && (
                  <button onClick={() => markAsRead(notification.id || notification._id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap text-right">Mark as read</button>
                )}
                <button onClick={() => deleteNotification(notification.id || notification._id)} className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap text-right">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPage;