
//Users/issatende/Projects/nuurpath-travels/client/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const LoginPage = () => {
    const { login, error } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        const success = await login(form.email, form.password);
        if (success) navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <SEO title="Login" />
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-[#D4AF37]">
                <h2 className="text-3xl font-black text-[#0B1C3E] uppercase text-center mb-10">Client Access</h2>
                {error && <div className="text-red-500 text-sm font-bold text-center mb-4">{error}</div>}
                <form onSubmit={handleLogin} className="space-y-6">
                    <input type="email" required placeholder="Email" className="w-full p-4 bg-gray-100 rounded-2xl font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    <input type="password" required placeholder="Password" className="w-full p-4 bg-gray-100 rounded-2xl font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    <button type="submit" className="w-full py-5 bg-[#0B1C3E] text-white rounded-2xl font-black uppercase tracking-[3px] shadow-xl">Enter</button>
                    <p className="text-center text-[10px] font-bold uppercase mt-6"><Link to="/register" className="text-[#D4AF37]">Create Account</Link></p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
