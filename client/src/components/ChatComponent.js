import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import { CONFIG } from '../config';

const ChatComponent = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const socketUrl = CONFIG.API_BASE_URL.replace('/api', '');
        const newSocket = io(socketUrl);
        setSocket(newSocket);

        if (user) {
            newSocket.emit("register_user", {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            });
        }

        newSocket.on("active_users", (users) => {
            // Deduplicate users by email and filter out the current admin
            const uniqueUsersMap = new Map();
            users.forEach(u => {
                if (u.email !== user?.email) {
                    uniqueUsersMap.set(u.email, u);
                }
            });
            setActiveUsers(Array.from(uniqueUsersMap.values()));
        });

        newSocket.on("receive_message", (data) => {
            // Only append message if it belongs to the currently selected chat
            if (selectedUser && data.room === selectedUser.email) {
                setMessages((prev) => [...prev, data]);
            }
        });

        newSocket.on("load_messages", (history) => {
            setMessages(history);
        });

        newSocket.on("display_typing", (data) => {
            if (selectedUser && data.room === selectedUser.email) {
                setIsTyping(true);
            }
        });

        newSocket.on("hide_typing", (data) => {
            if (selectedUser && data.room === selectedUser.email) {
                setIsTyping(false);
            }
        });

        return () => newSocket.disconnect();
    }, [user, selectedUser]);

    useEffect(() => {
        if (socket && selectedUser) {
            // Join the user's room (which is their email)
            socket.emit("join_room", selectedUser.email);
        }
    }, [selectedUser, socket]);

    useEffect(() => {
        setIsTyping(false);
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket || !selectedUser) return;

        const msgData = {
            room: selectedUser.email,
            author: user.name,
            email: user.email,
            message: message,
            time: new Date().toISOString(),
        };

        socket.emit("send_message", msgData);
        setMessages((prev) => [...prev, msgData]);
        setMessage("");
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit("stop_typing", { room: selectedUser.email });
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        if (!socket || !selectedUser) return;

        socket.emit("typing", { room: selectedUser.email });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", { room: selectedUser.email });
        }, 2000);
    };

    const handleResolve = () => {
        if (!socket || !selectedUser) return;
        if (window.confirm("Are you sure you want to mark this chat as resolved?")) {
            socket.emit("resolve_chat", { room: selectedUser.email });
        }
    };

    const filteredUsers = activeUsers.filter(u => 
        (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-100">
            {/* Sidebar - Active Users */}
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
                    {filteredUsers.map((u, idx) => (
                        <li
                            key={idx}
                            onClick={() => setSelectedUser(u)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${selectedUser?.email === u.email ? 'bg-blue-50' : ''}`}
                        >
                            <div className="font-bold text-[#0B1C3E]">{u.name || 'Guest'}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                        </li>
                    ))}
                    {filteredUsers.length === 0 && (
                        <li className="p-4 text-gray-500 text-center text-sm">No users found</li>
                    )}
                </ul>
            </div>

            {/* Chat Area */}
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

                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                            {messages.map((msg, idx) => (
                                msg.author === 'System' ? (
                                    <div key={idx} className="flex justify-center my-4"><span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-bold">{msg.message}</span></div>
                                ) : (
                                <div key={idx} className={`mb-4 flex ${msg.email === user.email ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-xl shadow-sm text-sm ${msg.email === user.email ? 'bg-[#0B1C3E] text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                        <div className="text-xs opacity-70 mb-1 font-bold">{msg.author}</div>
                                        {msg.message && msg.message.startsWith('/uploads/') ? (
                                            <img 
                                                src={`${CONFIG.API_BASE_URL.replace('/api', '')}${msg.message}`} 
                                                alt="Shared attachment" 
                                                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-1"
                                                onClick={() => window.open(`${CONFIG.API_BASE_URL.replace('/api', '')}${msg.message}`, '_blank')}
                                            />
                                        ) : (
                                            <p>{msg.message}</p>
                                        )}
                                        <span className={`text-[10px] block mt-1 text-right opacity-70`}>{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-xl">Select a user to start chatting</div>
                )}
            </div>
        </div>
    );
};

export default ChatComponent;