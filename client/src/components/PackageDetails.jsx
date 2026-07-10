import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { useExchangeRates } from '../hooks/useExchangeRates.js';
import axios, { resolveBackendUrl } from '../lib/api';
import WeatherWidget from './WeatherWidget';

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

  const getFormattedPrice = () => {
    if (!pkg || typeof pkg.price !== 'number') {
      return pkg?.price;
    }

    const rate = rates[currency] || 1;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(pkg.price * rate);
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
  const journeyStops = Array.isArray(pkg?.journeyStops) ? pkg.journeyStops : [];

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

  return (
    <div className="container mx-auto p-6">
      <style>{`
        @media print {
          nav, footer, button, .no-print { display: none !important; }
        }
      `}</style>

      <Link to="/packages" className="no-print mb-6 inline-block font-medium text-[#0B1C3E] transition-colors hover:text-[#D4AF37]">
        &larr; Back to Packages
      </Link>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
        {pkg.images && pkg.images.length > 0 && (
          <div className="relative h-64 w-full overflow-hidden md:h-96">
            <img
              src={getImageUrl(pkg.images[0])}
              alt={pkg.title}
              className="h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="p-8">
          <div className="mb-6 flex flex-col items-start justify-between md:flex-row md:items-center">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[#0B1C3E] md:text-4xl">{pkg.title}</h1>
              {averageRating && (
                <div className="mb-4 flex items-center gap-2 md:mb-0">
                  <span className="text-xl text-yellow-500">&#9733;</span>
                  <span className="text-lg font-bold text-gray-700">{averageRating}</span>
                  <span className="text-sm text-gray-500">({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span className="mb-1 text-xs font-bold uppercase tracking-[2px] text-gray-500">Starting from</span>
              <span className="text-3xl font-bold text-[#D4AF37]">{getFormattedPrice()}</span>
              <span className="mt-1 text-sm text-gray-500">Estimated package price</span>
              {typeof pkg.price === 'number' && (
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 cursor-pointer rounded border border-gray-200 bg-gray-50 p-1 text-xs text-gray-600 focus:border-[#0B1C3E] focus:outline-none"
                >
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div>
                <h3 className="mb-3 text-xl font-bold text-[#0B1C3E]">Package Overview</h3>
                <p className="leading-relaxed text-gray-600">{pkg.description}</p>
              </div>

              {journeyStops.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xl font-bold text-[#0B1C3E]">Journey Route</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {journeyStops.map((stop, index) => (
                      <div key={`${stop.city}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h4 className="font-bold text-[#0B1C3E]">{stop.city}</h4>
                          <span className="rounded-full bg-[#0B1C3E]/10 px-3 py-1 text-xs font-bold uppercase tracking-[2px] text-[#0B1C3E]">
                            Stop {index + 1}
                          </span>
                        </div>
                        {stop.stayLabel && (
                          <p className="text-sm font-semibold text-[#006837]">{stop.stayLabel}</p>
                        )}
                        {stop.accommodation && (
                          <p className="mt-2 text-sm text-gray-600">Accommodation: {stop.accommodation}</p>
                        )}
                        {stop.notes && (
                          <p className="mt-2 text-sm text-gray-600">{stop.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pkg.itinerary && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#0B1C3E]">Itinerary</h3>
                    <button
                      onClick={handleDownloadItinerary}
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-[#0B1C3E] transition-colors hover:bg-gray-50 hover:text-[#D4AF37]"
                      title="Download PDF"
                      type="button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                  </div>

                  {itineraryData ? (
                    <div className="relative ml-3 space-y-6 border-l-2 border-gray-200 pl-6">
                      {itineraryData.map((day, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[1.95rem] top-0 h-4 w-4 rounded-full border-2 border-white bg-[#D4AF37] shadow-sm"></span>
                          <h4 className="text-lg font-bold text-[#0B1C3E]">Day {day.day}: {day.title}</h4>
                          {day.image && (
                            <img
                              src={getImageUrl(day.image)}
                              alt={day.title}
                              className="my-3 h-64 w-full rounded-lg object-cover shadow-sm"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                          <p className="mt-1 text-gray-600">{day.description}</p>
                          {day.location && (
                            <div className="mt-3">
                              <p className="mb-1 text-xs font-bold text-gray-500">Location: {day.location}</p>
                              <div className="h-48 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                                <iframe
                                  width="100%"
                                  height="100%"
                                  frameBorder="0"
                                  scrolling="no"
                                  marginHeight="0"
                                  marginWidth="0"
                                  src={`https://maps.google.com/maps?q=${encodeURIComponent(day.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                  title={`Map for Day ${day.day}`}
                                  loading="lazy"
                                ></iframe>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-gray-600">{pkg.itinerary}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <WeatherWidget destination={pkg.destination} />
              <div className="h-fit rounded-xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 text-lg font-bold text-[#0B1C3E]">Package Details</h3>
                <ul className="mb-6 space-y-3 text-gray-600">
                  {pkg.destination && (
                    <li>Destination: {pkg.destination}</li>
                  )}
                  {pkg.duration && (
                    <li>Duration: {pkg.duration}</li>
                  )}
                  {pkg.type && (
                    <li>Type: {pkg.type}</li>
                  )}
                </ul>

                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
                  Submitting this request does not require online payment. Our team will review your details and continue with you on WhatsApp to confirm availability and next steps.
                </div>

                <button
                  onClick={() => navigate(`/book/${pkg._id || pkg.id}`)}
                  className="w-full rounded-lg bg-[#0B1C3E] py-3 font-bold text-white shadow-md transition-colors hover:bg-[#1a2f55]"
                  type="button"
                >
                  Request Package
                </button>
                <button
                  onClick={toggleWishlist}
                  className={`mt-3 w-full rounded-lg border py-3 font-bold transition-colors ${isWishlisted ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
                  type="button"
                >
                  {isWishlisted ? 'Remove Saved Package' : 'Save Package'}
                </button>
                <button
                  onClick={handleShare}
                  className="relative mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 py-3 font-bold text-blue-600 transition-colors hover:bg-blue-100"
                  type="button"
                >
                  Share Package Link
                  {shareFeedback && (
                    <span className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white shadow-lg">
                      {shareFeedback}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50"
                  type="button"
                >
                  Print Package Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-[#0B1C3E]">Traveler Reviews</h2>
        {reviews.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#0B1C3E]">{review.name || 'Traveler'}</p>
                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < review.rating ? '\u2605' : '\u2606'}</span>
                    ))}
                  </div>
                </div>
                <p className="italic text-gray-600">
                  "{review.comment.replace(`Review for ${pkg.title}: `, '').replace(`Review for ${pkg.title}`, '')}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 p-8 text-center italic text-gray-500">
            No reviews yet for this package. Be the first to request it and share your experience later.
          </div>
        )}
      </div>

      {relatedPackages.length > 0 && (
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="mb-6 text-2xl font-bold text-[#0B1C3E]">More Packages to Explore</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {relatedPackages.map((related) => (
              <div key={related._id || related.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                {related.images && related.images.length > 0 && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={getImageUrl(related.images[0])}
                      alt={related.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="mb-2 truncate font-bold text-[#0B1C3E]">{related.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#D4AF37]">
                      {typeof related.price === 'number' ? `From $${related.price.toLocaleString()}` : related.price}
                    </span>
                    <Link to={`/packages/${related._id || related.id}`} className="text-sm font-medium text-[#0B1C3E] transition-colors hover:text-[#D4AF37]">
                      View Package
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageDetails;
