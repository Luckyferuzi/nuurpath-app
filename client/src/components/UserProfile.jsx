import React, { useState, useEffect } from 'react';
import axios from '../lib/api';

const UserProfile = () => {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        bio: '',
        contactInfo: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordStatus, setPasswordStatus] = useState({ loading: false, success: '', error: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('/profile');
                setProfile(res.data);
            } catch (err) {
                setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await axios.put('/profile', profile);
            setMessage('Profile updated successfully!');
        } catch (err) {
            setError('Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordStatus({ loading: true, success: '', error: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ loading: false, success: '', error: 'New passwords do not match' });
            return;
        }

        try {
            await axios.put('/profile/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordStatus({ loading: false, success: 'Password updated successfully', error: '' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordStatus({ loading: false, success: '', error: err.response?.data?.msg || 'Failed to update password' });
        }
    };

    if (loading) {
        return <div className="text-center p-10">Loading profile...</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <h2 className="text-3xl font-bold text-[#0B1C3E] mb-8">My Profile</h2>
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
                {message && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{message}</div>}
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                        <input type="text" name="name" value={profile.name || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" value={profile.email || ''} disabled className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Bio</label>
                        <textarea name="bio" value={profile.bio || ''} onChange={handleChange} rows="4" placeholder="Tell us a little about yourself" className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contact Info (Phone, etc.)</label>
                        <input type="text" name="contactInfo" value={profile.contactInfo || ''} onChange={handleChange} placeholder="e.g., +1 123 456 7890" className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]" />
                    </div>
                    <div>
                        <button type="submit" disabled={saving} className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 mt-8">
                <h3 className="text-xl font-bold text-[#0B1C3E] mb-4">Change Password</h3>
                {passwordStatus.success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{passwordStatus.success}</div>}
                {passwordStatus.error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{passwordStatus.error}</div>}
                
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                        <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                        <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                        <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]" />
                    </div>
                    <div>
                        <button type="submit" disabled={passwordStatus.loading} className="w-full bg-[#D4AF37] text-[#0B1C3E] py-3 rounded-lg font-bold hover:bg-[#b5952f] transition-colors disabled:opacity-50">{passwordStatus.loading ? 'Updating...' : 'Update Password'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserProfile;
