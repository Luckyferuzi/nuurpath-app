import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const ManageTerms = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/content/terms`);
        setContent(response.data.content || '');
        setMessage(null); // Clear previous messages on successful fetch
      } catch (error) {
        console.error('Error fetching terms of use:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${CONFIG.API_BASE_URL}/content/terms`, { content }, {
        headers: { 'x-auth-token': token }
      });
      setMessage({ type: 'success', text: 'Terms of Use updated successfully!' }); // User-facing success
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update Terms of Use.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h2 className="text-3xl font-bold text-[#0B1C3E] mb-8">Manage Terms of Use</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        {message && (
          <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-96 p-4 border rounded-lg mb-4 font-mono text-sm" placeholder="Enter Terms of Use content here..." required />
          <button type="submit" disabled={saving} className="bg-[#006837] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#00502a] transition-colors disabled:opacity-70">{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
};

export default ManageTerms;