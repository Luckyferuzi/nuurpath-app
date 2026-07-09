//dev/null
//U/sers/issatende/Projects/nuurpath-travels/client/src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios, { resolveBackendUrl } from '../lib/api';
import FlightDetailsModal from './FlightDetailsModal';
import UserSpendingSummary from './UserSpendingSummary';
import TripCountdown from './TripCountdown';
import WeatherWidget from './WeatherWidget';
import DestinationMap from './DestinationMap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    getOperationalStatusBadgeClassName,
    getOperationalStatusLabel,
    isOperationalCancelledStatus,
    isOperationalCompletedStatus,
    isOperationalConfirmedStatus,
    isOperationalOpenStatus,
} from '../lib/operationalPipeline.js';

const UserDashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('bookings');
    const [bookings, setBookings] = useState([]);
   const [consultations, setConsultations] = useState([]);
   const [flights, setFlights] = useState([]);
   const [wishlist, setWishlist] = useState([]);
   const [userReviews, setUserReviews] = useState([]);
   const [notifications, setNotifications] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [profilePic, setProfilePic] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [profileData, setProfileData] = useState({ name: '', bio: '', contactInfo: '' });
    const [profileMessage, setProfileMessage] = useState(null);
    const [nextTrip, setNextTrip] = useState(null);
    const [spendingData, setSpendingData] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '', images: null, videos: null, imagePreviews: [], videoPreviews: [] });
    const COLORS = ['#006837', '#D4AF37', '#0B1C3E', '#28a745', '#dc3545'];

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login');
        }
    }, [authLoading, isAuthenticated, navigate]);

    useEffect(() => {
        if (user?.profilePicture) {
            setProfilePic(user.profilePicture);
        }
        if (user) {
            setProfileData({
                name: user.name || '',
                bio: user.bio || '',
                contactInfo: user.contactInfo || ''
            });
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            
            try {
                const [
                    bookingsRes,
                    consultationsRes,
                    flightsRes,
                    wishlistRes,
                    reviewsRes,
                    notifRes
                ] = await Promise.allSettled([
                    axios.get(`/bookings`),
                    axios.get(`/appointments/private`),
                    axios.get(`/flights`),
                    axios.get(`/wishlist`),
                    axios.get(`/reviews/user`),
                    axios.get(`/notifications`)
                ]);

                if (bookingsRes.status === 'fulfilled') {
                    const data = bookingsRes.value.data;
                    setBookings(Array.isArray(data) ? data : []);
                }
                if (consultationsRes.status === 'fulfilled') {
                    const data = consultationsRes.value.data;
                    setConsultations(Array.isArray(data) ? data : []);
                }
                if (flightsRes.status === 'fulfilled') setFlights(flightsRes.value.data);
                if (wishlistRes.status === 'fulfilled') setWishlist(wishlistRes.value.data);
                if (reviewsRes.status === 'fulfilled') setUserReviews(reviewsRes.value.data);
                if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.notifications || []);

                // Log errors for debugging without breaking the UI
                [bookingsRes, consultationsRes, flightsRes, wishlistRes, reviewsRes, notifRes].forEach((res, idx) => {
                    if (res.status === 'rejected') console.warn(`Dashboard request ${idx} failed:`, res.reason.message);
                });
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoadingData(false);
            }
        };

        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        const now = new Date();
        const allTrips = [
            ...bookings.map(b => ({
                ...b,
                type: 'Package',
                date: b.travelDate ? new Date(b.travelDate) : null,
                title: b.package?.title || 'Travel Package',
                destination: b.package?.destination
            })),
            ...flights.map(f => ({
                ...f,
                type: 'Flight',
                date: new Date(f.departureDate),
                title: `Flight to ${f.to}`,
                destination: f.to
            }))
        ];

        // Filter for confirmed trips in the future
        const upcoming = allTrips
            .filter(t => isOperationalConfirmedStatus(t.status) && t.date && t.date > now)
            .sort((a, b) => a.date - b.date);

        setNextTrip(upcoming.length > 0 ? upcoming[0] : null);
    }, [bookings, flights]);

    useEffect(() => {
        if (bookings.length > 0) {
            const distribution = {};
            bookings.forEach(b => {
                if (!isOperationalCancelledStatus(b.status) && b.package) {
                    let type = b.package.type || 'Other';
                    type = type.charAt(0).toUpperCase() + type.slice(1);
                    const cost = Number(b.package.price || 0) * (b.passengers || 1);
                    distribution[type] = (distribution[type] || 0) + cost;
                }
            });
            
            const data = Object.keys(distribution).map(key => ({
                name: key,
                value: distribution[key]
            }));
            setSpendingData(data);
        }
    }, [bookings]);

    useEffect(() => {
        if (!showReviewModal) {
            reviewData.imagePreviews?.forEach(url => URL.revokeObjectURL(url));
            reviewData.videoPreviews?.forEach(url => URL.revokeObjectURL(url));
        }
    }, [showReviewModal, reviewData.imagePreviews, reviewData.videoPreviews]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePicture', file);

        setUploading(true);
        try {
            const response = await axios.post(`/profile/upload-picture`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.status === 200) {
                setProfilePic(response.data.profilePicture);
            }
        } catch (error) {
            console.error("Error uploading profile picture:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleCancelFlight = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this flight request?')) return;

        try {
            const response = await axios.put(`/flights/${id}/cancel`);

            if (response.status === 200) {
                setFlights(flights.map(f => f.id === id ? { ...f, status: 'Cancelled' } : f));
            } else {
                alert('Failed to cancel flight request.');
            }
        } catch (error) {
            console.error("Error cancelling flight:", error);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage(null);
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        try {
            const response = await axios.put(`/profile/change-password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (response.status === 200) {
                setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPasswordMessage({ type: 'error', text: response.data.msg || 'Failed to update password' });
            }
        } catch (err) {
            setPasswordMessage({ type: 'error', text: 'An error occurred. Please try again.' });
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMessage(null);
        try {
            const response = await axios.put(`/profile`, profileData);
            
            if (response.status === 200) {
                setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
            } else {
                setProfileMessage({ type: 'error', text: 'Failed to update profile' });
            }
        } catch (err) {
            setProfileMessage({ type: 'error', text: 'An error occurred.' });
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

        alert('Account deletion is not available from this screen.');
    };

    const handleOpenReview = (booking) => {
        setReviewBooking(booking);
        setReviewData({ 
            rating: 5, 
            comment: `Review for ${booking.package?.title || 'Trip'}: `,
            images: null,
            videos: null,
            imagePreviews: [],
            videoPreviews: []
        });
        setShowReviewModal(true);
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setUploading(true);

        const formData = new FormData();
        formData.append('rating', reviewData.rating);
        formData.append('comment', reviewData.comment);
        if (reviewBooking?.packageId) {
            formData.append('packageId', reviewBooking.packageId);
        }

        if (reviewData.images) {
            Array.from(reviewData.images).forEach(file => formData.append('images', file));
        }
        if (reviewData.videos) {
            Array.from(reviewData.videos).forEach(file => formData.append('videos', file));
        }

        try {
            await axios.post(`/reviews`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Refresh reviews
            const reviewsRes = await axios.get(`/reviews/user`);
            setUserReviews(reviewsRes.data);

            alert('Review submitted successfully! It will be visible after approval.');
            setShowReviewModal(false);
            setReviewBooking(null);
        } catch (err) {
            alert('Failed to submit review.');
        } finally {
            setUploading(false);
        }
    };

    const handleReviewImageChange = (e) => {
        const files = e.target.files;
        if (!files) return;
        // Revoke existing previews to prevent memory leaks
        reviewData.imagePreviews?.forEach(url => URL.revokeObjectURL(url));
        const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
        setReviewData({
            ...reviewData,
            images: files,
            imagePreviews: newPreviews
        });
    };

    const handleRemoveReviewImage = (index) => {
        const urlToRemove = reviewData.imagePreviews[index];
        URL.revokeObjectURL(urlToRemove);

        const newImages = Array.from(reviewData.images).filter((_, i) => i !== index);
        const newPreviews = reviewData.imagePreviews.filter((_, i) => i !== index);

        setReviewData({
            ...reviewData,
            images: newImages,
            imagePreviews: newPreviews
        });
    };

    const handleReviewVideoChange = (e) => {
        const files = e.target.files;
        if (!files) return;

        const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
        const validFiles = [];
        const oversizedFiles = [];

        Array.from(files).forEach(file => {
            if (file.size > MAX_VIDEO_SIZE) {
                oversizedFiles.push(file.name);
            } else {
                validFiles.push(file);
            }
        });

        if (oversizedFiles.length > 0) {
            alert(`The following videos exceed the 50MB limit and were not added:\n${oversizedFiles.join('\n')}`);
        }

        if (validFiles.length === 0) {
            e.target.value = ''; // Reset the input
            return;
        }

        // Revoke existing previews to prevent memory leaks
        reviewData.videoPreviews?.forEach(url => URL.revokeObjectURL(url));
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setReviewData({
            ...reviewData,
            videos: validFiles,
            videoPreviews: newPreviews
        });
    };

    const handleRemoveReviewVideo = (index) => {
        const urlToRemove = reviewData.videoPreviews[index];
        URL.revokeObjectURL(urlToRemove);

        const newVideos = Array.from(reviewData.videos).filter((_, i) => i !== index);
        const newPreviews = reviewData.videoPreviews.filter((_, i) => i !== index);

        setReviewData({
            ...reviewData,
            videos: newVideos,
            videoPreviews: newPreviews
        });
    };

    const handleRemoveFromWishlist = async (packageId) => {
        try {
            await axios.post(`/wishlist/${packageId}`);
            setWishlist(prev => prev.filter(item => item.packageId !== packageId));
        } catch (err) {
            console.error('Error removing from wishlist:', err);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await axios.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

   if (authLoading || !user) return (
        <div className="flex justify-center items-center h-64">
            <svg className="animate-spin h-10 w-10 text-[#0B1C3E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
   );

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex items-center gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 bg-gray-200">
                        {profilePic ? (
                            <img src={resolveBackendUrl(profilePic)} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-[#0B1C3E] text-white p-2 rounded-full cursor-pointer hover:bg-[#D4AF37] transition-colors shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                    </label>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-[#0B1C3E] mb-1">Hello, {user.name}</h1>
                    <p className="text-gray-500">Track your requests, follow status updates, and keep your saved packages in one place.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'bookings' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('bookings')}
                >
                    My Requests
                    {activeTab === 'bookings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'consultations' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('consultations')}
                >
                    Consultations
                    {activeTab === 'consultations' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'flights' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('flights')}
                >
                    My Flight Requests
                    {activeTab === 'flights' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'wishlist' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('wishlist')}
                >
                    Wishlist
                    {activeTab === 'wishlist' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'notifications' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('notifications')}
                >
                    Notifications
                    {activeTab === 'notifications' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
                <button
                    className={`pb-3 px-6 font-semibold text-sm transition-colors relative ${
                        activeTab === 'settings' ? 'text-[#0B1C3E]' : 'text-gray-500 hover:text-[#0B1C3E]'
                    }`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                    {activeTab === 'settings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37]"></span>}
                </button>
            </div>

            {/* Content */}
            {loadingData ? (
                <div className="flex justify-center items-center py-20">
                    <svg className="animate-spin h-10 w-10 text-[#0B1C3E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : (
                <div className="min-h-75">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TripCountdown trip={nextTrip} />
                        <WeatherWidget destination={nextTrip?.destination} />
                    </div>
                    <DestinationMap destination={nextTrip?.destination} />
                    <UserSpendingSummary bookings={bookings} />

                    {spendingData.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                            <h3 className="text-lg font-bold text-[#0B1C3E] mb-4">Estimated Value by Package Type</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={spendingData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {spendingData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bookings' && (
                        <div className="space-y-4">
                            {bookings.length > 0 ? (
                                bookings.map(booking => {
                                   const hasReviewed = userReviews.some(r => r.comment && r.comment.includes(`Review for ${booking.package?.title}`));
                                   
                                   return (
                                   <div key={booking.id || booking._id} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center hover:shadow-md transition-shadow">
                                        <div>
                                            <h3 className="font-bold text-lg text-[#0B1C3E]">{booking.package?.title || 'Travel Package'}</h3>
                                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                                                <p>📅 Preferred Travel Date: {booking.travelDate ? new Date(booking.travelDate).toLocaleDateString() : 'TBD'}</p>
                                                <p>👥 Travelers: {booking.passengers}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                getOperationalStatusBadgeClassName(booking.status)
                                            }`}>
                                                {getOperationalStatusLabel(booking.status)}
                                            </span>
                                            {(isOperationalConfirmedStatus(booking.status) || isOperationalCompletedStatus(booking.status)) && booking.travelDate && new Date(booking.travelDate) < new Date() && (
                                                hasReviewed ? (
                                                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <span className="text-yellow-500">★</span> Reviewed
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenReview(booking)}
                                                        className="text-xs text-[#0B1C3E] hover:text-[#D4AF37] font-medium underline flex items-center gap-1"
                                                    >
                                                        <span className="text-yellow-500">☆</span> Review Trip
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )})
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 mb-4">You have not sent a package request yet. Explore packages and send your first request when you are ready.</p>
                                    <Link to="/packages" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">
                                        Explore Packages
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'consultations' && (
                        <div className="space-y-4">
                            {consultations.length > 0 ? (
                                consultations.map(consultation => (
                                    <div key={consultation.id || consultation._id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-[#0B1C3E]">Private Consultation Request</h3>
                                                <p className="text-sm text-gray-600 mt-1">Requested for: {consultation.date} at {consultation.time}</p>
                                                {consultation.description && (
                                                    <p className="text-sm text-gray-500 mt-2 italic">"{consultation.description}"</p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                getOperationalStatusBadgeClassName(consultation.status)
                                            }`}>
                                                {getOperationalStatusLabel(consultation.status)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 mb-4">You have not requested a consultation yet.</p>
                                    <Link to="/book-consultation" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">
                                        Request Consultation
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'flights' && (
                        <div className="space-y-4">
                            {flights.length > 0 ? (
                                flights.map(flight => (
                                    <div 
                                        key={flight.id} 
                                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => setSelectedFlight(flight)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-[#0B1C3E]">{flight.from} ➝ {flight.to}</h3>
                                                <div className="text-sm text-gray-600 mt-1 space-y-1">
                                                    <p>📅 Departure: {new Date(flight.departureDate).toLocaleDateString()}</p>
                                                    {flight.returnDate && <p>🔙 Return: {new Date(flight.returnDate).toLocaleDateString()}</p>}
                                                    <p>👥 Passengers: {flight.passengers} ({flight.travelClass})</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                    getOperationalStatusBadgeClassName(flight.status)
                                                }`}>
                                                    {getOperationalStatusLabel(flight.status)}
                                                </span>
                                                {isOperationalOpenStatus(flight.status) && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCancelFlight(flight.id);
                                                        }}
                                                        className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                                                    >
                                                        Cancel Request
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 mb-4">You have not requested a flight quote yet.</p>
                                    <Link to="/book-flight" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">
                                        Request Flight Quote
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'wishlist' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {wishlist.length > 0 ? (
                                wishlist.map(item => (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        {item.package.images && item.package.images.length > 0 && (
                                            <div className="h-40 overflow-hidden">
                                                <img src={resolveBackendUrl(item.package.images[0])} alt={item.package.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h3 className="font-bold text-[#0B1C3E] mb-2 truncate">{item.package.title}</h3>
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.package.description}</p>
                                            <div className="flex justify-between items-center">
                                                <Link to={`/packages/${item.packageId}`} className="text-sm font-bold text-[#0B1C3E] hover:text-[#D4AF37]">
                                                    View Package
                                                </Link>
                                                <button onClick={() => handleRemoveFromWishlist(item.packageId)} className="text-red-500 hover:text-red-700 text-sm">
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500 mb-4">You have not saved any packages yet.</p>
                                    <Link to="/packages" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#1a2f55] transition-colors">Explore Packages</Link>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-4">
                            {notifications.length > 0 ? (
                                notifications.map(notification => (
                                    <div key={notification.id} className={`bg-white border rounded-lg p-4 transition-all ${notification.read ? 'border-gray-200' : 'border-l-4 border-l-[#D4AF37] border-gray-200 shadow-sm'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${notification.type === 'PRICE_DROP' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {notification.type ? notification.type.replace('_', ' ') : 'Alert'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{notification.message}</p>
                                            </div>
                                            {!notification.read && (
                                                <button onClick={() => handleMarkRead(notification.id)} className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4">
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">You have no updates right now.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            {/* Profile Information Form */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-bold text-[#0B1C3E] mb-4">Profile Information</h3>
                                {profileMessage && (
                                    <div className={`p-3 mb-4 rounded text-sm ${profileMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {profileMessage.text}
                                    </div>
                                )}
                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                            value={profileData.name}
                                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                        <textarea
                                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E] h-24"
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                            placeholder="Tell us a bit about yourself..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                            value={profileData.contactInfo}
                                            onChange={(e) => setProfileData({...profileData, contactInfo: e.target.value})}
                                            placeholder="Phone number or address"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-[#0B1C3E] text-white py-2 rounded hover:bg-[#1a2f55] transition-colors font-medium"
                                    >
                                        Save Changes
                                    </button>
                                </form>
                            </div>

                            {/* Change Password Form */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <h3 className="text-xl font-bold text-[#0B1C3E] mb-4">Change Password</h3>
                            {passwordMessage && (
                                <div className={`p-3 mb-4 rounded text-sm ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength="6"
                                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength="6"
                                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-[#0B1C3E] text-white py-2 rounded hover:bg-[#1a2f55] transition-colors font-medium"
                                >
                                    Update Password
                                </button>
                            </form>
                            </div>

                            {/* Delete Account Section */}
                            <div className="bg-white border border-red-200 rounded-lg p-6">
                                <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>
                                <p className="text-gray-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedFlight && (
                <FlightDetailsModal 
                    flight={selectedFlight} 
                    onClose={() => setSelectedFlight(null)} 
                />
            )}

            {showReviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6">
                        <h3 className="text-xl font-bold text-[#0B1C3E] mb-4">Rate Your Trip</h3>
                        <p className="text-sm text-gray-600 mb-4">How was your experience with <strong>{reviewBooking?.package?.title}</strong>?</p>
                        <form onSubmit={handleSubmitReview}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                                <select 
                                    value={reviewData.rating} 
                                    onChange={(e) => setReviewData({...reviewData, rating: parseInt(e.target.value)})}
                                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E]"
                                >
                                    <option value="5">5 - Excellent</option>
                                    <option value="4">4 - Very Good</option>
                                    <option value="3">3 - Good</option>
                                    <option value="2">2 - Fair</option>
                                    <option value="1">1 - Poor</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                                <textarea 
                                    value={reviewData.comment}
                                    onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-[#0B1C3E] h-24"
                                    required
                                ></textarea>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Photos (Max 5)</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*"
                                    onChange={handleReviewImageChange}
                                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0B1C3E] hover:file:bg-blue-100"
                                />
                                {reviewData.imagePreviews?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {reviewData.imagePreviews.map((url, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveReviewImage(idx)}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                    title="Remove image"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Videos (Max 2)</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="video/*"
                                    onChange={handleReviewVideoChange}
                                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0B1C3E] hover:file:bg-blue-100"
                                />
                                {reviewData.videoPreviews?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {reviewData.videoPreviews.map((url, idx) => (
                                            <div key={idx} className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm group bg-black">
                                                <video src={url} className="w-full h-full object-cover opacity-70" />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    </svg>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveReviewVideo(idx)}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                    title="Remove video"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowReviewModal(false)}
                                    disabled={uploading}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={uploading}
                                    className="px-4 py-2 bg-[#0B1C3E] text-white rounded hover:bg-[#1a2f55] disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
