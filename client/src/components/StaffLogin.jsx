import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';

const StaffLogin = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { staffLogin, user, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        email: location.state?.email || '',
        password: '',
        rememberMe: true,
    });
    const [setupStatus, setSetupStatus] = useState({
        loading: true,
        adminExists: false,
        setupConfigured: false,
        setupAvailable: false,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate(['admin', 'manager'].includes(String(user?.role || '').toLowerCase()) ? '/admin' : '/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate, user?.role]);

    useEffect(() => {
        let isMounted = true;

        const loadSetupStatus = async () => {
            try {
                const response = await api.get('/auth/admin-setup/status');
                if (isMounted) {
                    setSetupStatus({
                        loading: false,
                        ...response.data,
                    });
                }
            } catch (requestError) {
                if (isMounted) {
                    setSetupStatus((current) => ({
                        ...current,
                        loading: false,
                    }));
                }
            }
        };

        loadSetupStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    const onChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (error) {
            setError('');
        }
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const result = await staffLogin(formData.email, formData.password, formData.rememberMe);

        if (result.success) {
            navigate('/admin', { replace: true });
            return;
        }

        if (result.redirectTo) {
            navigate(result.redirectTo, { replace: true, state: { email: formData.email } });
            return;
        }

        setError(result.error || 'Staff sign-in failed. Please try again.');
        setLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-81px)] bg-[radial-gradient(circle_at_top,_rgba(216,199,154,0.15),_transparent_45%),linear-gradient(180deg,_#f8f3e6_0%,_#f3efe3_100%)] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[2rem] bg-[#101c2d] p-8 text-white shadow-[0_24px_80px_rgba(16,28,45,0.22)] sm:p-10">
                    <p className="mb-4 inline-flex rounded-full border border-white/15 px-4 py-1 text-xs font-black uppercase tracking-[0.35em] text-[#d8c79a]">
                        Staff Access
                    </p>
                    <h2 className="max-w-xl text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
                        Admin and manager sign-in lives here.
                    </h2>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                        This portal is separate from the customer account area. Customers continue to use the standard account login and registration pages, while operations staff use this private workflow.
                    </p>
                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#d8c79a]">Managers</h3>
                            <p className="mt-3 text-sm leading-6 text-white/72">
                                Managers do not self-register. They sign in here after an admin creates their account and shares credentials.
                            </p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[#d8c79a]">First Admin</h3>
                            <p className="mt-3 text-sm leading-6 text-white/72">
                                The one-time setup route stays closed after the first admin account is created, so staff registration never becomes a public customer flow.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-[2rem] border border-[#e4dcc7] bg-white p-8 shadow-[0_22px_70px_rgba(16,28,45,0.08)] sm:p-10">
                    <div className="mb-8">
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7f6a3d]">Portal Login</p>
                        <h3 className="mt-3 text-3xl font-black text-[#101c2d]">Sign in to the staff workspace</h3>
                        <p className="mt-3 text-sm leading-6 text-[#5d6471]">
                            Use the credentials assigned to your admin or manager account.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={onChange}
                                required
                                className="w-full rounded-2xl border border-[#d9d3c6] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={onChange}
                                required
                                className="w-full rounded-2xl border border-[#d9d3c6] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                            />
                        </div>
                        <label className="flex items-center gap-3 text-sm text-[#495266]">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={onChange}
                                className="h-4 w-4 rounded border-[#bba97a] text-[#7f6a3d] focus:ring-[#7f6a3d]"
                            />
                            Keep this staff session signed in
                        </label>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex w-full items-center justify-center rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? 'Signing In...' : 'Enter Staff Portal'}
                        </button>
                    </form>

                    <div className="mt-8 space-y-3 text-sm">
                        <Link to="/forgot-password" className="font-semibold text-[#7f6a3d] transition hover:text-[#5c4b2b]">
                            Forgot your password?
                        </Link>
                        <p className="text-[#5d6471]">
                            Customer account? Use the normal <Link to="/login" className="font-semibold text-[#101c2d] underline decoration-[#d8c79a] underline-offset-4">account login</Link>.
                        </p>
                    </div>

                    {!setupStatus.loading && setupStatus.setupAvailable && (
                        <div className="mt-8 rounded-3xl border border-[#d8c79a] bg-[#fbf6e5] p-5">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7f6a3d]">First-Time Setup</p>
                            <p className="mt-3 text-sm leading-6 text-[#5c4b2b]">
                                No admin account exists yet. Use the one-time setup flow to create the first admin.
                            </p>
                            <Link
                                to="/staff/setup"
                                className="mt-4 inline-flex rounded-full bg-[#7f6a3d] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#69572f]"
                            >
                                Create First Admin
                            </Link>
                        </div>
                    )}

                    {!setupStatus.loading && !setupStatus.adminExists && !setupStatus.setupConfigured && (
                        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                            The server is missing `ADMIN_SETUP_TOKEN`, so first-time admin setup is currently disabled until that environment variable is configured.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default StaffLogin;
