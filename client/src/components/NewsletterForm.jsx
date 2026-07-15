import React, { useState } from 'react';
import axios from '../lib/api';

const NewsletterForm = ({ variant = 'footer' }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const isPanelVariant = variant === 'panel';

  const handleSubscribe = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await axios.post('/newsletter/subscribe', {
        name: trimmedName,
        email: trimmedEmail,
      });
      setStatus('success');
      setMessage(response.data?.message || 'Subscribed successfully!');
      setName('');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || err.response?.data?.msg || 'Failed to subscribe.');
    }
  };

  if (isPanelVariant) {
    return (
      <form onSubmit={handleSubscribe} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#101c2d]">Full name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            className="w-full rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#101c2d]">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full rounded-full bg-[#101c2d] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Joining...' : 'Join Newsletter'}
        </button>
        <p className="text-xs leading-6 text-[#7a828f]">
          Simple updates only. Your name helps us keep future greetings personal and professional.
        </p>
        {message && (
          <p className={`text-sm ${status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
      <input
        type="text"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none transition-colors placeholder:text-gray-400 focus:border-[#D4AF37]"
      />
      <div className="flex">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="w-full rounded-l-xl border border-white/10 bg-white/5 p-3 text-xs text-white outline-none transition-colors focus:border-[#D4AF37]"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-r-xl bg-[#D4AF37] px-4 text-[10px] font-bold uppercase text-[#0B1C3E] transition-colors hover:bg-white disabled:opacity-70"
        >
          {status === 'loading' ? '...' : 'Join'}
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        Simple updates only. We now keep your name with your email for cleaner future greetings.
      </p>
      {message && (
        <p className={`text-[10px] ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </form>
  );
};

export default NewsletterForm;
