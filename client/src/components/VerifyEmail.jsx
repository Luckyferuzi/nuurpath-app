import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await axios.post(`${CONFIG.API_BASE_URL}/auth/verify-email`, { token });
                setStatus('success');
                setMessage(res.data.msg);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.msg || 'Verification failed. Invalid or expired token.');
            }
        };

        if (token) {
            verify();
        }
    }, [token]);

    return (
        <div className="container mx-auto p-6 max-w-md mt-10">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                {status === 'verifying' && (
                    <div>
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0B1C3E] mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-[#0B1C3E]">Verifying Email...</h2>
                    </div>
                )}
                {status === 'success' && (
                    <div>
                        <div className="text-green-500 text-5xl mb-4">✓</div>
                        <h2 className="text-2xl font-bold text-[#0B1C3E] mb-2">Email Verified!</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link to="/login" className="bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors">
                            Login Now
                        </Link>
                    </div>
                )}
                {status === 'error' && (
                    <div>
                        <div className="text-red-500 text-5xl mb-4">✕</div>
                        <h2 className="text-2xl font-bold text-[#0B1C3E] mb-2">Verification Failed</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link to="/login" className="text-[#0B1C3E] font-bold hover:underline">
                            Back to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;