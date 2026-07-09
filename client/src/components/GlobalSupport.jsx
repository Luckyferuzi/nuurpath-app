import React, { useState } from 'react';
import axios from '../lib/api';
import { CONFIG } from '../config';
import { buildWhatsAppUrl } from '../lib/whatsapp';

const GlobalSupport = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const whatsappUrl = buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await axios.post(`/contact`, {
        ...formData,
        subject: 'Global Support Request'
      });
      setStatus({
        type: 'success',
        message: 'Your request has been received. Our team will review it and continue with you on WhatsApp.'
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Something went wrong. Please try again or contact us on WhatsApp.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-4xl my-20">
      <div className="bg-white p-8 md:p-16 rounded-[3rem] shadow-2xl border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[#006837] mb-4 leading-none">Need Travel Guidance?</h1>
        <p className="text-gray-600 text-base md:text-lg mb-4 max-w-2xl">
          Share your package, flight, visa, passport, or general travel question here. You can start online and continue with the NuurPath team on WhatsApp.
        </p>
        <p className="text-gray-400 font-bold text-[10px] uppercase mb-2 tracking-[3px]">NuurPath HQ - GSM PLAZA, 2nd Floor</p>
        <p className="text-gray-400 font-bold text-[10px] uppercase mb-6 tracking-[3px]">Phone: {CONFIG.CONTACT_PHONES}</p>
        <div className="mb-8">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl bg-[#25D366] px-6 py-3 font-bold text-white transition-transform hover:scale-[1.02]"
          >
            Chat with NuurPath
          </a>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <input name="name" value={formData.name} onChange={handleChange} type="text" placeholder="Full Name" className="p-4 bg-gray-50 border rounded-2xl outline-none font-bold w-full" required />
          <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className="p-4 bg-gray-50 border rounded-2xl outline-none font-bold w-full" required />
          <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Tell us what kind of travel support you need, your destination, and any preferred dates." className="md:col-span-2 p-4 bg-gray-50 border rounded-2xl outline-none font-bold h-32 w-full" required></textarea>
          <button type="submit" disabled={loading} className="md:col-span-2 bg-[#006837] text-white p-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#00502a] transition-colors disabled:opacity-70">
            {loading ? 'Sending...' : 'Send Travel Request'}
          </button>
          {status && <p className={`md:col-span-2 text-center font-bold ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{status.message}</p>}
        </form>
      </div>
    </div>
  );
};

export default GlobalSupport;
