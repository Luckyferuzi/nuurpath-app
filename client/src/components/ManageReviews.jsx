import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/reviews`);
      setReviews(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews.');
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (id) => {
    try {
      await axios.put(`${CONFIG.API_BASE_URL}/reviews/${id}/toggle`);
      
      setReviews(reviews.map(r => 
        r.id === id ? { ...r, isVisible: !r.isVisible } : r
      ));
    } catch (err) {
      alert('Failed to update review status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`${CONFIG.API_BASE_URL}/reviews/${id}`);
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading reviews...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  const headerClass = "px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider";

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-[#0B1C3E] mb-6">Manage Reviews</h2>
      
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
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
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