import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../lib/api';
import { buildServiceInquiryWhatsAppUrl } from '../lib/whatsapp';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import {
  getServiceId,
  getServiceRequestMeta,
} from '../lib/servicePresentation.js';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';

const initialFormData = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  country: '',
  preferredDate: '',
  applicants: '',
  urgency: '',
  documentStatus: '',
  message: '',
};

const urgencyOptions = ['Normal', 'Soon', 'Urgent'];
const documentStatusOptions = [
  'Just starting',
  'Need help understanding requirements',
  'Documents partly ready',
  'Documents ready',
];

function formatDisplayDate(value) {
  if (!value) {
    return 'Not provided yet';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not provided yet';
  }

  return parsedDate.toLocaleDateString();
}

function getFieldClassName() {
  return 'w-full rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#101c2d] placeholder:text-[#8d94a0] transition-colors focus:border-[#0B1C3E] focus:outline-none focus:ring-4 focus:ring-[#0B1C3E]/10';
}

export default function ServiceInquiryForm() {
  const { serviceId } = useParams();
  const { user } = useAuth();
  const { services, servicesLoading } = usePublicContent();
  const service = useMemo(
    () => services.find((item) => String(getServiceId(item)) === String(serviceId)) || null,
    [services, serviceId]
  );
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contactName: user.name || prev.contactName,
      contactEmail: user.email || prev.contactEmail,
      contactPhone: user.contactInfo || prev.contactPhone,
    }));
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!service?.id) {
      setStatus('error');
      setErrorMessage('No service was selected for this request.');
      return;
    }

    if (formData.contactPhone.trim().length < 7) {
      setStatus('error');
      setErrorMessage('Please enter a valid phone or WhatsApp number.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        serviceId: service.id,
        serviceType: service.title,
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        country: formData.country.trim(),
        preferredDate: formData.preferredDate || undefined,
        applicants: formData.applicants ? parseInt(formData.applicants, 10) : undefined,
        urgency: formData.urgency || undefined,
        documentStatus: formData.documentStatus || undefined,
        message: formData.message.trim(),
      };

      const response = await axios.post('/services/inquiries', payload);
      const inquiry = response.data || {};
      const inquiryId = inquiry.inquiryId || inquiry.id;
      const serviceTitle = inquiry.serviceTitle || inquiry.serviceType || service.title || 'Service Request';
      const whatsappUrl = buildServiceInquiryWhatsAppUrl({
        inquiryId,
        contactName: payload.contactName,
        serviceTitle,
        country: payload.country,
        preferredDate: payload.preferredDate,
        message: payload.message,
      });

      setSuccessDetails({
        inquiryId,
        serviceTitle,
        country: payload.country,
        preferredDate: payload.preferredDate,
        applicants: payload.applicants,
        whatsappUrl,
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error.response?.data?.msg
          || error.message
          || 'Something went wrong. Please try again or contact us on WhatsApp.'
      );
    }
  };

  if (servicesLoading && !service) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <div className="rounded-[1.8rem] border border-[#e5dece] bg-white p-10 text-center text-[#5f6774] shadow-sm">
          Loading the selected service...
        </div>
      </PublicPageShell>
    );
  }

  if (!service) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <div className="rounded-[1.8rem] border border-[#f0d7d7] bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#101c2d]">Service not available</h1>
          <p className="mt-4 text-sm leading-7 text-[#5f6774]">
            This service could not be found right now. You can return to the homepage and choose another support path.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
            >
              Back to Home
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
            >
              Contact NuurPath
            </Link>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  const meta = getServiceRequestMeta(service);
  const fieldClassName = getFieldClassName();
  const secondarySuccessPath = meta.intent === 'package' ? '/packages' : '/';
  const secondarySuccessLabel = meta.intent === 'package' ? 'Explore Packages' : 'Back to Home';

  if (status === 'success' && successDetails) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <PublicPageHeader
          eyebrow={meta.eyebrow}
          title="Your service request has been received"
          description="The important first step has already been captured on the website. The NuurPath team will review your request and continue with you on WhatsApp using the number you submitted."
          aside={(
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Reference</p>
              <p className="mt-3 text-3xl font-black">#{successDetails.inquiryId}</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Keep this number if you want to reference the request during follow-up.
              </p>
            </div>
          )}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[1.7rem] border border-[#d7eadb] bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-[1.35rem] border border-[#d7eadb] bg-[#f5fbf6] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2d5f50]">Request snapshot</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.1rem] bg-white p-4 sm:col-span-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Service</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.serviceTitle}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.countryLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.country || 'Not provided yet'}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.preferredDateLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(successDetails.preferredDate)}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.applicantsLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.applicants || 'Not provided yet'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <h2 className="text-xl font-black tracking-tight text-[#101c2d]">What happens next</h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6774]">
                {meta.whatWeReview.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-7 text-[#5f6774]">{meta.paymentNote}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={successDetails.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-full bg-[#25D366] px-6 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-95"
              >
                Continue on WhatsApp
              </a>
              <Link
                to={secondarySuccessPath}
                className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
              >
                {secondarySuccessLabel}
              </Link>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Selected service</p>
              <h2 className="mt-3 text-xl font-black tracking-tight text-[#101c2d]">{service.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                {service.description || meta.cardDescription}
              </p>
            </section>

            <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Response note</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{meta.responseNote}</p>
            </section>
          </aside>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
      <PublicPageHeader
        eyebrow={meta.eyebrow}
        title={meta.heading}
        description={meta.intro}
        aside={(
          <>
            <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Selected service</p>
              <p className="mt-3 text-lg font-black text-[#101c2d]">{service.title}</p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                {service.description || meta.cardDescription}
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">No online payment</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">{meta.paymentNote}</p>
            </div>
          </>
        )}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
          <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5 text-sm leading-7 text-[#5f6774]">
            {meta.helper}
          </div>

          {status === 'error' && errorMessage ? (
            <div className="mt-6 rounded-[1.2rem] border border-[#f0d7d7] bg-[#fff6f6] px-4 py-3 text-sm text-[#b84f4f]">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-8">
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Contact details</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  These details are used for the human follow-up after the team reviews your request.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Contact name</span>
                  <input
                    type="text"
                    name="contactName"
                    required
                    className={fieldClassName}
                    value={formData.contactName}
                    onChange={handleChange}
                    placeholder="Your full name"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Contact email</span>
                  <input
                    type="email"
                    name="contactEmail"
                    required
                    className={fieldClassName}
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Phone or WhatsApp number</span>
                  <input
                    type="tel"
                    name="contactPhone"
                    required
                    className={fieldClassName}
                    value={formData.contactPhone}
                    onChange={handleChange}
                    placeholder="The number NuurPath should use for follow-up"
                  />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Request details</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  Share the destination, timeline, and how ready you already are so the team can guide the next step properly.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">{meta.countryLabel}</span>
                  <input
                    type="text"
                    name="country"
                    className={fieldClassName}
                    value={formData.country}
                    onChange={handleChange}
                    placeholder={meta.countryPlaceholder}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">{meta.preferredDateLabel}</span>
                  <input
                    type="date"
                    name="preferredDate"
                    className={fieldClassName}
                    value={formData.preferredDate}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">{meta.applicantsLabel}</span>
                  <input
                    type="number"
                    name="applicants"
                    min="1"
                    className={fieldClassName}
                    value={formData.applicants}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Urgency</span>
                  <select
                    name="urgency"
                    className={fieldClassName}
                    value={formData.urgency}
                    onChange={handleChange}
                  >
                    <option value="">Select urgency</option>
                    {urgencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Document status</span>
                  <select
                    name="documentStatus"
                    className={fieldClassName}
                    value={formData.documentStatus}
                    onChange={handleChange}
                  >
                    <option value="">Select document status</option>
                    {documentStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Your request</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  Give the team enough context to understand what you need before the conversation continues on WhatsApp.
                </p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#101c2d]">{meta.messageLabel}</span>
                <textarea
                  name="message"
                  required
                  className={`${fieldClassName} min-h-[140px]`}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={meta.messagePlaceholder}
                />
              </label>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-7 text-[#5f6774]">
                The website captures the first serious request step. Any payment instruction or final confirmation is handled by the team only after review.
              </p>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="rounded-full bg-[#0B1C3E] px-7 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Sending Request...' : meta.submitLabel}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.summaryTitle}</p>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.countryLabel}</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.country || 'Not provided yet'}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.preferredDateLabel}</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(formData.preferredDate)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.applicantsLabel}</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.applicants || 'Not provided yet'}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Document status</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.documentStatus || 'Not provided yet'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">{meta.checklistTitle}</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6774]">
              {meta.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Response note</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">{meta.responseNote}</p>
          </section>
        </aside>
      </div>
    </PublicPageShell>
  );
}
