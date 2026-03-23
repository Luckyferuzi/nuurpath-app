import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LanguageContext } from '../contexts/LanguageContext';
import { ThemeContext } from '../contexts/ThemeContext.jsx';
import { CONFIG } from '../config';
import NotificationBell from './NotificationBell';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { t, currentLanguage, setCurrentLanguage, availableLanguages = [] } = useContext(LanguageContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
        navigate('/');
    };

    return (
        // UPDATED: bg-[#006837] (Green) instead of Blue
        <nav className="sticky top-0 z-50 shadow-xl transition-all duration-300 bg-[#006837] text-white">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="h-16 w-16 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-2 border-[#D4AF37]/50">
                        <img src={CONFIG.LOGO_URL} alt="Logo" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter leading-none uppercase">NUURPATH</h1>
                        <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[2px]">International Ltd</p>
                    </div>
                </div>

                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} /></svg>
                </button>

                <ul className="hidden lg:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-widest list-none m-0">
                    <li><Link to="/" className="hover:text-[#D4AF37] transition-colors">{t('home')}</Link></li>
                    <li><Link to="/packages" className="hover:text-[#D4AF37] transition-colors">{t('packages')}</Link></li>
                    <li><Link to="/book-flight" className="hover:text-[#D4AF37] transition-colors">Book Flight</Link></li>
                    <li><Link to="/contact" className="hover:text-[#D4AF37] transition-colors">{t('contact')}</Link></li>
                    <li>
                        <select
                            value={currentLanguage}
                            onChange={(e) => setCurrentLanguage(e.target.value)}
                            className="bg-transparent border border-[#D4AF37] text-white rounded px-2 py-1 text-[10px] font-bold uppercase cursor-pointer focus:outline-none hover:bg-[#D4AF37] hover:text-[#0B1C3E] transition-colors"
                        >
                            {availableLanguages.map((lang) => (
                                <option key={lang} value={lang} className="text-black">{lang.toUpperCase()}</option>
                            ))}
                        </select>
                    </li>
                    <li>
                        <button onClick={toggleTheme} className="text-lg hover:scale-110 transition-transform" title="Toggle Dark Mode">
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </li>
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/dashboard" className="text-[#D4AF37]">{t('account')}</Link></li>
                            <li><Link to="/wishlist" className="text-[#D4AF37]">Wishlist</Link></li>
                            <li><NotificationBell /></li>
                            {['admin', 'manager'].includes(user?.role) && <li><Link to="/admin" className="text-[#D4AF37]">{t('admin')}</Link></li>}
                            <li><button onClick={handleLogout} className="px-5 py-2 rounded-full border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white transition-all">{t('logout')}</button></li>
                        </>
                    ) : (
                        <li><Link to="/login" className="px-6 py-2 rounded-full font-bold shadow-lg bg-[#D4AF37] text-[#006837]">{t('login')}</Link></li>
                    )}
                </ul>
            </div>
            
             <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} bg-white/5 backdrop-blur-md`}>
                <ul className="px-4 py-6 space-y-4 text-sm font-bold uppercase tracking-widest list-none p-0">
                    <li><Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-2">{t('home')}</Link></li>
                    <li><Link to="/packages" onClick={() => setIsMenuOpen(false)} className="block py-2">{t('packages')}</Link></li>
                    <li><Link to="/book-flight" onClick={() => setIsMenuOpen(false)} className="block py-2">Book Flight</Link></li>
                    <li><Link to="/contact" onClick={() => setIsMenuOpen(false)} className="block py-2">{t('contact')}</Link></li>
                    <li className="py-2">
                        <select
                            value={currentLanguage}
                            onChange={(e) => { setCurrentLanguage(e.target.value); setIsMenuOpen(false); }}
                            className="w-full bg-transparent border border-white/30 text-white rounded px-3 py-2 text-sm font-bold uppercase cursor-pointer focus:outline-none"
                        >
                            {availableLanguages.map((lang) => (
                                <option key={lang} value={lang} className="text-black">{lang.toUpperCase()}</option>
                            ))}
                        </select>
                    </li>
                    <li>
                        <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="block py-2 w-full text-left">
                            {theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
                        </button>
                    </li>
                    {isAuthenticated && ['admin', 'manager'].includes(user?.role) && <li><Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block py-2 text-[#D4AF37]">{t('admin')}</Link></li>}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;