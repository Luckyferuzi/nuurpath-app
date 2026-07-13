import React, { useMemo, useState } from 'react';
import axios from '../lib/api';
import { CONFIG } from '../config';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';

const faqItems = [
  {
    question: 'How do I start a package request?',
    answer: 'Browse the packages on the website, open the package you want, and send the request online. NuurPath then follows up directly with availability and the next step.',
  },
  {
    question: 'Do you help with visa guidance?',
    answer: 'Yes. If the service is offered by NuurPath, the website lets you send the first request and share the main details before direct follow-up begins.',
  },
  {
    question: 'Do I need to pay on the website?',
    answer: 'No. The website is mainly for browsing and sending the first serious request. Payment is handled outside the website after the team reviews the request.',
  },
  {
    question: 'What is the fastest way to reach the team?',
    answer: 'WhatsApp is usually the fastest follow-up channel after you have reviewed the information on the website or sent a request.',
  },
];

const subjectOptions = [
  'Package request support',
  'Flight request support',
  'Visa or document guidance',
  'General travel question',
];

function getPrimaryPhone() {
  return String(CONFIG.CONTACT_PHONES || '').split('/')[0]?.trim() || '';
}

function getPhoneHref() {
  return getPrimaryPhone().replace(/[^\d+]/g, '');
}

function getInputClassName() {
  return 'w-full rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#101c2d] placeholder:text-[#8d94a0] transition-colors focus:border-[#0B1C3E] focus:outline-none focus:ring-4 focus:ring-[#0B1C3E]/10';
}

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: subjectOptions[0],
    message: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  const [activeFaqIndex, setActiveFaqIndex] = useState(0);
  const whatsappUrl = useMemo(
    () => buildWhatsAppUrl('Hello NuurPath team, I would like travel guidance and would like to continue on WhatsApp.'),
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      };

      await axios.post('/contact', payload);

      setStatus({
        loading: false,
        error: '',
        success: 'Your message has been received. The NuurPath team will review it and respond with the next step.',
      });
      setFormData({
        name: '',
        email: '',
        subject: subjectOptions[0],
        message: '',
      });
    } catch (error) {
      setStatus({
        loading: false,
        error: error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || 'Something went wrong. Please try again or continue on WhatsApp.',
        success: '',
      });
    }
  };

  const inputClassName = getInputClassName();
  const contactCards = [
    {
      label: 'Phone / WhatsApp',
      value: CONFIG.CONTACT_PHONES,
      actionLabel: 'Call now',
      actionHref: `tel:${getPhoneHref()}`,
    },
    {
      label: 'Email',
      value: CONFIG.CONTACT_EMAIL,
      actionLabel: 'Send email',
      actionHref: `mailto:${CONFIG.CONTACT_EMAIL}`,
    },
    {
      label: 'Office',
      value: CONFIG.ADDRESS,
      actionLabel: 'Get directions',
      actionHref: 'https://www.google.com/maps?q=GSM+Plaza+Dar+es+Salaam',
    },
    {
      label: 'Working hours',
      value: CONFIG.OFFICE_HOURS,
      actionLabel: 'Open WhatsApp',
      actionHref: whatsappUrl,
    },
  ];

  return (
    <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
      <PublicPageHeader
        eyebrow="Contact NuurPath"
        title="A clearer place for customers to reach the team"
        description="Use this page to find the right contact path, office details, and simple answers before direct follow-up begins. The goal is to help customers move forward, not to ask for too much at once."
        actions={(
          <>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
            >
              Continue on WhatsApp
            </a>
            <a
              href={`tel:${getPhoneHref()}`}
              className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
            >
              Call NuurPath
            </a>
          </>
        )}
        aside={(
          <>
            <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Fastest path</p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                For most active requests, WhatsApp is the quickest way to continue after the website has captured the first important step.
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Trust note</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                The website is for guidance and request capture first. Human follow-up stays central to how NuurPath works.
              </p>
            </div>
          </>
        )}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Contact channels first</h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Customers should know exactly how to reach NuurPath before they are asked to write a message.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {contactCards.map((card) => (
                <article key={card.label} className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{card.label}</p>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#101c2d]">{card.value}</p>
                  <a
                    href={card.actionHref}
                    target={card.actionHref.startsWith('http') ? '_blank' : undefined}
                    rel={card.actionHref.startsWith('http') ? 'noreferrer' : undefined}
                    className="mt-4 inline-flex rounded-full border border-[#d8cfbf] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                  >
                    {card.actionLabel}
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Location and office context</h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Customers should also be able to see where NuurPath operates and when the office is available.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-[1.35rem] border border-[#ece4d6] bg-[#f7f3eb]">
                <div className="h-[280px] w-full">
                  <iframe
                    title="NuurPath office location"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    src="https://maps.google.com/maps?q=GSM+Plaza+Dar+es+Salaam&t=&z=13&ie=UTF8&iwloc=&output=embed"
                  />
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Office summary</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#5f6774]">
                  <div>
                    <p className="font-black text-[#101c2d]">Address</p>
                    <p>{CONFIG.ADDRESS}</p>
                  </div>
                  <div>
                    <p className="font-black text-[#101c2d]">Working hours</p>
                    <p>{CONFIG.OFFICE_HOURS}</p>
                  </div>
                  <div>
                    <p className="font-black text-[#101c2d]">Email</p>
                    <a href={`mailto:${CONFIG.CONTACT_EMAIL}`} className="transition-colors hover:text-[#101c2d]">
                      {CONFIG.CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Simple questions customers ask often</h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Keep the FAQ short, practical, and directly related to how customers move forward.
              </p>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = activeFaqIndex === index;

                return (
                  <article key={item.question} className="rounded-[1.25rem] border border-[#ece4d6] bg-[#fcfbf8] px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setActiveFaqIndex(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <span className="text-sm font-black text-[#101c2d]">{item.question}</span>
                      <span className="text-xl font-black text-[#8a7240]">{isOpen ? '-' : '+'}</span>
                    </button>
                    {isOpen ? (
                      <p className="mt-3 text-sm leading-7 text-[#5f6774]">{item.answer}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Message form</p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-[#101c2d]">Send a lighter travel question</h2>
            <p className="mt-3 text-sm leading-7 text-[#5f6774]">
              This form is secondary. Use it when a customer needs to leave a simple message after seeing the main contact details.
            </p>

            {status.success ? (
              <div className="mt-5 rounded-[1.2rem] border border-[#d7eadb] bg-[#f5fbf6] px-4 py-3 text-sm text-[#2d5f50]">
                {status.success}
              </div>
            ) : null}

            {status.error ? (
              <div className="mt-5 rounded-[1.2rem] border border-[#f0d7d7] bg-[#fff6f6] px-4 py-3 text-sm text-[#b84f4f]">
                {status.error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#101c2d]">Name</span>
                <input
                  type="text"
                  name="name"
                  required
                  className={inputClassName}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#101c2d]">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className={inputClassName}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#101c2d]">Subject</span>
                <select
                  name="subject"
                  className={inputClassName}
                  value={formData.subject}
                  onChange={handleChange}
                >
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#101c2d]">Message</span>
                <textarea
                  name="message"
                  required
                  className={`${inputClassName} min-h-[150px]`}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell NuurPath what help is needed, the destination, and any important timing."
                />
              </label>
              <button
                type="submit"
                disabled={status.loading}
                className="w-full rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status.loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </section>

          <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Support reminder</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              For active package, flight, or visa follow-up, customers usually move faster when they continue on WhatsApp after the first website step is complete.
            </p>
          </section>
        </aside>
      </div>
    </PublicPageShell>
  );
}
