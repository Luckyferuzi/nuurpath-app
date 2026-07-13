import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/api';
import { buildFlightRequestWhatsAppUrl } from '../lib/whatsapp';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';

const initialFormData = {
  from: '',
  to: '',
  departureDate: '',
  returnDate: '',
  passengers: 1,
  travelClass: 'Economy',
  tripType: 'One Way',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

const requestSteps = [
  'Send the route, dates, and traveler details on the website.',
  'NuurPath reviews suitable flight options and the timing of the request.',
  'Our team continues with you on WhatsApp for quotation and the next step.',
];

const reviewPoints = [
  'Route and timing suitability',
  'Trip type, passenger count, and cabin preference',
  'The best next step before any offline payment or ticket confirmation',
];

function getInitialFormData(user) {
  return {
    ...initialFormData,
    contactName: user?.name || '',
    contactEmail: user?.email || '',
    contactPhone: user?.contactInfo || '',
  };
}

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

export default function FlightBookingForm() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => getInitialFormData(user));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

    setFormData((prev) => {
      if (name === 'tripType') {
        return {
          ...prev,
          tripType: value,
          returnDate: value === 'Round Trip' ? prev.returnDate : '',
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleReset = () => {
    setSuccessDetails(null);
    setError('');
    setLoading(false);
    setFormData(getInitialFormData(user));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const trimmedFrom = formData.from.trim();
    const trimmedTo = formData.to.trim();
    const trimmedName = formData.contactName.trim();
    const trimmedEmail = formData.contactEmail.trim();
    const trimmedPhone = formData.contactPhone.trim();
    const passengerCount = parseInt(formData.passengers, 10);
    const isRoundTrip = formData.tripType === 'Round Trip';

    if (trimmedPhone.length < 7) {
      setLoading(false);
      setError('Please enter a valid phone or WhatsApp number.');
      return;
    }

    if (trimmedFrom.toLowerCase() === trimmedTo.toLowerCase()) {
      setLoading(false);
      setError('Departure and destination cannot be the same.');
      return;
    }

    if (isRoundTrip && !formData.returnDate) {
      setLoading(false);
      setError('Please select the return date for a round trip request.');
      return;
    }

    if (formData.returnDate) {
      const departureDate = new Date(formData.departureDate);
      const returnDate = new Date(formData.returnDate);

      if (returnDate < departureDate) {
        setLoading(false);
        setError('Return date cannot be earlier than departure date.');
        return;
      }
    }

    try {
      const payload = {
        from: trimmedFrom,
        to: trimmedTo,
        departureDate: formData.departureDate,
        returnDate: isRoundTrip ? formData.returnDate || null : null,
        passengers: passengerCount,
        travelClass: formData.travelClass,
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
      };

      const response = await axios.post('/flights', payload);
      const request = response.data || {};
      const requestId = request.requestId || request.id;
      const resolvedTripType = request.tripType || (payload.returnDate ? 'Round Trip' : 'One Way');
      const whatsappUrl = buildFlightRequestWhatsAppUrl({
        requestId,
        contactName: request.contactName || trimmedName,
        from: request.from || trimmedFrom,
        to: request.to || trimmedTo,
        departureDate: request.departureDate || payload.departureDate,
        returnDate: request.returnDate || payload.returnDate,
        passengers: request.passengers || passengerCount,
        tripType: resolvedTripType,
      });

      setSuccessDetails({
        requestId,
        from: request.from || trimmedFrom,
        to: request.to || trimmedTo,
        departureDate: request.departureDate || payload.departureDate,
        returnDate: request.returnDate || payload.returnDate,
        passengers: request.passengers || passengerCount,
        tripType: resolvedTripType,
        travelClass: request.travelClass || payload.travelClass,
        whatsappUrl,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg
          || requestError.message
          || 'Something went wrong. Please try again or contact us on WhatsApp.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldClassName = getFieldClassName();
  const routeSummary = useMemo(() => {
    if (!formData.from && !formData.to) {
      return 'Route not selected yet';
    }

    return `${formData.from || 'Departure'} to ${formData.to || 'Destination'}`;
  }, [formData.from, formData.to]);

  if (successDetails) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <PublicPageHeader
          eyebrow="Flight request sent"
          title="Your flight request has been received"
          description="The route and traveler details are now with the NuurPath team. We will review flight options and continue with you on WhatsApp for quotation and the next step."
          aside={(
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Reference</p>
              <p className="mt-3 text-3xl font-black">#{successDetails.requestId}</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Keep this number for quick follow-up if you contact NuurPath.
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
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Route</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.from} to {successDetails.to}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Departure</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(successDetails.departureDate)}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Trip type</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.tripType}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Passengers</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.passengers}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Cabin</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.travelClass}</p>
                </div>
                {successDetails.returnDate ? (
                  <div className="rounded-[1.1rem] bg-white p-4 sm:col-span-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Return date</p>
                    <p className="mt-2 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(successDetails.returnDate)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <h2 className="text-xl font-black tracking-tight text-[#101c2d]">What happens next</h2>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-[#5f6774]">
                {requestSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B1C3E] text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm leading-7 text-[#5f6774]">
                No online payment is required on the website. Any confirmed quote or payment step is explained by the team only after they review your request.
              </p>
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
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard?tab=flights')}
                  className="rounded-full border border-[#0B1C3E] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#0B1C3E] transition-colors hover:bg-[#faf8f3]"
                >
                  View My Requests
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                >
                  Send Another Request
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Payment note</p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Flight payment is not handled on the website. NuurPath first confirms the route and options, then explains the offline payment step if the customer is ready to continue.
              </p>
            </section>

            <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Next action</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Staff will use the phone number already submitted here for direct follow-up after reviewing your flight request.
              </p>
            </section>
          </aside>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
      <PublicPageHeader
        eyebrow="Flight request"
        title="Request a flight quote with a clearer first step"
        description="Use the website to submit the route, trip type, dates, and traveler details before WhatsApp continuation. This helps the NuurPath team review the request seriously before they contact you."
        aside={(
          <>
            <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">No online payment</p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Flight requests are reviewed first. If you decide to continue after quotation, the team explains the offline payment step directly.
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Follow-up</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                The number you submit here is the same number the team will use for WhatsApp continuation after reviewing the route.
              </p>
            </div>
          </>
        )}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
          {error ? (
            <div className="mb-6 rounded-[1.2rem] border border-[#f0d7d7] bg-[#fff6f6] px-4 py-3 text-sm text-[#b84f4f]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Route and trip type</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  Start with the route and the shape of the trip so the team can review the right options.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">From</span>
                  <input
                    type="text"
                    name="from"
                    required
                    className={fieldClassName}
                    value={formData.from}
                    onChange={handleChange}
                    placeholder="City or airport"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">To</span>
                  <input
                    type="text"
                    name="to"
                    required
                    className={fieldClassName}
                    value={formData.to}
                    onChange={handleChange}
                    placeholder="City or airport"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['One Way', 'Round Trip'].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-start gap-3 rounded-[1.2rem] border px-4 py-4 transition-colors ${
                      formData.tripType === option
                        ? 'border-[#0B1C3E] bg-[#f5f8ff]'
                        : 'border-[#e5dece] bg-[#fcfbf8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tripType"
                      value={option}
                      checked={formData.tripType === option}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#101c2d]">{option}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#5f6774]">
                        {option === 'Round Trip'
                          ? 'Include both departure and return dates.'
                          : 'Share the outbound plan first and continue from there.'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Schedule and traveler details</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  Add the dates, passenger count, and cabin preference the team should review first.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Departure date</span>
                  <input
                    type="date"
                    name="departureDate"
                    required
                    className={fieldClassName}
                    value={formData.departureDate}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Return date</span>
                  <input
                    type="date"
                    name="returnDate"
                    disabled={formData.tripType !== 'Round Trip'}
                    className={`${fieldClassName} disabled:cursor-not-allowed disabled:bg-[#f3f1eb] disabled:text-[#9aa2af]`}
                    value={formData.returnDate}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Passengers</span>
                  <input
                    type="number"
                    name="passengers"
                    min="1"
                    required
                    className={fieldClassName}
                    value={formData.passengers}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Cabin class</span>
                  <select
                    name="travelClass"
                    className={fieldClassName}
                    value={formData.travelClass}
                    onChange={handleChange}
                  >
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First Class</option>
                  </select>
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Contact for follow-up</h2>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  These details are used for the route follow-up after review.
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-7 text-[#5f6774]">
                The website records the first serious step, but quotation and any payment instruction only happen after human review from NuurPath.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#0B1C3E] px-7 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending Request...' : 'Request Flight Quote'}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Request summary</p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-[#101c2d]">What you are about to send</h2>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Route</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{routeSummary}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Trip type</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.tripType}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Departure date</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(formData.departureDate)}</p>
              </div>
              {formData.tripType === 'Round Trip' ? (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Return date</p>
                  <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(formData.returnDate)}</p>
                </div>
              ) : null}
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Passengers and cabin</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.passengers} traveler(s) | {formData.travelClass}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">What the team reviews</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6774]">
              {reviewPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Trust note</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              This page is designed for the real first step: the request is captured on the website, then the team continues with you directly without forcing an immediate WhatsApp jump.
            </p>
          </section>
        </aside>
      </div>
    </PublicPageShell>
  );
}
