import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import api from '../api';

// --- Login Page ---
export const LoginPage = () => {
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

// --- Register Page ---
export const RegisterPage = () => {
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

// --- User Dashboard ---
export const UserDashboard = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    
    useEffect(() => {
        const fetchBookings = async () => {
            try {
               const { data } = await api.bookings.getMy();
               setBookings(data);
            } catch (error) { console.error(error); }
        };
        if(user) fetchBookings();
    }, [user]);

    return (
        <div className="bg-gray-50 min-h-screen py-20">
            <SEO title="My Dashboard" />
            <div className="container mx-auto px-4">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl mb-12 border border-gray-100">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-[#0B1C3E]">My Dashboard</h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-1">Welcome, {user?.name}</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h3 className="text-2xl font-black uppercase text-[#0B1C3E] mb-6">My Bookings</h3>
                    {bookings.length === 0 ? <p>No bookings yet.</p> : (
                        <ul className="space-y-4">
                            {bookings.map(b => (
                                <li key={b.id} className="p-4 bg-gray-50 rounded-xl flex justify-between">
                                    <span className="font-bold">{b.Package?.title || 'Trip'}</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Packages Page ---
export const PackagesPage = () => {
    const [packages, setPackages] = useState([]);
    
    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.packages.getAll();
                setPackages(data.packages || data);
            } catch (err) {
                 console.error("Failed to load packages");
            }
        };
        fetch();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen py-24">
            <SEO title="Packages" />
            <div className="container mx-auto px-4">
                <h1 className="text-4xl font-black uppercase text-[#0B1C3E] mb-12">Available Packages</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {packages.map(pkg => (
                        <div key={pkg.id} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                            <div className="h-64 bg-gray-200 relative">
                                {pkg.images?.[0] && <img src={pkg.images[0]} alt={pkg.title} className="w-full h-full object-cover"/>}
                                <div className="absolute top-4 right-4 bg-white px-3 py-1 text-[10px] font-bold uppercase rounded-full">{pkg.type}</div>
                            </div>
                            <div className="p-8">
                                <h3 className="text-lg font-black uppercase text-[#0B1C3E] mb-2">{pkg.title}</h3>
                                <p className="text-gray-500 text-sm mb-4">{pkg.destination}</p>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xl">${pkg.price}</span>
                                    {/* Link to detail page if you have one, or simple alert */}
                                    <button className="px-4 py-2 bg-[#0B1C3E] text-white rounded-lg text-xs font-bold uppercase">View</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Contact Page ---
export const ContactPage = () => (
    <div className="bg-gray-50 min-h-screen py-24">
        <SEO title="Contact" />
        <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-white p-16 rounded-[3rem] shadow-2xl border border-gray-100">
                <h1 className="text-4xl font-black uppercase text-[#0B1C3E] mb-8">Contact Us</h1>
                <p className="mb-4 text-gray-500">For urgent inquiries, please contact our support team.</p>
                <div className="grid gap-4">
                    <input type="text" placeholder="Name" className="p-4 bg-gray-50 rounded-xl" />
                    <input type="email" placeholder="Email" className="p-4 bg-gray-50 rounded-xl" />
                    <textarea rows="4" placeholder="Message" className="p-4 bg-gray-50 rounded-xl"></textarea>
                    <button className="py-4 bg-[#0B1C3E] text-white rounded-xl font-bold uppercase shadow-lg">Send Message</button>
                </div>
            </div>
        </div>
    </div>
);