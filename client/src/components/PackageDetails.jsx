import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { useExchangeRates } from '../hooks/useExchangeRates.js';
import axios, { resolveBackendUrl } from '../lib/api';
import { PublicPageShell } from './PublicPageShell.jsx';
import {
  formatPackagePrice,
  getPackageHighlights,
  getPackageJourneyLabel,
  getPackageJourneyStops,
  getPackageRouteSummary,
  getPackageShortDescription,
  getPackageSupportLine,
  getPackageTypeLabel,
} from '../lib/packagePresentation.js';

const REQUEST_STEPS = [
  'Send the package request online.',
  'NuurPath reviews availability and important details.',
  'Our team continues the follow-up with you on WhatsApp.',
];

const PackageDetails = () => {
  const { isAuthenticated } = useAuth();
  const { packages } = usePublicContent();
  const { id } = useParams();
  const navigate = useNavigate();
  const cachedPackage = useMemo(
    () => packages.find((item) => String(item?._id || item?.id) === String(id)) || null,
    [packages, id]
  );
  const [pkg, setPkg] = useState(cachedPackage);
  const [loading, setLoading] = useState(!cachedPackage);
  const [reviews, setReviews] = useState([]);
  const [pageError, setPageError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [actionFeedbackTone, setActionFeedbackTone] = useState('neutral');
  const [currency, setCurrency] = useState('USD');
  const rates = useExchangeRates();

  useEffect(() => {
    if (!pkg && cachedPackage) {
      setPkg(cachedPackage);
      setLoading(false);
      setPageError(null);
    }
  }, [cachedPackage, pkg]);

  useEffect(() => {
    setActionFeedback('');
    setActionFeedbackTone('neutral');
  }, [id]);

  useEffect(() => {
    let isActive = true;

    const fetchPackageDetails = async () => {
      if (!cachedPackage) {
        setLoading(true);
      }

      try {
        const response = await axios.get(`/packages/${id}`);
        if (!isActive) {
          return;
        }

        setPkg(response.data);
        setPageError(null);
      } catch (err) {
        console.error('Failed to load package details:', err);

        if (!isActive) {
          return;
        }

        if (err?.response?.status === 404) {
          setPkg(null);
          setPageError('This package is not available right now.');
        } else {
          setPageError('Something went wrong while loading this package. Please try again or contact us on WhatsApp.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchPackageDetails();

    return () => {
      isActive = false;
    };
  }, [cachedPackage, id]);

  useEffect(() => {
    if (!pkg?.title) {
      setReviews([]);
      return undefined;
    }

    let isActive = true;

    const fetchReviews = async () => {
      try {
        const reviewsRes = await axios.get('/reviews');
        if (!isActive) {
          return;
        }

        const allReviews = reviewsRes.data;
        const packageReviews = allReviews.filter(
          (review) => review.isVisible && review.comment && review.comment.includes(`Review for ${pkg.title}`)
        );
        setReviews(packageReviews);
      } catch (err) {
        console.error('Failed to load package reviews:', err);
      }
    };

    fetchReviews();

    return () => {
      isActive = false;
    };
  }, [pkg?.title]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsWishlisted(false);
      return undefined;
    }

    let isActive = true;

    const fetchWishlistStatus = async () => {
      try {
        const wishlistRes = await axios.get(`/wishlist/check/${id}`);
        if (!isActive) {
          return;
        }

        setIsWishlisted(wishlistRes.data.isWishlisted);
      } catch (err) {
        console.error('Failed to check wishlist status:', err);
      }
    };

    fetchWishlistStatus();

    return () => {
      isActive = false;
    };
  }, [id, isAuthenticated]);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      setActionFeedback('Sign in if you want to save this package for later. You can still continue without logging in.');
      setActionFeedbackTone('neutral');
      return;
    }

    try {
      await axios.post(`/wishlist/${id}`);
      setIsWishlisted((prev) => {
        const next = !prev;
        setActionFeedback(next ? 'Package saved for later.' : 'Package removed from your saved list.');
        setActionFeedbackTone('success');
        return next;
      });
    } catch (err) {
      console.error('Wishlist error:', err);
      setActionFeedback('Unable to update your saved packages right now. Please try again.');
      setActionFeedbackTone('error');
    }
  };

  const handleDownloadItinerary = async () => {
    try {
      const response = await axios.get(`/itinerary/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pkg.title.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setActionFeedback('Itinerary download started.');
      setActionFeedbackTone('success');
    } catch (err) {
      console.error('Error downloading itinerary:', err);
      setActionFeedback('Unable to download the itinerary right now. Please try again later.');
      setActionFeedbackTone('error');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: pkg.title,
      text: `Ask NuurPath about this package: ${pkg.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setActionFeedback('Package link copied.');
        setActionFeedbackTone('success');
      } catch (err) {
        console.error('Failed to copy:', err);
        setActionFeedback('Unable to copy the package link.');
        setActionFeedbackTone('error');
      }
    }
  };

  const getImageUrl = (path) => {
    if (!path) {
      return '';
    }

    return resolveBackendUrl(path);
  };

  const relatedPackages = useMemo(() => (
    packages
      .filter((item) => String(item?._id || item?.id) !== String(pkg?._id || pkg?.id || id))
      .slice(0, 3)
  ), [packages, pkg?._id, pkg?.id, id]);
  const journeyStops = getPackageJourneyStops(pkg);
  const routeSummary = getPackageRouteSummary(pkg);
  const typeLabel = getPackageTypeLabel(pkg?.type);
  const highlights = getPackageHighlights(pkg);
  const journeyLabel = getPackageJourneyLabel(pkg);
  const supportLine = getPackageSupportLine(pkg);
  const heroSummary = getPackageShortDescription(pkg?.description, 160);

  if (loading) {
    return <div className="p-10 text-center">Loading package details...</div>;
  }

  if (pageError) {
    return <div className="p-10 text-center text-red-500">{pageError}</div>;
  }

  if (!pkg) {
    return <div className="p-10 text-center">This package is not available right now.</div>;
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : null;

  let itineraryData = null;
  try {
    const parsed = JSON.parse(pkg.itinerary);
    if (Array.isArray(parsed)) {
      itineraryData = parsed;
    }
  } catch (e) {
    itineraryData = null;
  }

  const formattedPrice = formatPackagePrice(
    pkg?.price,
    currency,
    rates[currency] || 1
  );
  const packageFacts = [
    routeSummary ? { label: 'Route', value: routeSummary } : null,
    pkg.duration ? { label: 'Duration', value: pkg.duration } : null,
    typeLabel ? { label: 'Package type', value: typeLabel } : null,
  ].filter(Boolean);

  return (
    <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
      <style>{`
        @media print {
          nav, footer, button, .no-print { display: none !important; }
        }
      `}</style>

      <Link to="/packages" className="no-print mb-6 inline-block font-medium text-[#0B1C3E] transition-colors hover:text-[#D4AF37]">
        &larr; Back to Packages
      </Link>

      <section className="overflow-hidden rounded-[1.8rem] border border-[#e5dece] bg-white p-4 shadow-[0_16px_44px_rgba(16,28,45,0.06)] sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          <div>
            <div className="relative overflow-hidden rounded-[1.55rem] border border-[#ece4d6] bg-[#f5f0e6] shadow-sm">
              <div className="flex h-[320px] items-center justify-center overflow-hidden bg-[#f5f0e6] p-3 sm:h-[320px] sm:p-0 lg:h-[360px]">
                {pkg.images && pkg.images.length > 0 ? (
                  <img
                    src={getImageUrl(pkg.images[0])}
                    alt={pkg.title}
                    className="h-full w-full object-contain sm:object-cover"
                    fetchPriority="high"
                    decoding="async"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#d9d1c2] text-sm font-semibold text-[#4d5562]">
                    Package image coming soon
                  </div>
                )}
              </div>
              {pkg.isFeatured ? (
                <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0B1C3E] shadow-sm">
                  Featured package
                </span>
              ) : null}
            </div>
          </div>

          <div className="lg:py-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
              {typeLabel}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
              {pkg.title}
            </h1>

            {averageRating ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#4d5562]">
                <span className="text-yellow-500">&#9733;</span>
                <span className="font-bold text-[#101c2d]">{averageRating}</span>
                <span>from {reviews.length} traveler reviews</span>
              </div>
            ) : null}

            <p className="mt-4 text-sm font-semibold text-[#2d5f50]">
              {journeyLabel}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f6774]">
              {heroSummary}
            </p>

            {packageFacts.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {packageFacts.map((fact) => (
                  <div key={fact.label} className="rounded-[1.15rem] border border-[#ece4d6] bg-[#fcfbf8] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#101c2d]">
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {highlights.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {highlights.map((item) => (
                  <span key={item} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 rounded-[1.35rem] border border-[#ece4d6] bg-[#faf8f3] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Starting from</span>
                  <span className="mt-1 block text-3xl font-black text-[#006837]">
                    {formattedPrice}
                  </span>
                </div>
                {typeof pkg.price === 'number' ? (
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="rounded-xl border border-[#d8cfbf] bg-white px-3 py-2 text-sm text-[#4d5562] focus:border-[#0B1C3E] focus:outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                    </select>
                  </label>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-[#5f6774]">
                {supportLine}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate(`/book/${pkg._id || pkg.id}`)}
                className="flex-1 rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1a2f55]"
                type="button"
              >
                Request This Package
              </button>
              {pkg.itinerary ? (
                <button
                  onClick={handleDownloadItinerary}
                  className="rounded-full border border-[#d8cfbf] bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                  type="button"
                >
                  Download Itinerary
                </button>
              ) : null}
            </div>

            <div className="no-print mt-4 flex flex-wrap gap-3">
              <button
                onClick={toggleWishlist}
                className={`rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition-colors ${
                  isWishlisted
                    ? 'bg-[#fbe6e6] text-[#b84f4f]'
                    : 'border border-[#d8cfbf] bg-white text-[#101c2d] hover:bg-[#faf8f3]'
                }`}
                type="button"
              >
                {isWishlisted ? 'Saved' : 'Save Package'}
              </button>
              <button
                onClick={handleShare}
                className="rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                type="button"
              >
                Share Link
              </button>
              <button
                onClick={() => window.print()}
                className="rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                type="button"
              >
                Print
              </button>
            </div>

            {actionFeedback ? (
              <p className={`mt-3 text-sm font-medium ${
                actionFeedbackTone === 'error'
                  ? 'text-[#b84f4f]'
                  : actionFeedbackTone === 'success'
                    ? 'text-[#2d5f50]'
                    : 'text-[#5f6774]'
              }`}>
                {actionFeedback}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="space-y-8">
          <section className="rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Package overview</h2>
            <p className="mt-4 text-base leading-8 text-[#5f6774]">
              {pkg.description}
            </p>
          </section>

          {journeyStops.length > 0 ? (
            <section className="rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Journey route</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                    {routeSummary}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {journeyStops.map((stop, index) => (
                  <article key={`${stop.city}-${index}`} className="rounded-[1.3rem] border border-[#ece4d6] bg-[#faf8f3] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black text-[#101c2d]">{stop.city}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0B1C3E]">
                        Stop {index + 1}
                      </span>
                    </div>
                    {stop.stayLabel ? (
                      <p className="mt-3 text-sm font-semibold text-[#2d5f50]">{stop.stayLabel}</p>
                    ) : null}
                    {stop.accommodation ? (
                      <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                        Accommodation: {stop.accommodation}
                      </p>
                    ) : null}
                    {stop.notes ? (
                      <p className="mt-3 text-sm leading-7 text-[#5f6774]">{stop.notes}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {pkg.itinerary ? (
            <section className="rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Itinerary</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                    A clearer view of how this journey is expected to flow.
                  </p>
                </div>
                <button
                  onClick={handleDownloadItinerary}
                  className="no-print rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#101c2d] transition-colors hover:bg-[#faf8f3]"
                  type="button"
                >
                  Download PDF
                </button>
              </div>

              {itineraryData ? (
                <div className="mt-6 space-y-5">
                  {itineraryData.map((day, index) => (
                    <article key={`${day.day || index}-${day.title || 'day'}`} className="rounded-[1.35rem] border border-[#ece4d6] bg-[#faf8f3] p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-black text-[#101c2d]">
                          Day {day.day || index + 1}: {day.title}
                        </h3>
                        {day.location ? (
                          <span className="text-sm font-semibold text-[#2d5f50]">{day.location}</span>
                        ) : null}
                      </div>
                      {day.image ? (
                        <img
                          src={getImageUrl(day.image)}
                          alt={day.title}
                          className="mt-4 h-44 w-full rounded-[1.1rem] object-cover sm:h-48"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <p className="mt-4 text-sm leading-7 text-[#5f6774]">
                        {day.description}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#5f6774]">{pkg.itinerary}</p>
              )}
            </section>
          ) : null}

          <section className="rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">Traveler reviews</h2>
            {reviews.length > 0 ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[1.3rem] border border-[#ece4d6] bg-[#faf8f3] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#101c2d]">{review.name || 'Traveler'}</p>
                        <p className="mt-1 text-xs text-[#6a7280]">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, index) => (
                          <span key={index}>{index < review.rating ? '\u2605' : '\u2606'}</span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-4 text-sm italic leading-7 text-[#5f6774]">
                      "{review.comment.replace(`Review for ${pkg.title}: `, '').replace(`Review for ${pkg.title}`, '')}"
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#6a7280]">
                No reviews yet for this package. Once travelers begin requesting it, this section can reflect their experience.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[1.6rem] bg-[#0B1C3E] p-6 text-white shadow-sm">
            <h2 className="text-xl font-black tracking-tight">What happens next</h2>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-200">
              {REQUEST_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              No online payment is required on the website. The team first reviews the request and then continues with you directly.
            </p>
          </section>
        </aside>
      </div>

      {relatedPackages.length > 0 ? (
        <section className="mt-10 rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#101c2d]">More packages to explore</h2>
              <p className="mt-2 text-sm leading-7 text-[#5f6774]">
                Similar journeys you may want to compare before making your request.
              </p>
            </div>
            <Link to="/packages" className="no-print text-sm font-black uppercase tracking-[0.14em] text-[#0B1C3E] transition-colors hover:text-[#1a2f55]">
              View all packages
            </Link>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {relatedPackages.map((related) => (
              <article key={related._id || related.id} className="group overflow-hidden rounded-[1.35rem] border border-[#ece4d6] bg-[#faf8f3] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(16,28,45,0.08)]">
                <Link to={`/packages/${related._id || related.id}`} className="flex h-full gap-4 p-3">
                  <div className="flex w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-[#eee5d6]">
                    {related.images && related.images.length > 0 ? (
                      <img
                        src={getImageUrl(related.images[0])}
                        alt={related.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="px-3 text-center text-xs font-semibold text-[#6a7280]">Image coming soon</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center transition-transform duration-300 group-hover:translate-x-1">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">
                      {getPackageTypeLabel(related.type)}
                    </p>
                    <h3 className="mt-2 text-base font-black tracking-tight text-[#101c2d]">
                      {related.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-[#2d5f50]">
                      {getPackageJourneyLabel(related)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#5f6774]">
                      {getPackageShortDescription(related.description, 76)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-base font-black text-[#006837]">
                        {typeof related.price === 'number' ? `$${related.price.toLocaleString()}` : related.price}
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#0B1C3E]">
                        View
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PublicPageShell>
  );
};

export default PackageDetails;
