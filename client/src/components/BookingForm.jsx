import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios, { resolveBackendUrl } from '../lib/api';
import { buildPackageRequestWhatsAppUrl } from '../lib/whatsapp';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { countries } from '../data/countries';
import {
  formatPackagePrice,
  getPackageHighlights,
  getPackageRouteSummary,
  getPackageShortDescription,
  getPackageTypeLabel,
} from '../lib/packagePresentation.js';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';

const initialFormData = {
  fullName: '',
  email: '',
  phone: '',
  date: '',
  passengers: 1,
  locationFrom: '',
  passportNumber: '',
  passportExpiryDate: '',
  passportCopy: '',
  dateOfBirth: '',
  specialRequests: '',
  nationality: '',
};

const requestSteps = [
  'Send the request with the main traveler details.',
  'NuurPath reviews package availability and any travel notes you shared.',
  'Our team continues with you on WhatsApp for confirmation and the next step.',
];

const documentTips = [
  'Passport copy is optional at this stage, but it helps early document review.',
  'Passport validity should still cover at least 6 months after travel.',
  'If you do not have all document details yet, you can still send the request now.',
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

export default function BookingForm() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { packages } = usePublicContent();
  const cachedPackage = useMemo(
    () => packages.find((item) => String(item?._id || item?.id) === String(packageId)) || null,
    [packages, packageId]
  );
  const [pkg, setPkg] = useState(cachedPackage);
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle');
  const [packageLoading, setPackageLoading] = useState(!cachedPackage);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: user.name || prev.fullName,
      email: user.email || prev.email,
      phone: user.contactInfo || prev.phone,
    }));
  }, [user]);

  useEffect(() => {
    if (cachedPackage) {
      setPkg(cachedPackage);
    }
  }, [cachedPackage]);

  useEffect(() => {
    let isActive = true;

    const fetchPackage = async () => {
      if (!packageId) {
        setPackageLoading(false);
        setErrorMessage('No package was selected for this request.');
        return;
      }

      try {
        const response = await axios.get(`/packages/${packageId}`);

        if (!isActive) {
          return;
        }

        setPkg(response.data);
      } catch (error) {
        console.error('Failed to fetch package:', error);

        if (!isActive) {
          return;
        }

        setErrorMessage(
          error.response?.status === 404
            ? 'This package is not available right now.'
            : 'Unable to load the selected package right now.'
        );
      } finally {
        if (isActive) {
          setPackageLoading(false);
        }
      }
    };

    fetchPackage();

    return () => {
      isActive = false;
    };
  }, [packageId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassportUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const uploadData = new FormData();
    uploadData.append('passport', file);

    setUploading(true);
    setErrorMessage('');

    try {
      const response = await axios.post('/bookings/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData((prev) => ({ ...prev, passportCopy: response.data.url }));
    } catch (error) {
      console.error('Passport upload failed:', error);
      setErrorMessage(error.response?.data?.msg || 'Failed to upload the passport copy.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!packageId) {
      setStatus('error');
      setErrorMessage('No package was selected for this request.');
      return;
    }

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const passengerCount = parseInt(formData.passengers, 10);

    if (trimmedPhone.length < 7) {
      setStatus('error');
      setErrorMessage('Please enter a valid phone or WhatsApp number.');
      return;
    }

    if (formData.passportExpiryDate && formData.date) {
      const travelDateObj = new Date(formData.date);
      const expiryDateObj = new Date(formData.passportExpiryDate);
      const minExpiryDate = new Date(travelDateObj);
      minExpiryDate.setMonth(minExpiryDate.getMonth() + 6);

      if (expiryDateObj < minExpiryDate) {
        setStatus('error');
        setErrorMessage('Passport must be valid for at least 6 months after the travel date.');
        return;
      }
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        locationFrom: formData.locationFrom.trim(),
        passportNumber: formData.passportNumber.trim(),
        passportExpiryDate: formData.passportExpiryDate || undefined,
        passportCopy: formData.passportCopy || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        specialRequests: formData.specialRequests.trim(),
        nationality: formData.nationality || undefined,
        travelDate: formData.date || undefined,
        passengers: passengerCount,
        packageId: parseInt(packageId, 10),
      };

      const response = await axios.post('/bookings', payload);
      const responseData = response.data || {};
      const savedRequest = responseData.booking || responseData;
      const requestId = responseData.requestId || savedRequest.id;
      const packageTitle = responseData.packageTitle || savedRequest.package?.title || pkg?.title || 'your selected package';
      const whatsappUrl = buildPackageRequestWhatsAppUrl({
        packageTitle,
        requestId,
        contactName: trimmedName,
        travelDate: payload.travelDate,
        passengers: payload.passengers,
        locationFrom: payload.locationFrom,
      });

      setSuccessDetails({
        requestId,
        packageTitle,
        travelDate: payload.travelDate,
        passengers: payload.passengers,
        locationFrom: payload.locationFrom,
        whatsappUrl,
      });
      setStatus('success');
    } catch (error) {
      console.error('Package request error:', error.response?.data || error.message);
      setStatus('error');
      setErrorMessage(
        error.response?.data?.msg
          || error.response?.data?.error
          || 'Something went wrong. Please try again or contact us on WhatsApp.'
      );
    }
  };

  const fieldClassName = getFieldClassName();
  const packageHighlights = getPackageHighlights(pkg).slice(0, 3);
  const packageImage = pkg?.images?.[0] ? resolveBackendUrl(pkg.images[0]) : '';
  const packageSummary = getPackageShortDescription(pkg?.description, 170);
  const packageRoute = getPackageRouteSummary(pkg);
  const packageType = getPackageTypeLabel(pkg?.type);

  if (packageLoading && !pkg) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <div className="rounded-[1.8rem] border border-[#e5dece] bg-white p-10 text-center text-[#5f6774] shadow-sm">
          Loading the selected package...
        </div>
      </PublicPageShell>
    );
  }

  if (!pkg) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <div className="rounded-[1.8rem] border border-[#f0d7d7] bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-[#101c2d]">Package not available</h1>
          <p className="mt-4 text-sm leading-7 text-[#5f6774]">
            {errorMessage || 'This package could not be loaded right now.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/packages"
              className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55]"
            >
              Back to Packages
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

  if (status === 'success' && successDetails) {
    return (
      <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
        <PublicPageHeader
          eyebrow="Package request sent"
          title="Your package request is now with NuurPath"
          description="The important first step has been completed on the website. Our team will now review the request, confirm availability, and continue with you on WhatsApp."
          aside={(
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">Reference</p>
              <p className="mt-3 text-3xl font-black">#{successDetails.requestId}</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Keep this request number for quick follow-up if you contact the team.
              </p>
            </div>
          )}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[1.7rem] border border-[#d7eadb] bg-white p-6 shadow-sm sm:p-8">
            <div className="rounded-[1.35rem] border border-[#d7eadb] bg-[#f5fbf6] p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2d5f50]">Request snapshot</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Package</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.packageTitle}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Travelers</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.passengers}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Preferred travel date</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(successDetails.travelDate)}</p>
                </div>
                <div className="rounded-[1.1rem] bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Departure city</p>
                  <p className="mt-2 text-sm font-semibold text-[#101c2d]">{successDetails.locationFrom || 'Not provided yet'}</p>
                </div>
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
                No online payment is required on the website. If payment is needed later, the team will explain the confirmed offline method after reviewing the request.
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
                  onClick={() => navigate('/dashboard?tab=bookings')}
                  className="rounded-full border border-[#0B1C3E] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#0B1C3E] transition-colors hover:bg-[#faf8f3]"
                >
                  View My Requests
                </button>
              ) : (
                <Link
                  to="/packages"
                  className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                >
                  Browse More Packages
                </Link>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">Selected package</p>
              <h2 className="mt-3 text-xl font-black tracking-tight text-[#101c2d]">{pkg.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">{packageSummary}</p>
            </section>

            <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Payment note</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                Payment is handled outside the website after the team reviews availability and shares the confirmed next step with you.
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
        eyebrow="Package request"
        title="Start your package request with a clear first step"
        description="This page captures the important request details before direct follow-up begins. Send the request here, then NuurPath continues with you on WhatsApp for availability, confirmation, and the next step."
        aside={(
          <>
            <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">No online payment</p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                Payment is not collected on the website. The team confirms availability first and then explains the offline payment step if needed.
              </p>
            </div>
            <div className="rounded-[1.35rem] bg-[#0B1C3E] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">Dashboard support</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {isAuthenticated
                  ? 'Because you are signed in, this package request will also appear in your dashboard after it is submitted.'
                  : 'You do not need to log in to start a package request. If you sign in later, future requests can be easier to track.'}
              </p>
            </div>
          </>
        )}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_360px]">
        <section className="rounded-[1.75rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 rounded-[1.5rem] border border-[#ece4d6] bg-[#fcfbf8] p-5 sm:grid-cols-[176px_minmax(0,1fr)]">
            <div className="flex items-center justify-center overflow-hidden rounded-[1.2rem] bg-[#f5efe5] p-3">
              {packageImage ? (
                <img
                  src={packageImage}
                  alt={pkg.title}
                  className="h-full max-h-[220px] w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-[180px] w-full items-center justify-center rounded-[1rem] bg-[#e6dece] px-4 text-center text-sm font-semibold text-[#5f6774]">
                  Package image coming soon
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Selected package</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[#101c2d]">{pkg.title}</h2>
              <p className="mt-3 text-sm font-semibold text-[#2d5f50]">
                {packageRoute || packageType}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">{packageSummary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {packageHighlights.map((item) => (
                  <span key={item} className="rounded-full border border-[#e5dece] bg-white px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-lg font-black text-[#006837]">
                {formatPackagePrice(pkg.price)}
              </p>
            </div>
          </div>

          {status === 'error' && errorMessage ? (
            <div className="mt-6 rounded-[1.2rem] border border-[#f0d7d7] bg-[#fff6f6] px-4 py-3 text-sm text-[#b84f4f]">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-8">
            <section>
              <div className="mb-4">
                <h3 className="text-xl font-black tracking-tight text-[#101c2d]">Traveler contact</h3>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  These are the details NuurPath uses for package follow-up and confirmation.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Full name</span>
                  <input
                    type="text"
                    name="fullName"
                    required
                    className={fieldClassName}
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your full name"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Email address</span>
                  <input
                    type="email"
                    name="email"
                    required
                    className={fieldClassName}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Phone or WhatsApp number</span>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className={fieldClassName}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter the number the team should use for follow-up"
                  />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h3 className="text-xl font-black tracking-tight text-[#101c2d]">Travel planning details</h3>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  Share what is already known so the team can review availability and the best next step.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Preferred travel date</span>
                  <input
                    type="date"
                    name="date"
                    className={fieldClassName}
                    value={formData.date}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Number of travelers</span>
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
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Departure city</span>
                  <input
                    type="text"
                    name="locationFrom"
                    className={fieldClassName}
                    value={formData.locationFrom}
                    onChange={handleChange}
                    placeholder="Example: Dar es Salaam"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Travel notes or special requests</span>
                  <textarea
                    name="specialRequests"
                    className={`${fieldClassName} min-h-[120px]`}
                    value={formData.specialRequests}
                    onChange={handleChange}
                    placeholder="Tell NuurPath anything helpful about the travelers, schedule, assistance needed, or comfort preferences."
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#ece4d6] bg-[#fcfbf8] p-5">
              <div className="mb-4">
                <h3 className="text-xl font-black tracking-tight text-[#101c2d]">Optional document details</h3>
                <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                  These are optional for the first request, but they help the team review readiness earlier.
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-[#e8dfcf] bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Helpful note</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#5f6774]">
                  {documentTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Passport number</span>
                  <input
                    type="text"
                    name="passportNumber"
                    className={fieldClassName}
                    value={formData.passportNumber}
                    onChange={handleChange}
                    placeholder="Enter passport number"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Passport expiry date</span>
                  <input
                    type="date"
                    name="passportExpiryDate"
                    className={fieldClassName}
                    value={formData.passportExpiryDate}
                    onChange={handleChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Nationality</span>
                  <select
                    name="nationality"
                    className={fieldClassName}
                    value={formData.nationality}
                    onChange={handleChange}
                  >
                    <option value="">Select nationality</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Date of birth</span>
                  <input
                    type="date"
                    name="dateOfBirth"
                    className={fieldClassName}
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-[#101c2d]">Passport copy</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className={fieldClassName}
                    onChange={handlePassportUpload}
                  />
                  <div className="mt-2 text-sm">
                    {uploading ? (
                      <span className="text-[#0B1C3E]">Uploading document...</span>
                    ) : formData.passportCopy ? (
                      <span className="text-[#2d5f50]">Passport copy attached successfully.</span>
                    ) : (
                      <span className="text-[#6a7280]">Optional for the first step.</span>
                    )}
                  </div>
                </label>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-7 text-[#5f6774]">
                This request is reviewed by the NuurPath team before any payment or final confirmation step is discussed.
              </p>
              <button
                type="submit"
                disabled={status === 'submitting' || uploading}
                className="rounded-full bg-[#0B1C3E] px-7 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'submitting' ? 'Sending Request...' : 'Send Package Request'}
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
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Package</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{pkg.title}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Preferred travel date</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formatDisplayDate(formData.date)}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Travelers</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.passengers || 1}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Departure city</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.locationFrom || 'Not provided yet'}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Document attachment</p>
                <p className="mt-1 text-sm font-semibold text-[#101c2d]">{formData.passportCopy ? 'Passport copy attached' : 'No file attached yet'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.55rem] border border-[#ece4d6] bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">What happens next</p>
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
          </section>

          <section className="rounded-[1.55rem] bg-[#0B1C3E] p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Trust note</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              The website captures the first important details, but confirmation and any payment instruction only happen after human review from the NuurPath team.
            </p>
          </section>
        </aside>
      </div>
    </PublicPageShell>
  );
}
