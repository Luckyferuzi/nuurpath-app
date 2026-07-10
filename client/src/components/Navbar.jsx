import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { CONFIG } from '../config';
import NotificationBell from './NotificationBell';

const customerLinks = [
    { to: '/', label: 'Home' },
    { to: '/packages', label: 'Packages' },
    { to: '/book-flight', label: 'Request Flight' },
    { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isStaffUser = ['admin', 'manager'].includes(String(user?.role || '').toLowerCase());

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/');
    };

    return (
        <nav className="sticky top-0 z-50 bg-[#006837] text-white shadow-xl transition-all duration-300">
            <div className="container mx-auto flex items-center justify-between px-4 py-3">
                <div className="flex cursor-pointer items-center space-x-3" onClick={() => navigate('/')}>
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[#D4AF37]/50 bg-white shadow-lg">
                        <img src={CONFIG.LOGO_URL} alt="Logo" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase leading-none tracking-tighter">NUURPATH</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#D4AF37]">International Ltd</p>
                    </div>
                </div>

                <button onClick={() => setIsMenuOpen((current) => !current)} className="p-2 text-white lg:hidden" aria-label="Toggle navigation">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'} />
                    </svg>
                </button>

                <ul className="m-0 hidden list-none items-center space-x-8 text-[11px] font-bold uppercase tracking-widest lg:flex">
                    {customerLinks.map((link) => (
                        <li key={link.to}>
                            <Link to={link.to} className="transition-colors hover:text-[#D4AF37]">
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/dashboard" className="text-[#D4AF37]">My Account</Link></li>
                            <li><Link to="/wishlist" className="text-[#D4AF37]">Wishlist</Link></li>
                            <li><NotificationBell /></li>
                            {isStaffUser && <li><Link to="/admin" className="text-[#D4AF37]">Staff Portal</Link></li>}
                            <li>
                                <button onClick={handleLogout} className="rounded-full border border-[#D4AF37] px-5 py-2 text-[#D4AF37] transition-all hover:bg-[#D4AF37] hover:text-white">
                                    Sign Out
                                </button>
                            </li>
                        </>
                    ) : (
                        <li>
                            <Link to="/login" className="rounded-full bg-[#D4AF37] px-6 py-2 font-bold text-[#006837] shadow-lg">
                                Account Login
                            </Link>
                        </li>
                    )}
                </ul>
            </div>

            <div className={`overflow-hidden bg-white/5 backdrop-blur-md transition-all duration-300 lg:hidden ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                <ul className="space-y-4 px-4 py-6 text-sm font-bold uppercase tracking-widest">
                    {customerLinks.map((link) => (
                        <li key={link.to}>
                            <Link to={link.to} onClick={() => setIsMenuOpen(false)} className="block py-2">
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">My Account</Link></li>
                            <li><Link to="/dashboard?tab=notifications" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">Notifications</Link></li>
                            <li><Link to="/wishlist" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">Wishlist</Link></li>
                            {isStaffUser && <li><Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">Staff Portal</Link></li>}
                            <li>
                                <button onClick={handleLogout} className="block w-full py-2 text-left text-[#D4AF37]">
                                    Sign Out
                                </button>
                            </li>
                        </>
                    ) : (
                        <li><Link to="/login" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">Account Login</Link></li>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
