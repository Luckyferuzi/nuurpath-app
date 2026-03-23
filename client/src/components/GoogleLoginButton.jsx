import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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