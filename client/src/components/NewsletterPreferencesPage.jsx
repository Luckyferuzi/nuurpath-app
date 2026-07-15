import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from '../lib/api';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import { markNewsletterOptedOut } from '../lib/newsletterPreferences.js';

const NewsletterPreferencesPage = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => String(searchParams.get('email') || '').trim(), [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus('error');
      setMessage('Please enter the email address you want us to remove from future updates.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await axios.post('/newsletter/unsubscribe', {
        email: trimmedEmail,
      });
      markNewsletterOptedOut();
      setStatus('success');
      setMessage(response.data?.message || 'You have been unsubscribed successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || error.response?.data?.msg || 'We could not update your email preferences right now.');
    }
  };

  return (
    <PublicPageShell contentClassName="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-5xl space-y-8">
        <PublicPageHeader
          eyebrow="Email Preferences"
          title="Manage your NuurPath travel updates"
          description="Use this page if you would like to stop receiving newsletter and campaign-style email updates from NuurPath."
          aside={(
            <>
              <div className="rounded-[1.4rem] border border-[#ebe3d2] bg-[#fbfaf7] px-4 py-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">What changes</div>
                <p className="mt-2 text-sm leading-6 text-[#5f6774]">
                  We will stop future newsletter and campaign-style emails for this address and keep the preference aligned where possible.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[#ebe3d2] bg-white px-4 py-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Need updates again later?</div>
                <p className="mt-2 text-sm leading-6 text-[#5f6774]">
                  You can subscribe again at any time from the homepage newsletter section.
                </p>
              </div>
            </>
          )}
        />

        <section className="rounded-[1.75rem] border border-[#e6decc] bg-white p-6 shadow-[0_16px_40px_rgba(16,28,45,0.06)] sm:p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black text-[#101c2d]">Update your preference</h2>
            <p className="mt-3 text-sm leading-7 text-[#5f6774]">
              Enter the email address that should no longer receive these updates.
            </p>
          </div>

          <form onSubmit={handleUnsubscribe} className="mt-8 max-w-2xl space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#101c2d]">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'loading' ? 'Updating...' : 'Stop Email Updates'}
              </button>
              <Link
                to="/"
                className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#faf8f3]"
              >
                Return Home
              </Link>
            </div>

            {message ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${
                status === 'success'
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            ) : null}
          </form>
        </section>
      </div>
    </PublicPageShell>
  );
};

export default NewsletterPreferencesPage;
