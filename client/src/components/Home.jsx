import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveBackendUrl } from '../lib/api';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import GlobalSupport from './GlobalSupport';
import BookingForm from './BookingForm';
import MemoriesGallery from './MemoriesGallery';
import ServiceInquiryForm from './ServiceInquiryForm';

const Home = () => {
  const {
    packages,
    featuredPackages,
    services,
    packagesLoading,
    servicesLoading,
    packagesError,
    servicesError,
  } = usePublicContent();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [serviceInquiryModalOpen, setServiceInquiryModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const processSteps = [
    {
      title: 'Choose What You Need',
      description: 'Start with a package, flight request, consultation, or document support service.',
    },
    {
      title: 'Send Your Request',
      description: 'Share your dates, contact details, and anything important for your trip.',
    },
    {
      title: 'We Review It',
      description: 'The NuurPath team checks availability, requirements, and the best next step.',
    },
    {
      title: 'Continue on WhatsApp',
      description: 'We follow up directly to guide you, answer questions, and move the request forward.',
    },
  ];
  const trustBadges = [
    'Human Support',
    'WhatsApp Follow-up',
    'Umrah & Travel Packages',
    'Visa & Passport Guidance',
    'No Online Payment Required',
    'Tanzania-Based Support',
  ];

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels';
    }

    return resolveBackendUrl(imagePath);
  };

  const prioritizedTrips = featuredPackages.length > 0 ? featuredPackages : packages;
  const upcomingTrips = prioritizedTrips.slice(0, 5).map((pkg) => ({
    id: pkg._id || pkg.id,
    title: pkg.title,
    image: (pkg.images && pkg.images.length > 0)
      ? getImageUrl(pkg.images[0])
      : 'https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels',
    link: `/packages/${pkg._id || pkg.id}`,
  }));

  useEffect(() => {
    if (currentSlide < upcomingTrips.length) {
      return;
    }

    setCurrentSlide(0);
  }, [currentSlide, upcomingTrips.length]);

  useEffect(() => {
    if (upcomingTrips.length === 0 || isPaused) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % upcomingTrips.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [upcomingTrips.length, isPaused]);

  const nextSlide = () => {
    if (upcomingTrips.length === 0) {
      return;
    }

    setCurrentSlide((prev) => (prev + 1) % upcomingTrips.length);
  };

  const prevSlide = () => {
    if (upcomingTrips.length === 0) {
      return;
    }

    setCurrentSlide((prev) => (prev - 1 + upcomingTrips.length) % upcomingTrips.length);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    }

    if (isRightSwipe) {
      prevSlide();
    }
  };

  const scrollToSection = (sectionId) => (e) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookNow = (tripId) => {
    setSelectedTripId(tripId);
    setBookingModalOpen(true);
    setIsPaused(true);
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setSelectedTripId(null);
    setIsPaused(false);
  };

  const isConsultationService = (service) => /consult/i.test(String(service?.title || ''));

  const getServiceCtaLabel = (service) => {
    const title = String(service?.title || '').toLowerCase();

    if (title.includes('flight')) {
      return 'Ask About Flights';
    }

    if (title.includes('passport')) {
      return 'Start Passport Support';
    }

    if (title.includes('visa')) {
      return 'Start Visa Guidance';
    }

    if (title.includes('document')) {
      return 'Get Guidance';
    }

    if (title.includes('consult')) {
      return 'Request Consultation';
    }

    if (title.includes('package') || title.includes('holiday') || title.includes('umrah')) {
      return 'Request Package';
    }

    return 'Start Request';
  };

  const getServiceDescription = (service) => {
    const title = String(service?.title || '').toLowerCase();

    if (title.includes('umrah') || title.includes('package') || title.includes('holiday')) {
      return 'Explore guided Umrah and travel package options, then submit your request online. Our team will continue with availability, requirements, and next steps on WhatsApp.';
    }

    if (title.includes('flight')) {
      return 'Share your route, dates, and passenger details. Our team will check suitable options and follow up with guidance and quotation.';
    }

    if (title.includes('visa')) {
      return 'Tell us your destination and travel purpose. We help you understand the required documents and next steps.';
    }

    if (title.includes('passport')) {
      return 'Start your passport support request and receive guidance on procedures, documents, and preparation.';
    }

    if (title.includes('document')) {
      return 'Share your situation so our team can guide you on travel documents, requirements, and preparation.';
    }

    if (title.includes('consult')) {
      return 'Request a private consultation for personalized travel guidance and planning support.';
    }

    if (title.includes('hotel')) {
      return 'Share your destination, dates, and room needs. Our team will guide you on suitable accommodation options and next steps.';
    }

    return 'Need help with a custom travel plan? Share your request online and our team will guide you through the next steps on WhatsApp.';
  };

  const openServiceInquiryModal = (service) => {
    setSelectedService(service);
    setServiceInquiryModalOpen(true);
  };

  const closeServiceInquiryModal = () => {
    setSelectedService(null);
    setServiceInquiryModalOpen(false);
  };

  const showTripSkeleton = packagesLoading && upcomingTrips.length === 0;
  const showServicesSkeleton = servicesLoading && services.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="relative overflow-hidden bg-[#0B1C3E] px-4 py-20 text-center text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10 bg-fixed"></div>
        <div className="container relative z-10 mx-auto">
          <h1 className="mb-6 text-4xl font-black uppercase tracking-tighter md:text-6xl">
            Start Your Journey <br />
            <span className="text-[#D4AF37]">with Guided Travel Support</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg font-medium text-gray-300 md:text-xl">
            Browse Umrah packages, request flights, and ask for visa or passport guidance. Start on the website, then continue with the NuurPath team on WhatsApp.
          </p>
          <div className="mb-5 flex flex-col justify-center gap-4 md:flex-row">
            <Link to="/packages" className="rounded-full bg-[#D4AF37] px-8 py-3 font-bold uppercase tracking-widest text-[#0B1C3E] transition-colors hover:bg-white">
              Explore Packages
            </Link>
            <Link to="/book-flight" className="rounded-full border-2 border-[#D4AF37] px-8 py-3 font-bold uppercase tracking-widest text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0B1C3E]">
              Ask About Flights
            </Link>
            <a
              href="#how-it-works"
              onClick={scrollToSection('how-it-works')}
              className="cursor-pointer rounded-full border-2 border-white px-8 py-3 font-bold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-[#0B1C3E]"
            >
              See How It Works
            </a>
          </div>
          <p className="text-sm font-semibold tracking-wide text-gray-400">
            Start on the website. Finish the follow-up with our team on WhatsApp. No online payment is required here.
          </p>
        </div>
      </div>

      <div id="featured-packages" className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">Featured Packages</h2>
          <div className="mx-auto h-1 w-24 bg-[#D4AF37]"></div>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Start with the packages we want customers to see first, then ask for availability, guidance, and next steps.
          </p>
        </div>
        {packagesError && upcomingTrips.length === 0 && (
          <div className="mb-8 text-center text-red-500">{packagesError}</div>
        )}
        <div
          className="group relative mx-auto aspect-video max-w-5xl overflow-hidden rounded-2xl bg-gray-200 shadow-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {showTripSkeleton ? (
            <div className="flex h-full w-full animate-pulse flex-col items-center justify-center bg-gray-300">
              <div className="mb-6 h-12 w-2/3 rounded bg-gray-400"></div>
              <div className="h-12 w-40 rounded-full bg-gray-400"></div>
            </div>
          ) : upcomingTrips.length > 0 ? (
            <>
              {upcomingTrips.map((trip, index) => (
                <div
                  key={trip.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                >
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="h-full w-full object-cover"
                    loading={index === currentSlide ? 'eager' : 'lazy'}
                    fetchPriority={index === currentSlide ? 'high' : 'low'}
                    decoding="async"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-white">
                    <h3 className="mb-4 text-center text-3xl font-black uppercase tracking-tighter md:text-5xl">{trip.title}</h3>
                    <div className="flex flex-col gap-4 md:flex-row">
                      <Link to={trip.link} className="rounded-full bg-[#D4AF37] px-8 py-3 font-bold uppercase tracking-widest text-[#0B1C3E] transition-colors hover:bg-white">
                        View Package
                      </Link>
                      <button
                        onClick={() => handleBookNow(trip.id)}
                        className="rounded-full border-2 border-white px-8 py-3 font-bold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-[#0B1C3E]"
                        type="button"
                      >
                        Request Package
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                type="button"
              >
                &#10094;
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
                type="button"
              >
                &#10095;
              </button>

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                {upcomingTrips.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-3 w-3 rounded-full transition-colors ${idx === currentSlide ? 'bg-[#D4AF37]' : 'bg-white/50'}`}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-500">
              Packages are being prepared. Please check again soon or contact us on WhatsApp.
            </div>
          )}
        </div>
      </div>

      <div id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">How NuurPath Works</h2>
          <div className="mx-auto h-1 w-24 bg-[#D4AF37]"></div>
          <p className="mx-auto mt-4 max-w-3xl text-gray-600">
            The website helps you start the request clearly. Our team then takes over with real follow-up and guidance.
          </p>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1C3E] text-lg font-black text-white">
                {index + 1}
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#0B1C3E]">{step.title}</h3>
              <p className="text-sm leading-6 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {trustBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#0B1C3E] shadow-sm">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div id="services" className="border-y border-gray-100 bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">Travel Support Services</h2>
            <div className="mx-auto h-1 w-24 bg-[#D4AF37]"></div>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Need help beyond packages? Send a service request and our team will guide you on WhatsApp.
            </p>
          </div>
          {servicesError && services.length === 0 && (
            <div className="mb-8 text-center text-red-500">{servicesError}</div>
          )}
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {showServicesSkeleton ? (
              [1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
                  <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="mx-auto mb-3 h-6 w-3/4 rounded bg-gray-200"></div>
                  <div className="mx-auto mb-2 h-4 w-full rounded bg-gray-200"></div>
                  <div className="mx-auto h-4 w-5/6 rounded bg-gray-200"></div>
                </div>
              ))
            ) : services.length > 0 ? (
              services.map((service, index) => (
                <div
                  key={service._id || service.id}
                  className="animate-fadeInUp rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center transition-shadow hover:shadow-lg"
                  style={{ opacity: 0, animationDelay: `${index * 0.2}s` }}
                >
                  <div className="mb-4 text-4xl">{index % 2 === 0 ? '\u2708\uFE0F' : '\u{1F30D}'}</div>
                  <h3 className="mb-3 text-xl font-bold text-[#0B1C3E]">{service.title}</h3>
                  <p className="mb-4 text-gray-600">
                    {getServiceDescription(service)}
                  </p>
                  <p className="mb-6 text-xs font-bold uppercase tracking-[2px] text-gray-500">
                    Human support for important travel steps
                  </p>
                  {isConsultationService(service) ? (
                    <Link
                      to="/book-consultation"
                      className="inline-block rounded-full bg-[#0B1C3E] px-6 py-3 font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1a2f55]"
                    >
                      {getServiceCtaLabel(service)}
                    </Link>
                  ) : (
                    <button
                      onClick={() => openServiceInquiryModal(service)}
                      className="rounded-full bg-[#0B1C3E] px-6 py-3 font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1a2f55]"
                      type="button"
                    >
                      {getServiceCtaLabel(service)}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500">
                No services are available right now. Please check again soon or contact us on WhatsApp.
              </div>
            )}
          </div>
        </div>
      </div>

      <div id="consultation" className="bg-[#006837] py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-black uppercase tracking-widest">Need Personalized Travel Guidance?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-green-100">
            Request a private consultation for personalized travel guidance, planning support, and help understanding your next steps.
          </p>
          <Link to="/book-consultation" className="inline-block rounded-full bg-white px-8 py-4 font-bold uppercase tracking-widest text-[#006837] shadow-lg transition-colors hover:bg-[#D4AF37] hover:text-[#0B1C3E]">
            Request Private Consultation
          </Link>
        </div>
      </div>

      <div id="packages" className="bg-[#0B1C3E] py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-black uppercase tracking-widest">Ready To See Every Package?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-base text-blue-100">
            Browse the full package list in one place, compare options, and send your request when you are ready.
          </p>
          <Link
            to="/packages"
            className="inline-block rounded-full bg-[#D4AF37] px-8 py-4 font-bold uppercase tracking-widest text-[#0B1C3E] transition-colors hover:bg-white"
          >
            View All Packages
          </Link>
        </div>
      </div>

      <MemoriesGallery />

      <GlobalSupport />

      {bookingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeBookingModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeBookingModal}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-1 text-gray-500 hover:text-gray-800"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-2">
              <BookingForm packageId={selectedTripId} onClose={closeBookingModal} isModal={true} />
            </div>
          </div>
        </div>
      )}

      {serviceInquiryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeServiceInquiryModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeServiceInquiryModal}
              className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 p-1 text-gray-500 hover:text-gray-800"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-2">
              <ServiceInquiryForm service={selectedService} onClose={closeServiceInquiryModal} isModal={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
