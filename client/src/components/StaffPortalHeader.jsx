import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const StaffPortalHeader = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const role = String(user?.role || '').toLowerCase();
    const isStaffUser = ['admin', 'manager'].includes(role);
    const onSetupPage = location.pathname === '/staff/setup';

    const handleLogout = () => {
        logout();
        navigate('/staff/login');
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#d8c79a] bg-[#101c2d] text-white shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d8c79a]">NuurPath</p>
                    <h1 className="text-lg font-black uppercase tracking-[0.22em]">Staff Portal</h1>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    {isAuthenticated && isStaffUser ? (
                        <>
                            <span className="hidden rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 sm:inline-flex">
                                {role}
                            </span>
                            <Link
                                to="/admin"
                                className="rounded-full border border-white/15 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/10"
                            >
                                Dashboard
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-full bg-[#d8c79a] px-4 py-2 font-semibold text-[#101c2d] transition-colors hover:bg-[#eadfb8]"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            {!onSetupPage && (
                                <Link
                                    to="/staff/setup"
                                    className="rounded-full border border-white/15 px-4 py-2 font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    First Admin Setup
                                </Link>
                            )}
                            <Link
                                to="/"
                                className="rounded-full bg-[#d8c79a] px-4 py-2 font-semibold text-[#101c2d] transition-colors hover:bg-[#eadfb8]"
                            >
                                Back Home
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default StaffPortalHeader;
