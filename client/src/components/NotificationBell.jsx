import React, { useState, useEffect, useRef } from 'react';
import axios, { BACKEND_ORIGIN, getStoredAuthToken } from '../lib/api';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null); // Added error state
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = getStoredAuthToken();
            if (!token) return;

            const res = await axios.get('/notifications');

            const data = res.data.notifications || (Array.isArray(res.data) ? res.data : []);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (err) { // Error fetching notifications is logged, but not displayed in the bell itself.
            console.error("Error fetching notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds for updates
        const interval = setInterval(fetchNotifications, 60000);

        // Socket.IO Connection
        const token = getStoredAuthToken();
        let socket = null;

        if (token) {
            socket = io(BACKEND_ORIGIN, {
                auth: { token },
            });

            // Listen for real-time notifications
            socket.on("receive_notification", (newNotification) => {
                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });

            socket.on("connect_error", (err) => {
                console.error("Socket auth error:", err);
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) socket.disconnect();
        };
    }, []);

    const markAsRead = async (id) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => 
                n.id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            await axios.put(`/notifications/${id}/read`);
        } catch (err) {
            setError('Failed to mark notification as read.'); // Set user-facing error
            console.error("Error marking notification as read:", err); // Log for debugging
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-all duration-200 focus:outline-none ${isOpen ? 'bg-white text-[#0B1C3E]' : 'text-white hover:bg-white/10 hover:text-white'}`}
                aria-label="Notifications"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full border-2 border-white shadow-sm">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-2xl overflow-hidden z-50 border border-gray-100 ring-1 ring-black ring-opacity-5 transform origin-top-right transition-all duration-200 ease-out">
                    <div className="py-2">
                        <div className="px-4 py-3 text-sm font-bold text-gray-800 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-xs font-normal text-[#0B1C3E] bg-blue-50 px-2 py-0.5 rounded-full">
                                    {unreadCount} New
                                </span>
                            )}
                            {error && ( // Display error message
                                <span className="text-xs font-normal text-red-500">{error}</span>
                            )}
                        </div>
                        <div className="max-h-[20rem] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p>No new notifications</p>
                                </div>
                            ) : (
                                notifications.slice(0, 5).map((notification) => (
                                    <div 
                                        key={notification.id}
                                        className={`group px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer relative ${!notification.read ? 'bg-blue-50/60' : ''}`}
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-[#0B1C3E]' : 'bg-transparent'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                                    {notification.message || notification.content}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="border-t border-gray-100 bg-gray-50 p-2 text-center">
                            <Link 
                                to="/dashboard?tab=notifications" 
                                className="block w-full py-2 text-xs font-medium text-gray-600 hover:text-[#0B1C3E] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm" 
                                onClick={() => setIsOpen(false)}
                            >
                                View All Notifications
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
