import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import io from 'socket.io-client';

const ChatComponent = () => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Connect to Socket.IO server
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        // Join with user ID
        if (user?._id) {
            newSocket.emit('join', user._id);
        }

        // Listen for incoming messages
        newSocket.on('chatMessage', (data) => {
            setMessages(prev => [...prev, {
                senderId: data.senderId,
                message: data.message,
                timestamp: data.timestamp,
                received: true,
            }]);
        });

        // Listen for message sent confirmation
        newSocket.on('messageSent', (data) => {
            setMessages(prev => [...prev, {
                senderId: user._id,
                message: data.message,
                timestamp: data.timestamp,
                delivered: data.delivered,
            }]);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user?._id]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/profile/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Filter out current user
            setUsers(response.data.filter(u => u._id !== user._id));
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedUser) return;

        if (socket) {
            socket.emit('chatMessage', {
                senderId: user._id,
                receiverId: selectedUser._id,
                message: messageInput,
            });
        }

        setMessageInput('');
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen && users.length === 0) {
            fetchUsers();
        }
    };

    return (
        <div className="position-fixed bottom-0 end-0 m-3">
            <div className="position-relative">
                {!isOpen ? (
                    <button
                        className="btn btn-primary rounded-circle"
                        style={{ width: '60px', height: '60px' }}
                        onClick={toggleChat}
                    >
                        <i className="bi bi-chat-dots"></i>
                    </button>
                ) : (
                    <div className="card" style={{ width: '350px' }}>
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Chat</h6>
                            <button className="btn btn-sm btn-close btn-close-white" onClick={toggleChat}></button>
                        </div>
                        <div className="card-body" style={{ height: '400px', overflow: 'hidden' }}>
                            <div className="d-flex" style={{ height: '100%' }}>
                                <div className="flex-grow-1 d-flex flex-column">
                                    {selectedUser ? (
                                        <>
                                            <div className="border-bottom pb-2 mb-2">
                                                <div className="d-flex align-items-center">
                                                    <button
                                                        className="btn btn-sm btn-outline-secondary me-2"
                                                        onClick={() => setSelectedUser(null)}
                                                        aria-label="Back to user list"
                                                    >
                                                        <i className="bi bi-arrow-left me-1"></i> Back
                                                    </button>
                                                    <h6 className="mb-0">{selectedUser.name}</h6>
                                                </div>
                                            </div>

                                            <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '300px' }}>
                                                {messages
                                                    .filter(m => m.senderId === selectedUser._id || m.senderId === user._id)
                                                    .map((message, index) => (
                                                        <div
                                                            key={index}
                                                            className={`mb-2 ${message.senderId === user._id ? 'text-end' : 'text-start'}`}
                                                        >
                                                            <div
                                                                className={`d-inline-block p-2 rounded ${message.senderId === user._id ? 'bg-primary text-white' : 'bg-light border'}`}
                                                                style={{ maxWidth: '80%' }}
                                                            >
                                                                <small>{message.message}</small>
                                                                <div className="text-muted small">
                                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                                    {message.delivered && <span className="ms-2">✓</span>}
                                                                    {message.received && <span className="ms-2">✓✓</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                <div ref={messagesEndRef} />
                                            </div>

                                            <form onSubmit={handleSendMessage} className="mt-2">
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Type a message..."
                                                        value={messageInput}
                                                        onChange={(e) => setMessageInput(e.target.value)}
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={!messageInput.trim()}
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            </form>
                                        </>
                                    ) : (
                                        <div className="overflow-auto" style={{ height: '350px' }}>
                                            <h6 className="mb-3">Users</h6>
                                            {users.length === 0 ? (
                                                <div className="text-center py-4">
                                                    <button
                                                        className="btn btn-outline-primary"
                                                        onClick={fetchUsers}
                                                    >
                                                        Load Users
                                                    </button>
                                                </div>
                                            ) : (
                                                <ul className="list-group list-group-flush">
                                                    {users.map((userItem) => (
                                                        <li
                                                            key={userItem._id}
                                                            className="list-group-item list-group-item-action"
                                                            onClick={() => setSelectedUser(userItem)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                <div className="me-2">
                                                                    {userItem.profile?.profilePicture ? (
                                                                        <img
                                                                            src={userItem.profile.profilePicture}
                                                                            alt={userItem.name}
                                                                            className="rounded-circle"
                                                                            style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                                        />
                                                                    ) : (
                                                                        <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center"
                                                                             style={{ width: '30px', height: '30px' }}>
                                                                            <span className="text-white small">{userItem.name.charAt(0).toUpperCase()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="fw-bold">{userItem.name}</div>
                                                                    <div className="small text-muted">{userItem.role}</div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatComponent;
