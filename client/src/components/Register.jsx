import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [resendMessage, setResendMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    
    const navigate = useNavigate();
    const { register } = useAuth(); // Get register directly

    const { name, email, password, confirmPassword } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        // Use context function
        const result = await register(name, email, password);

        if (result.success) {
            if (result.message) {
                setSuccessMessage(result.message);
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.error || 'Registration failed. Please try again.');
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
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

    const calculateStrength = (pwd) => {
        let score = 0;
        if (!pwd) return 0;
        if (pwd.length >= 6) score += 1;
        if (pwd.length >= 10) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
        return score;
    };

    const getStrengthColor = (score) => {
        if (score < 3) return '#dc3545'; // Weak
        if (score < 5) return '#ffc107'; // Medium
        return '#28a745'; // Strong
    };

    const getStrengthLabel = (score) => {
        if (score < 3) return 'Weak';
        if (score < 5) return 'Medium';
        return 'Strong';
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
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Register</h2>
            {successMessage ? (
                <div className="alert alert-success" style={{ color: '#155724', backgroundColor: '#d4edda', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    {successMessage}
                    {resendMessage && <p style={{ marginTop: '10px', fontSize: '13px', fontWeight: 'bold' }}>{resendMessage}</p>}
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(21, 87, 36, 0.2)', paddingTop: '10px' }}>
                        <p style={{ fontSize: '13px', marginBottom: '5px' }}>Didn't receive the email?</p>
                        <button 
                            type="button" 
                            onClick={handleResendEmail}
                            disabled={isResending}
                            style={{ background: 'none', border: 'none', color: '#0c5460', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px', padding: 0, fontWeight: 'bold' }}
                        >
                            {isResending ? 'Sending...' : 'Resend Verification Link'}
                        </button>
                    </div>
                    <p style={{marginTop: '10px'}}><Link to="/login" style={{color: '#155724', fontWeight: 'bold'}}>Proceed to Login</Link></p>
                </div>
            ) : (
            <>
            {error && <div className="alert alert-danger" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}
            <form onSubmit={onSubmit}>
                <div className="mb-3" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        onChange={onChange}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                </div>
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
                            minLength="6"
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
                    {password && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ height: '4px', width: '100%', backgroundColor: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div 
                                    style={{ 
                                        height: '100%', 
                                        width: `${(calculateStrength(password) / 5) * 100}%`, 
                                        backgroundColor: getStrengthColor(calculateStrength(password)),
                                        transition: 'width 0.3s ease-in-out, background-color 0.3s'
                                    }} 
                                />
                            </div>
                            <p style={{ fontSize: '11px', color: getStrengthColor(calculateStrength(password)), marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                                {getStrengthLabel(calculateStrength(password))}
                            </p>
                        </div>
                    )}
                </div>
                <div className="mb-3" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={confirmPassword}
                            onChange={onChange}
                            required
                            minLength="6"
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
                    style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin" style={{ height: '20px', width: '20px', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }}></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" style={{ opacity: 0.75 }}></path>
                            </svg>
                            Registering...
                        </>
                    ) : 'Register'}
                </button>
            </form>
            </>
            )}
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                Already have an account? <Link to="/login" style={{ color: '#007bff' }}>Login</Link>
            </p>
        </div>
    );
};

export default Register;
