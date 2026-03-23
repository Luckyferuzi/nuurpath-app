import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';

const AdminNotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Fetch with limit=1 just to get the metadata (unreadCount)
      const response = await axios.get(`${CONFIG.API_BASE_URL}/notifications?limit=1`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.data.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      } else {
        // Fallback for array response
        setUnreadCount(Array.isArray(response.data) ? response.data.filter(n => !n.read).length : 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link 
      to="/admin/notifications" 
      style={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center',
        textDecoration: 'none',
        color: '#333',
        marginRight: '10px'
      }}
      title="View Notifications"
    >
      <i className="bi bi-bell" style={{ fontSize: '1.5rem' }}></i>
      
      {unreadCount > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          {unreadCount}
          <span className="visually-hidden">unread messages</span>
        </span>
      )}
    </Link>
  );
};

export default AdminNotificationBell;