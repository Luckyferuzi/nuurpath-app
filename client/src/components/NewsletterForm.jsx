import React, { useState } from 'react';
import axios from '../lib/api';

const NewsletterForm = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');
        try {
            await axios.post(`/newsletter/subscribe`, { email });
            setStatus('success');
            setMessage('Subscribed successfully!');
            setEmail('');
        } catch (err) {
            setStatus('error');
            setMessage('Failed to subscribe.');
        }
    };

    return (
        <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
            <div className="flex">
                <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Email" 
                    className="bg-white/5 border border-white/10 p-3 rounded-l-xl w-full text-xs text-white outline-none focus:border-[#D4AF37] transition-colors" 
                />
                <button 
                    type="submit" 
                    disabled={status === 'loading'} 
                    className="bg-[#D4AF37] text-[#0B1C3E] px-4 rounded-r-xl font-bold text-[10px] uppercase hover:bg-white transition-colors disabled:opacity-70"
                >
                    {status === 'loading' ? '...' : 'Join'}
                </button>
            </div>
            {message && (
                <p className={`text-[10px] ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                </p>
            )}
        </form>
    );
};

export default NewsletterForm;