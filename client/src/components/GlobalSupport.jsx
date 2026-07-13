import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import { buildWhatsAppUrl } from '../lib/whatsapp';

const supportActions = [
  {
    title: 'Speak with the team',
    description: 'Use WhatsApp for direct follow-up after you have reviewed the information on the website.',
    href: buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.'),
    label: 'Open WhatsApp',
    external: true,
  },
  {
    title: 'Call NuurPath',
    description: 'Reach the office directly if you need a quick human response during working hours.',
    href: `tel:${String(CONFIG.CONTACT_PHONES || '').split('/')[0].replace(/[^\d+]/g, '')}`,
    label: 'Call Office',
    external: false,
  },
  {
    title: 'Use the contact page',
    description: 'View office details, location guidance, and a lighter message form in one place.',
    href: '/contact',
    label: 'View Contact Page',
    external: false,
  },
];

const GlobalSupport = () => (
  <section className="bg-[#f7f6f2] py-16 sm:py-20">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[1.85rem] border border-[#e6dece] bg-white shadow-[0_16px_40px_rgba(16,28,45,0.06)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">Need Help?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
              Reach NuurPath in the way that suits the next step.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f6774]">
              The website helps customers complete the first important step clearly. When direct support is needed, NuurPath continues with practical human follow-up.
            </p>

            <div className="mt-8 grid gap-4">
              {supportActions.map((action) => (
                <article key={action.title} className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
                  <h3 className="text-lg font-black text-[#101c2d]">{action.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5f6774]">{action.description}</p>
                  {action.external ? (
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
                    >
                      {action.label}
                    </a>
                  ) : action.href.startsWith('tel:') ? (
                    <a
                      href={action.href}
                      className="mt-4 inline-flex rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
                    >
                      {action.label}
                    </a>
                  ) : (
                    <Link
                      to={action.href}
                      className="mt-4 inline-flex rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
                    >
                      {action.label}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="bg-[#0B1C3E] px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Trust Notes</p>
            <div className="mt-5 space-y-5 text-sm leading-7 text-slate-200">
              <p>Requests are reviewed by the team before any final confirmation step is given.</p>
              <p>No online payment is collected on the website unless NuurPath clearly states otherwise.</p>
              <p>Office support remains available during {CONFIG.OFFICE_HOURS.toLowerCase()}.</p>
            </div>

            <div className="mt-8 rounded-[1.35rem] border border-white/10 bg-white/6 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Office details</p>
              <p className="mt-3 text-sm leading-7 text-slate-100">{CONFIG.ADDRESS}</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">{CONFIG.CONTACT_PHONES}</p>
              <a href={`mailto:${CONFIG.CONTACT_EMAIL}`} className="mt-2 block text-sm font-semibold text-white transition-colors hover:text-[#D4AF37]">
                {CONFIG.CONTACT_EMAIL}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </section>
);

export default GlobalSupport;
