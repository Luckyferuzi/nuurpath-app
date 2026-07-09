import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import GoogleLoginButton from './GoogleLoginButton.jsx';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const navigate = useNavigate();
    const { login, user, isAuthenticated } = useAuth();

    const { email, password } = formData;

    useEffect(() => {
        if (isAuthenticated) {
          navigate(['admin', 'manager'].includes(String(user?.role || '').toLowerCase()) ? '/admin' : '/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate, user?.role]);

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate(['admin', 'manager'].includes(String(result.user?.role || '').toLowerCase()) ? '/admin' : '/dashboard');
        } else if (result.redirectTo) {
            navigate(result.redirectTo, { state: { email } });
        } else {
            setError(result.error || 'Sign-in failed. Please check your details and try again.');
            setLoading(false);
        }
    };

    const containerStyle = {
        maxWidth: '400px',
        margin: '50px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    return (
        <div style={containerStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Sign In</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#6c757d', fontSize: '14px', lineHeight: '1.5' }}>
                Your account helps you track requests, save packages, and view updates. You can still browse packages and start a request without signing in.
            </p>
            {error && <div className="alert alert-danger" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px', border: '1px solid #f5c6cb' }}>{error}</div>}
            <form onSubmit={onSubmit}>
                <div className="mb-3" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                </div>
                <div className="mb-3" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                            style={{ width: '100%', padding: '8px', paddingRight: '40px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '12px', fontWeight: 'bold' }}
                        >
                            {showPassword ? "HIDE" : "SHOW"}
                        </button>
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin" style={{ height: '20px', width: '20px', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
                            </svg>
                            Signing in...
                        </>
                    ) : 'Sign In'}
                </button>
            </form>
            <div style={{ marginTop: '18px', textAlign: 'center', color: '#6c757d', fontSize: '13px', fontWeight: 'bold' }}>
                or continue with Google
            </div>
            <GoogleLoginButton onErrorMessage={setError} />
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ color: '#007bff' }}>Forgot your password?</Link>
            </p>
            <p style={{ marginTop: '5px', textAlign: 'center' }}>
                Need an account for tracking and saved packages? <Link to="/register" style={{ color: '#007bff' }}>Create one</Link>
            </p>
        </div>
    );
};

export default Login;
