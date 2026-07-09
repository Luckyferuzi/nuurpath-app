import React, { useEffect, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';

const ManageReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`/reviews?all=true`);
      setReviews(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.response?.data?.msg || err.message || 'Failed to load reviews.');
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (id) => {
    try {
      setError(null);
      await axios.put(`/reviews/${id}/toggle`);
      
      setReviews(reviews.map(r => 
        r.id === id ? { ...r, isVisible: !r.isVisible } : r
      ));
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update review status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      setError(null);
      await axios.delete(`/reviews/${id}`);
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete review.');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading reviews...</div>;
  if (error && reviews.length === 0) return <div className="p-10 text-center text-red-600">{error}</div>;

  const headerClass = "px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider";

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-[#0B1C3E] mb-6">Manage Reviews</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}
      
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className={headerClass}>Date</th>
              <th className={headerClass}>User</th>
              <th className={headerClass}>Rating</th>
              <th className={headerClass}>Comment</th>
              <th className={headerClass}>Status</th>
              <th className={headerClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {new Date(review.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="font-bold">{review.name}</p>
                  <p className="text-xs text-gray-500">{review.user?.email}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-yellow-500 font-bold">
                  {'★'.repeat(review.rating)}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm max-w-xs truncate">
                  {review.comment}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${review.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {review.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button 
                    onClick={() => handleToggleVisibility(review.id)}
                    className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                  >
                    {review.isVisible ? 'Hide' : 'Approve'}
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(review.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan="6" className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageReviews;
