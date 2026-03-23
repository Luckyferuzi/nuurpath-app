import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';
import { Link } from 'react-router-dom';

const UserBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/bookings`);
      setBookings(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings.');
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    try {
      await axios.put(`${CONFIG.API_BASE_URL}/bookings/${id}/cancel`);
      
      // Update local state
      setBookings(bookings.map(b => 
        b.id === id ? { ...b, status: 'Cancelled' } : b
      ));
    } catch (err) {
      alert('Failed to cancel booking: ' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) return <div className="p-10 text-center">Loading your bookings...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-[#0B1C3E] mb-6">My Bookings</h2>
      
      {bookings.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">You haven't booked any trips yet.</p>
          <Link to="/packages" className="inline-block bg-[#0B1C3E] text-white px-6 py-2 rounded hover:bg-[#1a2f55] transition-colors">
            Browse Packages
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 
                    booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status}
                  </span>
                  <span className="text-gray-500 text-sm">#{booking.id}</span>
                </div>
                <h3 className="text-xl font-bold text-[#0B1C3E] mb-1">
                  {booking.package?.title || 'Unknown Package'}
                </h3>
                <p className="text-gray-600">
                  <span className="font-semibold">Travel Date:</span> {new Date(booking.travelDate).toLocaleDateString()}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Passengers:</span> {booking.passengers}
                </p>
              </div>
              
              <div>
                {booking.status !== 'Cancelled' && (
                  <button 
                    onClick={() => handleCancel(booking.id)}
                    className="px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBookings;