import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/notifications`, {
        params: { page: currentPage, filter }
      });
      
      setNotifications(response.data.notifications || []);
      setTotalPages(response.data.totalPages || 1);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications.');
      setLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`${CONFIG.API_BASE_URL}/notifications/${id}/read`);
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${CONFIG.API_BASE_URL}/notifications/read-all`);
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      await axios.delete(`${CONFIG.API_BASE_URL}/notifications/${id}`);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Failed to delete notification');
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const exportCSV = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/notifications`, {
        params: { limit: 10000, filter } // Fetch all matching current filter
      });
      
      const data = response.data.notifications || [];
      if (data.length === 0) {
        alert("No notifications to export.");
        return;
      }

      const headers = ["ID", "Message", "Type", "Read", "Date"];
      const csvContent = [
        headers.join(","),
        ...data.map(n => {
          const date = new Date(n.createdAt).toLocaleString().replace(/,/g, '');
          const message = `"${(n.message || '').replace(/"/g, '""')}"`;
          return [n.id, message, n.type, n.read ? "Yes" : "No", date].join(",");
        })
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `notifications_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export notifications.');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    return true;
  });

  if (loading && notifications.length === 0) return <div className="p-10 text-center">Loading notifications...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-[#0B1C3E]">Admin Notifications</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-white text-[#0B1C3E] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('unread')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === 'unread' 
                  ? 'bg-white text-[#0B1C3E] shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Unread
            </button>
          </div>

          <button 
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Export CSV
          </button>

          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="bg-[#0B1C3E] text-white px-4 py-2 rounded hover:bg-[#1a2f55] transition-colors text-sm font-medium"
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications found.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <li key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                        notification.type === 'BOOKING_CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.type ? notification.type.replace(/_/g, ' ') : 'Notification'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{notification.message}</p>
                  </div>
                  
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                    >
                      Mark as Read
                    </button>
                  )}
                  {notification.read && (
                    <span className="ml-4 text-sm text-gray-400 whitespace-nowrap">Read</span>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification.id)}
                    className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600 font-medium flex items-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-[#0B1C3E] text-white rounded-md disabled:opacity-50 hover:bg-[#1a2f55] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;