import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import NewsletterForm from './NewsletterForm';

const navigationLinks = [
  { to: '/packages', label: 'Packages' },
  { to: '/book-flight', label: 'Request Flight' },
  { to: '/contact', label: 'Contact' },
  { to: '/team', label: 'Our Team' },
];

const legalLinks = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/login', label: 'Account Login' },
];

function getPrimaryPhone() {
  return String(CONFIG.CONTACT_PHONES || '').split('/')[0]?.trim() || '';
}

function getPhoneHref() {
  return getPrimaryPhone().replace(/[^\d+]/g, '');
}

function getSocialLabel(key) {
  if (key === 'twitter') {
    return 'X';
  }

  return key.charAt(0).toUpperCase() + key.slice(1);
}

const CompactFooter = () => (
  <footer className="border-t border-[#e7dcc8] bg-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-[#4d5562] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div>
        <p className="font-black uppercase tracking-[0.18em] text-[#101c2d]">NuurPath International</p>
        <p className="mt-1 text-sm text-[#69717e]">
          Clear travel support, direct follow-up, and practical next steps.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#101c2d]">
        <a href={`tel:${getPhoneHref()}`} className="transition-colors hover:text-[#8a7240]">
          Call
        </a>
        <a href={buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.')} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#8a7240]">
          WhatsApp
        </a>
        <Link to="/contact" className="transition-colors hover:text-[#8a7240]">
          Contact
        </Link>
      </div>
    </div>
  </footer>
);

const FullFooter = () => (
  <footer className="border-t border-[#e7dcc8] bg-[#f3efe7] text-[#101c2d]">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-[1.75rem] border border-[#e3dacb] bg-white px-6 py-8 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_0.8fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">NuurPath</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-[2.4rem]">
              Travel support that stays clear from the first step.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#5f6774]">
              Browse packages, send your request on the website, and continue with the NuurPath team through direct human follow-up.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.')}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
              >
                WhatsApp NuurPath
              </a>
              <a
                href={`tel:${getPhoneHref()}`}
                className="rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
              >
                Call Now
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7240]">Reach us</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#5f6774]">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Phone / WhatsApp</p>
                  <p className="mt-1 font-semibold text-[#101c2d]">{CONFIG.CONTACT_PHONES}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Email</p>
                  <a href={`mailto:${CONFIG.CONTACT_EMAIL}`} className="mt-1 block font-semibold text-[#101c2d] transition-colors hover:text-[#8a7240]">
                    {CONFIG.CONTACT_EMAIL}
                  </a>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Office</p>
                  <p className="mt-1">{CONFIG.ADDRESS}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Hours</p>
                  <p className="mt-1">{CONFIG.OFFICE_HOURS}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#5f6774]">
              {Object.entries(CONFIG.SOCIAL).map(([key, url]) => (
                <a key={key} href={url} target="_blank" rel="noreferrer" className="transition-colors hover:text-[#101c2d]">
                  {getSocialLabel(key)}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7240]">Browse</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-[#101c2d]">
                {navigationLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="transition-colors hover:text-[#8a7240]">
                    {link.label}
                  </Link>
                ))}
                {legalLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="transition-colors hover:text-[#8a7240]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Newsletter</p>
              <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                Receive selected package highlights and practical travel updates from NuurPath.
              </p>
              <div className="mt-4">
                <NewsletterForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 text-xs uppercase tracking-[0.18em] text-[#7a725f] sm:flex-row sm:items-center sm:justify-between">
        <p>(c) {new Date().getFullYear()} NuurPath International Ltd.</p>
        <p>Human follow-up. No online payment on the website.</p>
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
