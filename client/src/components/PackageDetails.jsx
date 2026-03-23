
//Users/issatende/Projects/nuurpath-travels/client/src/components/PackageDetails.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CONFIG } from '../config';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import WeatherWidget from './WeatherWidget';

const PackageDetails = () => {
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [relatedPackages, setRelatedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67 });

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setRates(prev => ({ ...prev, ...data.rates }));
        }
      })
      .catch(err => console.log('Using default exchange rates'));
  }, []);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/packages/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch package details');
        }
        const data = await response.json();
        setPkg(data);

        // Fetch related packages
        const relatedRes = await fetch(`${CONFIG.API_BASE_URL}/packages`);
        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          const allPackages = Array.isArray(relatedData) ? relatedData : (relatedData.packages || []);
          const filtered = allPackages.filter(p => (p._id || p.id) !== (data._id || data.id)).slice(0, 3);
          setRelatedPackages(filtered);
        }

        // Fetch reviews
        const reviewsRes = await fetch(`${CONFIG.API_BASE_URL}/reviews`);
        if (reviewsRes.ok) {
          const allReviews = await reviewsRes.json();
          const packageReviews = allReviews.filter(r => 
            r.isVisible && r.comment && r.comment.includes(`Review for ${data.title}`)
          );
          setReviews(packageReviews);
        }

        // Check wishlist status
        if (isAuthenticated) {
          const wishlistRes = await axios.get(`${CONFIG.API_BASE_URL}/wishlist/check/${id}`);
          setIsWishlisted(wishlistRes.data.isWishlisted);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [id, isAuthenticated]);

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      alert('Please login to save favorites.');
      return;
    }
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/wishlist/${id}`);
      setIsWishlisted(!isWishlisted);
    } catch (err) {
      console.error('Wishlist error:', err);
    }
  };

  const handleDownloadItinerary = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/itinerary/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pkg.title.replace(/[^a-zA-Z0-9]/g, '_')}_Itinerary.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading itinerary:", err);
      alert('Failed to download itinerary');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: pkg.title,
      text: `Check out this travel package: ${pkg.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback('Link copied!');
        setTimeout(() => setShareFeedback(''), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        setShareFeedback('Failed to copy');
      }
    }
  };

  const getFormattedPrice = () => {
    if (!pkg || typeof pkg.price !== 'number') return pkg?.price;
    const rate = rates[currency] || 1;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(pkg.price * rate);
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api', '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  if (loading) return <div className="text-center p-10">Loading details...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  if (!pkg) return <div className="text-center p-10">Package not found</div>;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : null;

  // Helper to parse itinerary
  let itineraryData = null;
  try {
    const parsed = JSON.parse(pkg.itinerary);
    if (Array.isArray(parsed)) itineraryData = parsed;
  } catch (e) {
    // Itinerary is plain text
  }

  return (
    <div className="container mx-auto p-6">
      <style>{`
        @media print {
          nav, footer, button, .no-print { display: none !important; }
        }
      `}</style>
      <Link to="/packages" className="text-[#0B1C3E] hover:text-[#D4AF37] mb-6 inline-block font-medium transition-colors no-print">
        &larr; Back to Packages
      </Link>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        {pkg.images && pkg.images.length > 0 && (
           <div className="h-64 md:h-96 w-full overflow-hidden relative">
             <img
               src={getImageUrl(pkg.images[0])}
               alt={pkg.title}
               className="w-full h-full object-cover"
               onError={(e) => { e.target.style.display = 'none'; }}
             />
           </div>
        )}
        
        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#0B1C3E] mb-2">{pkg.title}</h1>
              {averageRating && (
                <div className="flex items-center gap-2 mb-4 md:mb-0">
                  <span className="text-yellow-500 text-xl">★</span>
                  <span className="font-bold text-gray-700 text-lg">{averageRating}</span>
                  <span className="text-gray-500 text-sm">({reviews.length} reviews)</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#D4AF37] font-bold text-3xl">
                {getFormattedPrice()}
              </span>
              {typeof pkg.price === 'number' && (
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-xs border border-gray-200 rounded p-1 mt-1 bg-gray-50 text-gray-600 focus:outline-none focus:border-[#0B1C3E] cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#0B1C3E] mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{pkg.description}</p>
              </div>
              
              {pkg.itinerary && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-bold text-[#0B1C3E]">Itinerary</h3>
                    <button 
                      onClick={handleDownloadItinerary}
                      className="text-sm text-[#0B1C3E] hover:text-[#D4AF37] font-medium flex items-center gap-1 border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Download PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF
                    </button>
                  </div>
                  {itineraryData ? (
                    <div className="space-y-6 border-l-2 border-gray-200 ml-3 pl-6 relative">
                      {itineraryData.map((day, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-7.75 top-0 w-4 h-4 rounded-full bg-[#D4AF37] border-2 border-white shadow-sm"></span>
                          <h4 className="font-bold text-[#0B1C3E] text-lg">Day {day.day}: {day.title}</h4>
                          {day.image && (
                            <img 
                              src={getImageUrl(day.image)} 
                              alt={day.title} 
                              className="w-full h-64 object-cover rounded-lg my-3 shadow-sm" 
                            />
                          )}
                          <p className="text-gray-600 mt-1">{day.description}</p>
                          {day.location && (
                            <div className="mt-3">
                              <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                                <span>📍</span> {day.location}
                              </p>
                              <div className="h-48 w-full rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-gray-100">
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
                    <p className="text-gray-600 whitespace-pre-line">{pkg.itinerary}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <WeatherWidget destination={pkg.destination} />
              <div className="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
              <h3 className="text-lg font-bold text-[#0B1C3E] mb-4">Trip Details</h3>
              <ul className="space-y-3 text-gray-600 mb-6">
                {pkg.destination && (
                  <li className="flex items-center"><span className="mr-2">📍</span> Destination: {pkg.destination}</li>
                )}
                {pkg.duration && (
                  <li className="flex items-center"><span className="mr-2">⏱️</span> Duration: {pkg.duration}</li>
                )}
                {pkg.type && (
                  <li className="flex items-center"><span className="mr-2">✈️</span> Type: {pkg.type}</li>
                )}
              </ul>
              
              <button 
                onClick={() => navigate(`/book/${pkg._id || pkg.id}`)}
                className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors shadow-md"
              >
                Book This Package
              </button>
              <button 
                onClick={toggleWishlist}
                className={`w-full mt-3 py-3 rounded-lg font-bold border transition-colors ${isWishlisted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {isWishlisted ? '♥ Remove from Wishlist' : '♡ Add to Wishlist'}
              </button>
              <button 
                onClick={handleShare}
                className="w-full mt-3 py-3 rounded-lg font-bold border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors relative"
              >
                📤 Share Package
                {shareFeedback && (
                    <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-10">
                        {shareFeedback}
                    </span>
                )}
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full mt-3 py-3 rounded-lg font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                🖨️ Print Details
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-[#0B1C3E] mb-6">Guest Reviews</h2>
        {reviews.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-[#0B1C3E]">{review.name || 'Traveler'}</p>
                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "{review.comment.replace(`Review for ${pkg.title}: `, '').replace(`Review for ${pkg.title}`, '')}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic bg-gray-50 p-8 rounded-xl text-center">No reviews yet for this package. Be the first to book and review!</div>
        )}
      </div>

      {relatedPackages.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-[#0B1C3E] mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPackages.map((related) => (
              <div key={related._id || related.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {related.images && related.images.length > 0 && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={getImageUrl(related.images[0])}
                      alt={related.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-[#0B1C3E] mb-2 truncate">{related.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-[#D4AF37] font-bold text-sm">
                      {typeof related.price === 'number' ? `$${related.price.toLocaleString()}` : related.price}
                    </span>
                    <Link to={`/packages/${related._id || related.id}`} className="text-sm font-medium text-[#0B1C3E] hover:text-[#D4AF37] transition-colors">
                      View Details
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
