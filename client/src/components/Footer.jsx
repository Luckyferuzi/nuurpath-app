import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import NewsletterForm from './NewsletterForm';

const footerLinks = [
  { to: '/packages', label: 'Packages' },
  { to: '/book-flight', label: 'Request Flight' },
  { to: '/contact', label: 'Contact' },
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
];

const CompactFooter = () => (
  <footer className="border-t border-[#e7dcc8] bg-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-[#4d5562] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div>
        <p className="font-black uppercase tracking-[0.18em] text-[#101c2d]">NuurPath International</p>
        <p className="mt-1 text-sm text-[#69717e]">
          Need help? Call or WhatsApp {CONFIG.CONTACT_PHONES}
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#101c2d]">
        {footerLinks.slice(0, 3).map((link) => (
          <Link key={link.to} to={link.to} className="transition-colors hover:text-[#8a7240]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  </footer>
);

const FullFooter = () => (
  <footer className="bg-[#0B1C3E] text-white">
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.2fr_0.9fr_0.8fr_1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">NuurPath</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-[2rem]">
              Guided travel support with clear next steps.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-300">
            Browse packages, send your request online, and continue important travel planning with the NuurPath team on WhatsApp.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-200">
            <Link to="/packages" className="transition-colors hover:text-white">Packages</Link>
            <Link to="/book-flight" className="transition-colors hover:text-white">Request Flight</Link>
            <Link to="/contact" className="transition-colors hover:text-white">Contact</Link>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">Reach Us</h3>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <li>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Phone / WhatsApp</span>
              <span>{CONFIG.CONTACT_PHONES}</span>
            </li>
            <li>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Office</span>
              <span>{CONFIG.ADDRESS}</span>
            </li>
            <li>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Working Hours</span>
              <span>Monday to Saturday, 9:00 AM to 6:00 PM</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">Browse</h3>
          <ul className="mt-5 space-y-4 text-sm font-semibold text-slate-200">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/login" className="transition-colors hover:text-white">
                Account Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">Newsletter</h3>
          <p className="mt-5 text-sm leading-7 text-slate-300">
            Receive important travel updates and selected package highlights.
          </p>
          <div className="mt-5">
            <NewsletterForm />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-400">
            {Object.entries(CONFIG.SOCIAL).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" className="capitalize transition-colors hover:text-white">
                {key}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 text-xs uppercase tracking-[0.22em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>(c) {new Date().getFullYear()} NuurPath International Ltd.</p>
        <Link to="/team" className="transition-colors hover:text-[#D4AF37]">
          Developed by Software Team
        </Link>
      </div>
    </div>
  </footer>
);

const Footer = ({ variant = 'full' }) => {
  if (variant === 'compact') {
    return <CompactFooter />;
  }

  return <FullFooter />;
};

export default Footer;
