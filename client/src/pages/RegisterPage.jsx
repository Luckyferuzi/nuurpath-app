//dev/null
 //Users/issatende/Projects/nuurpath-travels/client/src/pages/RegisterPage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const RegisterPage = () => {
    const { register, error } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await register(form.name, form.email, form.password);
        if (success) navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <SEO title="Register" />
            <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-[#D4AF37]">
                <h2 className="text-3xl font-black text-[#0B1C3E] uppercase text-center mb-10">Join NuurPath</h2>
                {error && <div className="text-red-500 text-sm font-bold text-center mb-4">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Full Name" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input type="email" placeholder="Email" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    <input type="password" placeholder="Password" required className="w-full p-4 bg-gray-100 rounded-2xl font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    <button type="submit" className="w-full py-5 bg-[#0B1C3E] text-white rounded-2xl font-black uppercase tracking-[3px] mt-4 shadow-xl">Create Account</button>
                    <p className="text-center text-[10px] font-bold uppercase mt-6"><Link to="/login" className="text-[#D4AF37]">Login Instead</Link></p>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
