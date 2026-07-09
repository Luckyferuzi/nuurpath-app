import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';

const initialFormData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    setupToken: '',
    rememberMe: true,
};

const AdminSetup = () => {
    const navigate = useNavigate();
    const { adminSetup, user, isAuthenticated } = useAuth();
    const [formData, setFormData] = useState(initialFormData);
    const [status, setStatus] = useState({
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

        const loadStatus = async () => {
            try {
                const response = await api.get('/auth/admin-setup/status');
                if (isMounted) {
                    setStatus({
                        loading: false,
                        ...response.data,
                    });
                }
            } catch (requestError) {
                if (isMounted) {
                    setStatus((current) => ({
                        ...current,
                        loading: false,
                    }));
                    setError('Unable to verify whether admin setup is available right now.');
                }
            }
        };

        loadStatus();

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
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        const result = await adminSetup({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            setupToken: formData.setupToken,
            rememberMe: formData.rememberMe,
        });

        if (result.success) {
            navigate('/admin', { replace: true });
            return;
        }

        setError(result.error || 'Admin setup failed. Please try again.');
        setLoading(false);
    };

    const showSetupForm = !status.loading && status.setupAvailable;
    const showAdminExists = !status.loading && status.adminExists;
    const showSetupNotConfigured = !status.loading && !status.adminExists && !status.setupConfigured;

    return (
        <div className="min-h-[calc(100vh-81px)] bg-[linear-gradient(160deg,_#f7f1e2_0%,_#f0ebdf_32%,_#e8e1d1_100%)] px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <section className="overflow-hidden rounded-[2rem] border border-[#d9cfb8] bg-white shadow-[0_24px_80px_rgba(16,28,45,0.10)] lg:grid lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="bg-[#101c2d] p-8 text-white sm:p-10">
                        <p className="mb-4 inline-flex rounded-full border border-white/15 px-4 py-1 text-xs font-black uppercase tracking-[0.35em] text-[#d8c79a]">
                            One-Time Setup
                        </p>
                        <h2 className="text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
                            Create the first admin account.
                        </h2>
                        <p className="mt-6 text-base leading-7 text-white/72 sm:text-lg">
                            This route is intentionally separate from the public customer interface. It works only before the first admin exists, then closes permanently.
                        </p>
                        <div className="mt-10 space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8c79a]">Important</p>
                            <ul className="space-y-3 text-sm leading-6 text-white/75">
                                <li>Create an email and password that you want to keep as your admin login.</li>
                                <li>This page requires the server-side `ADMIN_SETUP_TOKEN` for protection.</li>
                                <li>After setup, future managers must be created by an admin from the dashboard.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10">
                        <div className="mb-8">
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#7f6a3d]">Bootstrap Admin</p>
                            <h3 className="mt-3 text-3xl font-black text-[#101c2d]">First administrator registration</h3>
                        </div>

                        {error && (
                            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        {status.loading && (
                            <div className="rounded-3xl border border-[#e8e0cf] bg-[#fcfbf8] px-5 py-6 text-sm text-[#5d6471]">
                                Checking whether first-time admin setup is still available...
                            </div>
                        )}

                        {showAdminExists && (
                            <div className="rounded-3xl border border-[#d9cfb8] bg-[#fcfbf8] p-6">
                                <h4 className="text-lg font-black text-[#101c2d]">Setup already completed</h4>
                                <p className="mt-3 text-sm leading-6 text-[#5d6471]">
                                    An admin account already exists for this deployment, so first-time setup has been permanently closed.
                                </p>
                                <Link
                                    to="/staff/login"
                                    className="mt-5 inline-flex rounded-full bg-[#101c2d] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b]"
                                >
                                    Go To Staff Login
                                </Link>
                            </div>
                        )}

                        {showSetupNotConfigured && (
                            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                                <h4 className="text-lg font-black text-amber-900">Setup token required</h4>
                                <p className="mt-3 text-sm leading-6 text-amber-800">
                                    This server does not have `ADMIN_SETUP_TOKEN` configured yet, so the first-admin flow is disabled until that environment variable is added.
                                </p>
                            </div>
                        )}

                        {showSetupForm && (
                            <form onSubmit={onSubmit} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={onChange}
                                        required
                                        className="w-full rounded-2xl border border-[#d9d3c6] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                                    />
                                </div>
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
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={onChange}
                                            required
                                            minLength="6"
                                            className="w-full rounded-2xl border border-[#d9d3c6] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Confirm Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={onChange}
                                            required
                                            minLength="6"
                                            className="w-full rounded-2xl border border-[#d9d3c6] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#101c2d]">Admin Setup Token</label>
                                    <input
                                        type="password"
                                        name="setupToken"
                                        value={formData.setupToken}
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
                                    Keep this admin session signed in after setup
                                </label>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {loading ? 'Creating Admin...' : 'Create First Admin'}
                                </button>
                            </form>
                        )}

                        <div className="mt-8 text-sm text-[#5d6471]">
                            Already have a staff account? <Link to="/staff/login" className="font-semibold text-[#101c2d] underline decoration-[#d8c79a] underline-offset-4">Go to staff login</Link>.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminSetup;
