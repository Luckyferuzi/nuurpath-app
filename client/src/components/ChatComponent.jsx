import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { BACKEND_ORIGIN, getStoredAuthToken } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ChatAttachment from './ChatAttachment';

const ChatComponent = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [socketError, setSocketError] = useState('');
    const selectedUserRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        const token = getStoredAuthToken();
        if (!token) {
            setSocketError('Admin chat is unavailable because your session is missing. Please sign in again.');
            return undefined;
        }

        const newSocket = io(BACKEND_ORIGIN, {
            auth: { token },
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setSocketError('');
            newSocket.emit('register_user');
        });

        newSocket.on('active_users', (users) => {
            const uniqueUsersMap = new Map();
            (Array.isArray(users) ? users : []).forEach((connectedUser) => {
                if (connectedUser?.userId !== user?.id) {
                    uniqueUsersMap.set(connectedUser.userId, connectedUser);
                }
            });
            setActiveUsers(Array.from(uniqueUsersMap.values()));
        });

        newSocket.on('receive_message', (data) => {
            if (selectedUserRef.current && data.room === selectedUserRef.current.roomKey) {
                setMessages((prev) => [...prev, data]);
            }
        });

        newSocket.on('load_messages', (history) => {
            setMessages(Array.isArray(history) ? history : []);
        });

        newSocket.on('display_typing', (data) => {
            if (selectedUserRef.current && data.room === selectedUserRef.current.roomKey) {
                setIsTyping(true);
            }
        });

        newSocket.on('hide_typing', (data) => {
            if (selectedUserRef.current && data.room === selectedUserRef.current.roomKey) {
                setIsTyping(false);
            }
        });

        newSocket.on('chat_error', (data) => {
            setSocketError(data?.message || 'Admin chat is unavailable right now.');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Admin chat socket error:', err.message);
            setSocketError('Admin chat is unavailable right now. Please refresh and try again.');
        });

        return () => newSocket.disconnect();
    }, [user]);

    useEffect(() => {
        if (socket && selectedUser?.userId) {
            socket.emit('join_room', { targetUserId: selectedUser.userId });
        }
    }, [selectedUser, socket]);

    useEffect(() => {
        setIsTyping(false);
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket || !selectedUser) return;

        socket.emit('send_message', {
            targetUserId: selectedUser.userId,
            message,
        });
        setMessage('');

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stop_typing', { targetUserId: selectedUser.userId });
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        if (!socket || !selectedUser) return;

        socket.emit('typing', { targetUserId: selectedUser.userId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { targetUserId: selectedUser.userId });
        }, 2000);
    };

    const handleResolve = () => {
        if (!socket || !selectedUser) return;
        if (window.confirm('Are you sure you want to mark this chat as resolved?')) {
            socket.emit('resolve_chat', { targetUserId: selectedUser.userId });
        }
    };

    const filteredUsers = activeUsers.filter((connectedUser) =>
        (connectedUser.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        || (connectedUser.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-100">
            <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 bg-[#0B1C3E] text-white">
                    <h2 className="font-bold text-lg">Active Chats</h2>
                </div>
                <div className="p-2 border-b border-gray-200">
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#0B1C3E]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <ul>
                    {filteredUsers.map((connectedUser) => (
                        <li
                            key={connectedUser.userId}
                            onClick={() => setSelectedUser(connectedUser)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${selectedUser?.userId === connectedUser.userId ? 'bg-blue-50' : ''}`}
                        >
                            <div className="font-bold text-[#0B1C3E]">{connectedUser.name || 'Customer'}</div>
                            <div className="text-xs text-gray-500">{connectedUser.email}</div>
                        </li>
                    ))}
                    {filteredUsers.length === 0 && (
                        <li className="p-4 text-gray-500 text-center text-sm">No active chat users found</li>
                    )}
                </ul>
            </div>

            <div className="flex-1 flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-xl text-[#0B1C3E]">{selectedUser.name}</h3>
                                <span className="text-sm text-gray-500">{selectedUser.email}</span>
                            </div>
                            <button
                                onClick={handleResolve}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700 transition-colors"
                            >
                                Mark Resolved
                            </button>
                        </div>

                        {socketError && (
                            <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
                                {socketError}
                            </div>
                        )}

                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                            {messages.map((msg, idx) => (
                                msg.author === 'System' ? (
                                    <div key={`${msg.time || 'system'}-${idx}`} className="flex justify-center my-4">
                                        <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-bold">{msg.message}</span>
                                    </div>
                                ) : (
                                    <div key={`${msg.time || 'message'}-${idx}`} className={`mb-4 flex ${msg.email === user.email ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3 rounded-xl shadow-sm text-sm ${msg.email === user.email ? 'bg-[#0B1C3E] text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                            <div className="text-xs opacity-70 mb-1 font-bold">{msg.author}</div>
                                            {msg.message && msg.message.startsWith('/uploads/') ? (
                                                <div className="mt-1">
                                                    <ChatAttachment path={msg.message} />
                                                </div>
                                            ) : msg.message && msg.message.startsWith('/api/chat/files/') ? (
                                                <div className="mt-1">
                                                    <ChatAttachment path={msg.message} />
                                                </div>
                                            ) : (
                                                <p>{msg.message}</p>
                                            )}
                                            <span className="text-[10px] block mt-1 text-right opacity-70">{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                )
                            ))}
                            {isTyping && <div className="text-xs text-gray-500 italic ml-2 mb-2">User is typing...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-4">
                            <input type="text" value={message} onChange={handleInputChange} placeholder="Type a reply..." className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0B1C3E]" />
                            <button type="submit" className="bg-[#D4AF37] text-[#0B1C3E] px-6 py-3 rounded-lg font-bold hover:bg-[#b5952f] transition-colors">Send</button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-xl">
                        {socketError || 'Select a user to start chatting'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatComponent;
