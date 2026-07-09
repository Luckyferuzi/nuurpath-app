import React, { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

const GoogleLoginButton = ({ onErrorMessage, onSuccess: onGoogleSuccess }) => {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn('[GoogleLoginButton] REACT_APP_GOOGLE_CLIENT_ID is missing. Google sign-in is disabled.');
        }
    }, []);

    const reportError = (message) => {
        if (typeof onErrorMessage === 'function') {
            onErrorMessage(message);
            return;
        }

        console.error(message);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsSubmitting(true);
        const result = await googleLogin(credentialResponse?.credential);
        setIsSubmitting(false);

        if (result.success) {
            if (typeof onGoogleSuccess === 'function') {
                onGoogleSuccess(result);
                return;
            }

            navigate('/dashboard');
            return;
        }

        reportError(result.error || 'Google sign-in failed. Please try again.');
    };

    const onError = () => {
        reportError('Google sign-in was cancelled or failed. Please try again.');
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="mt-4 text-center text-sm text-gray-500">
                Continue with Google is unavailable right now.
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center mt-4 gap-2">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={onError}
                text="continue_with"
                theme="outline"
                shape="pill"
            />
            {isSubmitting && (
                <div className="text-sm text-gray-500">Signing you in with Google...</div>
            )}
        </div>
    );
};

export default GoogleLoginButton;
