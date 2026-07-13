import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';

const navigationLinks = [
  { to: '/packages', label: 'Packages' },
  { to: '/book-flight', label: 'Request Flight' },
  { to: '/contact', label: 'Contact' },
];

const legalLinks = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
];

function getPrimaryPhone() {
  return String(CONFIG.CONTACT_PHONES || '').split('/')[0]?.trim() || '';
}

function getPhoneHref() {
  return getPrimaryPhone().replace(/[^\d+]/g, '');
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
  <footer className="border-t border-[#e7dcc8] bg-[#f7f4ed] text-[#101c2d]">
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[#e5dece] bg-white px-6 py-10 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:px-8 lg:px-10 lg:py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">NuurPath</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#101c2d] sm:text-[2.5rem]">
              Clear travel support with calm human follow-up.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5f6774]">
              Browse packages, send the first request on the website, and continue the next step directly with the NuurPath team.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.')}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
              >
                WhatsApp NuurPath
              </a>
              <Link
                to="/contact"
                className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
              >
                Contact Page
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7240]">Contact</p>
              <div className="mt-5 space-y-5 text-sm leading-7 text-[#5f6774]">
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
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Hours</p>
                  <p className="mt-1">{CONFIG.OFFICE_HOURS}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7240]">Navigate</p>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#101c2d]">
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
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 text-xs uppercase tracking-[0.18em] text-[#7a725f] sm:flex-row sm:items-center sm:justify-between">
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
