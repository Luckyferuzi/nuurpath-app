import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isStaffUser = ['admin', 'manager'].includes(String(user?.role || '').toLowerCase());

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/');
    };

    return (
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#06294d]/95 text-white shadow-[0_20px_45px_rgba(6,21,40,0.22)] backdrop-blur-md transition-all duration-300">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex cursor-pointer items-center space-x-3" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        navigate('/');
                    }
                }}>
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/45 bg-white shadow-lg sm:h-16 sm:w-16">
                        <img src={CONFIG.LOGO_URL} alt="Logo" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-black uppercase leading-none tracking-tighter">NUURPATH</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">International Ltd</p>
                    </div>
                </div>

                <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold text-white/80 lg:flex">
                    <span className="h-2 w-2 rounded-full bg-[#D4AF37]"></span>
                    Start on the website, then continue with our team on WhatsApp.
                </div>

                <button onClick={() => setIsMenuOpen((current) => !current)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white lg:hidden" aria-label="Toggle navigation" type="button">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16m-7 6h7'} />
                    </svg>
                </button>

                <ul className="m-0 hidden list-none items-center space-x-3 text-[11px] font-bold uppercase tracking-[0.2em] lg:flex">
                    {customerLinks.map((link) => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                className={({ isActive }) => `rounded-full px-4 py-2 transition-colors ${
                                    isActive
                                        ? 'bg-white/10 text-[#f5d885]'
                                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                    {isAuthenticated ? (
                        <>
                            <li><NavLink to="/dashboard" className={({ isActive }) => `rounded-full px-4 py-2 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885] hover:bg-white/5'}`}>My Account</NavLink></li>
                            <li><NavLink to="/wishlist" className={({ isActive }) => `rounded-full px-4 py-2 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885] hover:bg-white/5'}`}>Wishlist</NavLink></li>
                            <li><NotificationBell /></li>
                            {isStaffUser && <li><NavLink to="/admin" className={({ isActive }) => `rounded-full px-4 py-2 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885] hover:bg-white/5'}`}>Staff Portal</NavLink></li>}
                            <li>
                                <button onClick={handleLogout} className="rounded-full border border-[#D4AF37] px-5 py-2 text-[#D4AF37] transition-all hover:bg-[#D4AF37] hover:text-[#06294d]" type="button">
                                    Sign Out
                                </button>
                            </li>
                        </>
                    ) : (
                        <li>
                            <Link to="/login" className="rounded-full bg-[#D4AF37] px-6 py-2 font-bold text-[#06294d] shadow-lg transition-transform hover:-translate-y-0.5">
                                Account Login
                            </Link>
                        </li>
                    )}
                </ul>
            </div>

            <div className={`overflow-hidden border-t border-white/10 bg-[#082c54]/95 backdrop-blur-md transition-all duration-300 lg:hidden ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pt-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                    Guided travel support
                </div>
                <ul className="space-y-3 px-4 py-5 text-sm font-bold uppercase tracking-[0.18em]">
                    {customerLinks.map((link) => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                className={({ isActive }) => `block rounded-2xl px-4 py-3 ${isActive ? 'bg-white/10 text-[#f5d885]' : 'text-white/85'}`}
                            >
                                {link.label}
                            </NavLink>
                        </li>
                    ))}
                    {isAuthenticated ? (
                        <>
                            <li><NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `block rounded-2xl px-4 py-3 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885]'}`}>My Account</NavLink></li>
                            <li><Link to="/dashboard?tab=notifications" onClick={() => setIsMenuOpen(false)} className="block rounded-2xl px-4 py-3 text-[#f5d885]">Notifications</Link></li>
                            <li><NavLink to="/wishlist" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `block rounded-2xl px-4 py-3 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885]'}`}>Wishlist</NavLink></li>
                            {isStaffUser && <li><NavLink to="/admin" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `block rounded-2xl px-4 py-3 ${isActive ? 'bg-[#D4AF37] text-[#06294d]' : 'text-[#f5d885]'}`}>Staff Portal</NavLink></li>}
                            <li>
                                <button onClick={handleLogout} className="block w-full rounded-2xl px-4 py-3 text-left text-[#f5d885]" type="button">
                                    Sign Out
                                </button>
                            </li>
                        </>
                    ) : (
                        <li><Link to="/login" onClick={() => setIsMenuOpen(false)} className="block rounded-2xl bg-[#D4AF37] px-4 py-3 text-[#06294d]">Account Login</Link></li>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
