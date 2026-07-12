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
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [currency, setCurrency] = useState('USD');
  const rates = useExchangeRates();

  useEffect(() => {
    if (!pkg && cachedPackage) {
      setPkg(cachedPackage);
      setLoading(false);
      setError(null);
    }
  }, [cachedPackage, pkg]);

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
        setError(null);
      } catch (err) {
        console.error('Failed to load package details:', err);

        if (!isActive) {
          return;
        }

        if (err?.response?.status === 404) {
          setPkg(null);
          setError('This package is not available right now.');
        } else {
          setError('Something went wrong while loading this package. Please try again or contact us on WhatsApp.');
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
      alert('Create an account to save packages and track your future requests.');
      return;
    }

    try {
      await axios.post(`/wishlist/${id}`);
      setIsWishlisted((prev) => !prev);
    } catch (err) {
      console.error('Wishlist error:', err);
      setError('Unable to update your saved packages right now. Please try again.');
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
    } catch (err) {
      console.error('Error downloading itinerary:', err);
      alert('Unable to download the itinerary right now. Please try again later.');
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
        setShareFeedback('Package link copied.');
        setTimeout(() => setShareFeedback(''), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        setShareFeedback('Unable to copy the package link.');
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
  const heroSummary = getPackageShortDescription(pkg?.description, 200);

  if (loading) {
    return <div className="p-10 text-center">Loading package details...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
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

      <section className="overflow-hidden rounded-[1.8rem] border border-[#e5dece] bg-white shadow-[0_16px_44px_rgba(16,28,45,0.06)]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[320px] bg-[#ebe6da] lg:min-h-[100%]">
            {pkg.images && pkg.images.length > 0 ? (
              <img
                src={getImageUrl(pkg.images[0])}
                alt={pkg.title}
                className="h-full w-full object-cover"
                fetchPriority="high"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center bg-[#d9d1c2] text-sm font-semibold text-[#4d5562]">
                Package image coming soon
              </div>
            )}
            {pkg.isFeatured ? (
              <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#0B1C3E]">
                Featured package
              </span>
            ) : null}
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
              {typeLabel}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
              {pkg.title}
            </h1>

            {averageRating ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-[#4d5562]">
                <span className="text-yellow-500">&#9733;</span>
                <span className="font-bold text-[#101c2d]">{averageRating}</span>
                <span>from {reviews.length} traveler reviews</span>
              </div>
            ) : null}

            <p className="mt-5 text-base leading-8 text-[#5f6774]">
              {heroSummary}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span key={item} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-[1.35rem] border border-[#ece4d6] bg-[#faf8f3] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Starting from</span>
                  <span className="mt-1 block text-3xl font-black text-[#006837]">
                    {formattedPrice}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-[#2d5f50]">
                    {journeyLabel}
                  </p>
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
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-[#ece4d6] bg-white p-4 text-sm leading-7 text-[#5f6774]">
              {supportLine}
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

            {shareFeedback ? (
              <p className="mt-3 text-sm font-medium text-[#2d5f50]">{shareFeedback}</p>
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
                          className="mt-4 h-64 w-full rounded-[1.1rem] object-cover"
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

        <aside className="space-y-6">
          <section className="rounded-[1.6rem] border border-[#e5dece] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight text-[#101c2d]">Package snapshot</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {routeSummary ? (
                <div>
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Route</dt>
                  <dd className="mt-1 text-[#4d5562]">{routeSummary}</dd>
                </div>
              ) : null}
              {pkg.destination ? (
                <div>
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Destination</dt>
                  <dd className="mt-1 text-[#4d5562]">{pkg.destination}</dd>
                </div>
              ) : null}
              {pkg.duration ? (
                <div>
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Duration</dt>
                  <dd className="mt-1 text-[#4d5562]">{pkg.duration}</dd>
                </div>
              ) : null}
              {typeLabel ? (
                <div>
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Package type</dt>
                  <dd className="mt-1 text-[#4d5562]">{typeLabel}</dd>
                </div>
              ) : null}
            </dl>
          </section>

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
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedPackages.map((related) => (
              <article key={related._id || related.id} className="overflow-hidden rounded-[1.35rem] border border-[#ece4d6] bg-[#faf8f3]">
                {related.images && related.images.length > 0 ? (
                  <div className="h-44 overflow-hidden">
                    <img
                      src={getImageUrl(related.images[0])}
                      alt={related.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : null}
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a7240]">
                    {getPackageTypeLabel(related.type)}
                  </p>
                  <h3 className="mt-2 text-lg font-black tracking-tight text-[#101c2d]">{related.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-[#2d5f50]">{getPackageJourneyLabel(related)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-black text-[#006837]">
                      {typeof related.price === 'number' ? `$${related.price.toLocaleString()}` : related.price}
                    </span>
                    <Link to={`/packages/${related._id || related.id}`} className="text-sm font-black uppercase tracking-[0.12em] text-[#0B1C3E] transition-colors hover:text-[#1a2f55]">
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PublicPageShell>
  );
};

export default PackageDetails;
