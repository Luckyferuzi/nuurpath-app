import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { resolveBackendUrl } from '../lib/api';

const FeaturedPackagesCarousel = () => {
  const { packages, featuredPackages, packagesLoading, packagesError } = usePublicContent();
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselPackages = (featuredPackages.length > 0 ? featuredPackages : packages).slice(0, 5);

  useEffect(() => {
    if (currentIndex < carouselPackages.length) {
      return;
    }

    setCurrentIndex(0);
  }, [carouselPackages.length, currentIndex]);

  useEffect(() => {
    if (carouselPackages.length === 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % carouselPackages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [carouselPackages.length]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselPackages.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? carouselPackages.length - 1 : prev - 1));
  };

  if (packagesLoading && carouselPackages.length === 0) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-2xl bg-gray-100 animate-pulse">
        <span className="text-gray-400">Loading featured packages...</span>
      </div>
    );
  }

  if (packagesError && carouselPackages.length === 0) {
    return (
      <div className="p-4 text-center text-red-500">{packagesError}</div>
    );
  }

  if (carouselPackages.length === 0) {
    return null;
  }

  const currentPackage = carouselPackages[currentIndex];
  const imageUrl = currentPackage.images && currentPackage.images.length > 0
    ? resolveBackendUrl(currentPackage.images[0])
    : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="group relative my-8 h-[500px] w-full overflow-hidden rounded-2xl shadow-2xl">
      <div
        className="absolute inset-0 transform bg-cover bg-center transition-all duration-700 ease-in-out hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C3E] via-[#0B1C3E]/50 to-transparent"></div>
      </div>

      <div className="absolute bottom-0 left-0 z-10 w-full p-8 text-white md:p-12">
        <div className="max-w-3xl animate-fadeInUp">
          <span className="mb-4 inline-block rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#0B1C3E]">
            Featured Package
          </span>
          <h2 className="mb-4 text-4xl font-black leading-tight drop-shadow-lg md:text-6xl">
            {currentPackage.title}
          </h2>
          <p className="mb-8 max-w-2xl line-clamp-2 text-lg text-gray-200 drop-shadow-md md:text-xl">
            {currentPackage.description}
          </p>
          <p className="mb-6 max-w-2xl text-sm text-gray-200 md:text-base">
            Submit a request online and continue with the NuurPath team on WhatsApp for availability and next steps.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to={`/packages/${currentPackage._id || currentPackage.id}`}
              className="rounded-lg bg-[#D4AF37] px-8 py-3 font-bold text-[#0B1C3E] shadow-lg transition-colors hover:bg-white"
            >
              View Package
            </Link>
            <Link
              to={`/book/${currentPackage._id || currentPackage.id}`}
              className="rounded-lg border-2 border-white bg-transparent px-8 py-3 font-bold text-white shadow-lg transition-colors hover:bg-white hover:text-[#0B1C3E]"
            >
              Request Package
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/50"
        aria-label="Previous slide"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-3 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/50"
        aria-label="Next slide"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="absolute bottom-8 right-8 z-20 flex space-x-2">
        {carouselPackages.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-8 bg-[#D4AF37]' : 'w-2 bg-white/50 hover:bg-white'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedPackagesCarousel;
