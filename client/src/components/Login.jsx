import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    // Remove local error/loading state if you want to use the one from context, 
    // or keep local state to avoid global flicker. Here we use local for UI control.
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    const { email, password } = formData;

    useEffect(() => {
        if (isAuthenticated) {
          navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
        if (needsVerification) setNeedsVerification(false);
    };

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setResendMessage('');
        setNeedsVerification(false);
        setLoading(true);

        // Use the context function which handles the API call via axios (and correct baseURL)
        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            if (result.error === 'Please verify your email before logging in.') {
                setError("Account not verified. Please check your inbox or use the link below.");
                setNeedsVerification(true);
            } else {
                setError(result.error || 'Login failed. Please check your credentials.');
            }
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (!email) {
            setError('Please enter your email address to resend the verification link.');
            return;
        }
        
        setIsResending(true);
        setResendMessage('');
        setError('');

        try {
            const res = await axios.post('/api/auth/resend-verification', { email });
            setResendMessage(res.data.msg);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to resend verification email.');
        } finally {
            setIsResending(false);
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
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
            {error && <div className="alert alert-danger" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px', border: '1px solid #f5c6cb' }}>{error}</div>}
            
            {needsVerification && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', marginBottom: '10px', color: '#856404', fontWeight: 'bold' }}>
                        Didn't receive the verification email?
                    </p>
                    <button 
                        type="button" 
                        onClick={handleResendEmail}
                        disabled={isResending}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                    >
                        {isResending ? 'Sending...' : 'Resend Verification Link'}
                    </button>
                </div>
            )}

            {resendMessage && <div className="alert alert-success" style={{ color: '#155724', backgroundColor: '#d4edda', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{resendMessage}</div>}
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
                            Logging in...
                        </>
                    ) : 'Login'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ color: '#007bff' }}>Forgot Password?</Link>
            </p>
            <p style={{ marginTop: '10px', textAlign: 'center' }}>
                <button 
                    type="button" 
                    onClick={handleResendEmail}
                    disabled={isResending}
                    style={{ background: 'none', border: 'none', color: '#6c757d', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
            </p>
            <p style={{ marginTop: '5px', textAlign: 'center' }}>
                Don't have an account? <Link to="/register" style={{ color: '#007bff' }}>Register</Link>
            </p>
        </div>
    );
};

export default Login;
