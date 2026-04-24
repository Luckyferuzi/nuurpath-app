import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        bio: '',
        phone: '',
        address: '',
        profilePicture: '',
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await axios.get('http://localhost:5000/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                setProfile(response.data);
                setFormData({
                    bio: response.data.profile?.bio || '',
                    phone: response.data.profile?.phone || '',
                    address: response.data.profile?.address || '',
                    profilePicture: response.data.profile?.profilePicture || '',
                });
                setLoading(false);
                setError(null); // Clear any previous errors on success
            } catch (err) {
                console.error('Error fetching profile:', err);
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    setError('Session expired or unauthorized. Please log in again.');
                    logout(); // Assuming logout clears token and redirects
                    navigate('/login');
                } else {
                    setError(err.response?.data?.message || 'Failed to fetch profile');
                }
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate, logout]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) { // Added check for token before submitting
                setError('Authentication token missing. Please log in.'); // User-facing error
                logout();
                navigate('/login');
                return;
            }
            const response = await axios.put('http://localhost:5000/api/profile', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            setProfile(response.data);
            setEditMode(false);
            setError(null); // Clear any previous errors on success
        } catch (err) {
            console.error('Error updating profile:', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                setError('Unauthorized to update profile. Please log in again.');
                logout();
                navigate('/login');
            } else {
                setError(err.response?.data?.message || 'Failed to update profile');
            }
        }
    };

    if (loading) return <div className="container mt-5">Loading profile...</div>;
    if (error) return <div className="container mt-5 alert alert-danger">{error}</div>;
    if (!profile) return <div className="container mt-5">No profile found</div>;

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-8 offset-md-2">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h3>User Profile</h3>
                        </div>
                        <div className="card-body">
                            {editMode ? (
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label">Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="name"
                                            value={profile.name}
                                            readOnly
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            value={profile.email}
                                            readOnly
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="bio" className="form-label">Bio</label>
                                        <textarea
                                            className="form-control"
                                            id="bio"
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            rows="3"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="phone" className="form-label">Phone</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="address" className="form-label">Address</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="profilePicture" className="form-label">Profile Picture URL</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="profilePicture"
                                            name="profilePicture"
                                            value={formData.profilePicture}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="d-flex justify-content-between">
                                        <button type="submit" className="btn btn-primary">Save Changes</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="row mb-4">
                                        <div className="col-md-4 text-center">
                                            {formData.profilePicture ? (
                                                <img
                                                    src={formData.profilePicture}
                                                    alt="Profile"
                                                    className="img-fluid rounded-circle"
                                                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center"
                                                     style={{ width: '150px', height: '150px', margin: '0 auto' }}>
                                                    <span className="text-white h3">{profile.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-md-8">
                                            <h4>{profile.name}</h4>
                                            <p className="text-muted">{profile.email}</p>
                                            <p className="text-muted">Role: {profile.role}</p>
                                            <p className="text-muted">Joined: {new Date(profile.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h5>About Me</h5>
                                        <p>{formData.bio || 'No bio available'}</p>
                                    </div>

                                    <div className="mb-4">
                                        <h5>Contact Information</h5>
                                        <p><strong>Phone:</strong> {formData.phone || 'Not provided'}</p>
                                        <p><strong>Address:</strong> {formData.address || 'Not provided'}</p>
                                    </div>

                                    <button className="btn btn-primary me-2" onClick={() => setEditMode(true)}>Edit Profile</button>
                                    <button className="btn btn-danger" onClick={logout}>Logout</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
