import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const GOOGLE_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

const GoogleLoginButton = () => {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();

    const onSuccess = async (credentialResponse) => {
        const success = await googleLogin(credentialResponse.credential);
        if (success) {
            navigate('/dashboard');
        }
    };

    const onError = () => {
        console.log('Google Login Failed');
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="mt-4 text-center text-sm text-red-600">
                Google sign-in is temporarily unavailable.
            </div>
        );
    }

    return (
        <div className="flex justify-center mt-4">
            <GoogleLogin
                onSuccess={onSuccess}
                onError={onError}
                useOneTap
                theme="filled_blue"
                shape="pill"
            />
        </div>
    );
};

export default GoogleLoginButton;
