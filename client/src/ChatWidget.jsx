import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios, { BACKEND_ORIGIN, getStoredAuthToken } from './lib/api';
import { buildWhatsAppUrl } from './lib/whatsapp';
import { useAuth } from './contexts/AuthContext';
import ChatAttachment from './components/ChatAttachment';

const ChatMessage = ({ msg, currentUser }) => {
    const isOwnMessage = msg.email === currentUser.email;
    const alignClass = isOwnMessage ? 'justify-end' : 'justify-start';
    const bubbleClass = isOwnMessage
        ? 'bg-[#0B1C3E] text-white rounded-br-none'
        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm';

    return (
        <div className={`mb-3 flex ${alignClass}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${bubbleClass}`}>
                {msg.message && msg.message.startsWith('/uploads/') ? (
                    <ChatAttachment path={msg.message} />
                ) : msg.message && msg.message.startsWith('/api/chat/files/') ? (
                    <ChatAttachment path={msg.message} />
                ) : (
                    <p>{msg.message}</p>
                )}
                <span className={`text-[10px] block mt-1 ${isOwnMessage ? 'text-gray-300' : 'text-gray-400'}`}>
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

const ChatWidget = () => {
    const auth = useAuth();
    const { user, isAuthenticated } = auth || {};
    const [isOpen, setIsOpen] = useState(false);
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [socketError, setSocketError] = useState('');
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const whatsappUrl = buildWhatsAppUrl('Hello NuurPath team, I would like support and would like to continue on WhatsApp.');

    useEffect(() => {
        if (!isAuthenticated || !user) {
            setSocket(null);
            setMessages([]);
            setSocketError('');
            return undefined;
        }

        const token = getStoredAuthToken();
        if (!token) {
            setSocketError('Live chat is unavailable right now. Please continue with us on WhatsApp.');
            return undefined;
        }

        const newSocket = io(BACKEND_ORIGIN, {
            auth: { token },
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setSocketError('');
            newSocket.emit('register_user');
            newSocket.emit('join_room');
        });

        newSocket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        newSocket.on('load_messages', (history) => {
            setMessages(Array.isArray(history) ? history : []);
        });

        newSocket.on('display_typing', () => {
            setIsTyping(true);
        });

        newSocket.on('hide_typing', () => {
            setIsTyping(false);
        });

        newSocket.on('chat_error', (data) => {
            setSocketError(data?.message || 'Live chat is unavailable right now. Please continue with us on WhatsApp.');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Chat socket connection error:', err.message);
            setSocketError('Live chat is unavailable right now. Please continue with us on WhatsApp.');
        });

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;

        socket.emit('send_message', { message });
        setMessage('');

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        socket.emit('stop_typing');
    };

    const handleInputChange = (e) => {
        setMessage(e.target.value);
        if (!socket) return;

        socket.emit('typing');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing');
        }, 2000);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !socket) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/chat/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { url } = response.data;
            socket.emit('send_message', { message: url });
        } catch (error) {
            console.error('File upload error:', error);
            setSocketError(error.response?.data?.message || 'Unable to upload that image right now. Please try again.');
        } finally {
            e.target.value = '';
        }
    };

    const renderMessages = () => messages.map((msg, index) => {
        const messageKey = `${msg.time || 'message'}-${index}`;
        return <ChatMessage key={messageKey} msg={msg} currentUser={user} />;
    });

    if (!isAuthenticated) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-lg shadow-2xl border border-gray-200 flex flex-col mb-4 overflow-hidden">
                    <div className="bg-[#0B1C3E] text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold">Support Chat</h3>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-300">
                            ×
                        </button>
                    </div>

                    {socketError ? (
                        <div className="flex-1 p-6 bg-gray-50 flex flex-col justify-center text-center">
                            <p className="text-sm text-gray-600 mb-4">{socketError}</p>
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
                            >
                                Continue on WhatsApp
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                                {renderMessages()}
                                {isTyping && <div className="text-xs text-gray-500 italic ml-2 mb-2">Support is typing...</div>}
                                <div ref={messagesEndRef} />
                            </div>

                            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-gray-500 hover:text-[#0B1C3E] p-1 transition-colors"
                                    title="Send Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={handleInputChange}
                                    placeholder="Type a message..."
                                    className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#0B1C3E] text-sm"
                                />
                                <button
                                    type="submit"
                                    className="bg-[#D4AF37] text-white p-2 rounded-md hover:bg-[#b5952f] transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-[#0B1C3E] text-white p-4 rounded-full shadow-lg hover:bg-[#1a2f55] transition-all transform hover:scale-105 flex items-center justify-center"
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
