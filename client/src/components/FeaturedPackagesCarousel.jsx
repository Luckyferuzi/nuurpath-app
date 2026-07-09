import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios, { resolveBackendUrl } from '../lib/api';

const FeaturedPackagesCarousel = () => {
  const [packages, setPackages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await axios.get('/packages');
        const data = response.data;
        const allPackages = Array.isArray(data) ? data : (data.packages || []);
        const featured = allPackages.filter(pkg => pkg.isFeatured);
        setPackages(featured);
        setError(null);
      } catch (error) {
        setError('Featured packages are unavailable right now. Please try again shortly.');
        console.error("Error fetching featured packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  useEffect(() => {
    if (packages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % packages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [packages.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % packages.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? packages.length - 1 : prev - 1));
  };

  if (loading) return (
    <div className="w-full h-[500px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading featured packages...</span>
    </div>
  );

  if (error) return (
    <div className="text-center text-red-500 p-4">{error}</div>
  );

  if (packages.length === 0) return null;

  const currentPackage = packages[currentIndex];
  const imageUrl = currentPackage.images && currentPackage.images.length > 0 
    ? resolveBackendUrl(currentPackage.images[0])
    : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'; // Fallback

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-2xl shadow-2xl group my-8">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C3E] via-[#0B1C3E]/50 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white z-10">
        <div className="max-w-3xl animate-fadeInUp">
          <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-[#D4AF37] text-[#0B1C3E] rounded-full">
            Featured Package
          </span>
          <h2 className="text-4xl md:text-6xl font-black mb-4 leading-tight drop-shadow-lg">
            {currentPackage.title}
          </h2>
          <p className="text-lg md:text-xl text-gray-200 mb-8 line-clamp-2 drop-shadow-md max-w-2xl">
            {currentPackage.description}
          </p>
          <p className="text-sm md:text-base text-gray-200 mb-6 max-w-2xl">
            Submit a request online and continue with the NuurPath team on WhatsApp for availability and next steps.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              to={`/packages/${currentPackage._id || currentPackage.id}`}
              className="px-8 py-3 bg-[#D4AF37] text-[#0B1C3E] font-bold rounded-lg hover:bg-white transition-colors shadow-lg"
            >
              View Package
            </Link>
            <Link 
              to={`/book/${currentPackage._id || currentPackage.id}`}
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-[#0B1C3E] transition-colors shadow-lg"
            >
              Request Package
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
        aria-label="Previous slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
        aria-label="Next slide"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-8 right-8 flex space-x-2 z-20">
        {packages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'bg-[#D4AF37] w-8' : 'bg-white/50 w-2 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedPackagesCarousel;
