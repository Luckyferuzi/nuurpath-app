//Users/issatende/Projects/nuurpath-travels/client/src/components/GlobalSupport.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const GlobalSupport = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/contact`, {
        ...formData,
        subject: 'Global Support Request'
      });
      setStatus({ type: 'success', message: 'Request sent successfully!' });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to send request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl my-20">
      <div className="bg-white p-8 md:p-16 rounded-[3rem] shadow-2xl border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[#006837] mb-4 leading-none">Global Support</h1>
        <p className="text-gray-400 font-bold text-[10px] uppercase mb-2 tracking-[3px]">NuurPath HQ • GSM PLAZA, 2nd Floor</p>
        <p className="text-gray-400 font-bold text-[10px] uppercase mb-12 tracking-[3px]">📞 {CONFIG.CONTACT_PHONES}</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Full Name" className="p-4 bg-gray-50 border rounded-2xl outline-none font-bold w-full" required />
          <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className="p-4 bg-gray-50 border rounded-2xl outline-none font-bold w-full" required />
          <textarea name="message" value={formData.message} onChange={handleChange} placeholder="How can we help?" className="md:col-span-2 p-4 bg-gray-50 border rounded-2xl outline-none font-bold h-32 w-full" required></textarea>
          <button type="submit" disabled={loading} className="md:col-span-2 bg-[#006837] text-white p-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#00502a] transition-colors disabled:opacity-70">
            {loading ? 'Sending...' : 'Send Request'}
          </button>
          {status && <p className={`md:col-span-2 text-center font-bold ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{status.message}</p>}
        </form>
      </div>
    </div>
  );
};

export default GlobalSupport;
