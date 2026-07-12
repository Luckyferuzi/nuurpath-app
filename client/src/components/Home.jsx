import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveBackendUrl } from '../lib/api';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import GlobalSupport from './GlobalSupport';
import BookingForm from './BookingForm';
import MemoriesGallery from './MemoriesGallery';
import NewsletterForm from './NewsletterForm';
import { PublicPageShell, PublicSectionHeading } from './PublicPageShell.jsx';
import ServiceInquiryForm from './ServiceInquiryForm';
import TravelEvidenceSection from './TravelEvidenceSection.jsx';

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
  const journeyHighlights = [
    {
      title: 'Start online with clarity',
      description: 'Choose a package or service, send the important details, and let our team take over the follow-up.',
    },
    {
      title: 'Talk to a real team',
      description: 'Availability, guidance, and travel requirements are confirmed by people who continue with you on WhatsApp.',
    },
    {
      title: 'Plan before payment',
      description: 'The website helps you move forward confidently before any payment step is discussed offline.',
    },
  ];
  const servicePromises = [
    'Request support online first',
    'Receive human review and next steps',
    'Use WhatsApp for continuation only',
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
    <div className="min-h-screen bg-transparent">
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

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,_#081a38_0%,_#0B1C3E_42%,_#123869_100%)] text-white">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10"></div>
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl"></div>
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:px-8 lg:py-20">
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-[0.38em] text-[#D4AF37]">Guided Travel Support</p>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              Start your journey with a clear first step.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Browse Umrah packages, request flights, and ask for visa or passport guidance. Start the important part on the website, then continue with the NuurPath team on WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link to="/packages" className="rounded-full bg-[#D4AF37] px-8 py-3 text-center font-black uppercase tracking-[0.22em] text-[#0B1C3E] transition-colors hover:bg-white">
                Explore Packages
              </Link>
              <Link to="/book-flight" className="rounded-full border border-[#D4AF37] px-8 py-3 text-center font-black uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#0B1C3E]">
                Ask About Flights
              </Link>
              <a
                href="#how-it-works"
                onClick={scrollToSection('how-it-works')}
                className="cursor-pointer rounded-full border border-white/30 px-8 py-3 text-center font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-white hover:text-[#0B1C3E]"
              >
                See How It Works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {trustBadges.slice(0, 4).map((badge) => (
                <span key={badge} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-100">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-[0_24px_80px_rgba(2,8,24,0.35)] backdrop-blur sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">How The Journey Starts</p>
            <h2 className="mt-4 text-2xl font-black leading-tight text-white">
              Clear requests first. Human follow-up next.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-200">
              NuurPath helps customers move beyond browsing. You can send the important travel details online before our team continues personally on WhatsApp.
            </p>
            <div className="mt-6 grid gap-4">
              {journeyHighlights.map((item) => (
                <div key={item.title} className="rounded-[1.4rem] border border-white/10 bg-[#081935]/55 p-4">
                  <h3 className="text-base font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.4rem] border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-4 text-sm leading-7 text-slate-100">
              No online payment is required on the website. We review requests first, then guide the next step directly with you.
            </div>
          </div>
        </div>
      </section>

      <PublicPageShell background="soft" contentClassName="py-14 sm:py-16 lg:py-20">
        <PublicSectionHeading
          eyebrow="Start Here"
          title="Featured packages customers should see first"
          description="Start with the journeys NuurPath wants to highlight, then ask for availability, guidance, and the next step."
          actions={(
            <>
              <Link to="/packages" className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#16263b]">
                View All Packages
              </Link>
              <Link to="/contact" className="rounded-full border border-[#cfbf9b] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#101c2d] transition-colors hover:bg-white">
                Talk To NuurPath
              </Link>
            </>
          )}
        />
        {packagesError && upcomingTrips.length === 0 && (
          <div className="mb-8 mt-10 text-center text-red-500">{packagesError}</div>
        )}
        <div
          className="group relative mx-auto mt-10 aspect-video max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-gray-200 shadow-[0_30px_90px_rgba(16,28,45,0.16)]"
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

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {journeyHighlights.map((item) => (
            <div key={item.title} className="rounded-[1.75rem] border border-[#e8dfcf] bg-white/90 p-6 shadow-[0_16px_40px_rgba(16,28,45,0.06)]">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-[#8a7240]">NuurPath Promise</p>
              <h3 className="mt-3 text-xl font-black text-[#101c2d]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5f6774]">{item.description}</p>
            </div>
          ))}
        </div>
      </PublicPageShell>

      <PublicPageShell background="white" contentClassName="py-14 sm:py-16 lg:py-20">
        <div id="how-it-works">
          <PublicSectionHeading
            eyebrow="Process"
            title="How NuurPath works"
            description="The website helps you start the request clearly. Our team then takes over with real follow-up and guidance."
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, index) => (
            <div key={step.title} className="rounded-[1.75rem] border border-[#e7decd] bg-[#fffdfa] p-6 text-left shadow-[0_16px_40px_rgba(16,28,45,0.06)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1C3E] text-lg font-black text-white shadow-lg">
                {index + 1}
              </div>
              <h3 className="mb-2 text-lg font-black text-[#0B1C3E]">{step.title}</h3>
              <p className="text-sm leading-7 text-[#5f6774]">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {trustBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-[#e7decd] bg-white px-4 py-2 text-sm font-semibold text-[#0B1C3E] shadow-sm">
              {badge}
            </span>
          ))}
        </div>
      </PublicPageShell>

      <PublicPageShell background="soft" contentClassName="py-14 sm:py-16 lg:py-20">
        <div id="services">
          <PublicSectionHeading
            eyebrow="Support Services"
            title="Travel support beyond packages"
            description="Need help with flights, visa guidance, passport support, or a custom travel plan? Start the request online and our team will guide the continuation on WhatsApp."
          />
        </div>
        {servicesError && services.length === 0 && (
          <div className="mb-8 mt-10 text-center text-red-500">{servicesError}</div>
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {servicePromises.map((promise) => (
            <span key={promise} className="rounded-full border border-[#d8cfbf] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#101c2d]">
              {promise}
            </span>
          ))}
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          {showServicesSkeleton ? (
            [1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-[1.8rem] border border-[#e8dfcf] bg-white p-8 text-center shadow-[0_16px_40px_rgba(16,28,45,0.06)]">
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
                className="animate-fadeInUp rounded-[1.8rem] border border-[#e8dfcf] bg-white p-8 text-left shadow-[0_16px_40px_rgba(16,28,45,0.06)] transition-shadow hover:shadow-[0_24px_60px_rgba(16,28,45,0.1)]"
                style={{ opacity: 0, animationDelay: `${index * 0.2}s` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1C3E] text-xl text-white shadow-md">
                  {index % 2 === 0 ? '\u2708\uFE0F' : '\u{1F30D}'}
                </div>
                <h3 className="mb-3 text-xl font-black text-[#0B1C3E]">{service.title}</h3>
                <p className="mb-4 leading-7 text-[#5f6774]">
                  {getServiceDescription(service)}
                </p>
                <p className="mb-6 text-xs font-black uppercase tracking-[0.22em] text-[#8a7240]">
                  Human support for important travel steps
                </p>
                {isConsultationService(service) ? (
                  <Link
                    to="/book-consultation"
                    className="inline-block rounded-full bg-[#0B1C3E] px-6 py-3 font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1a2f55]"
                  >
                    {getServiceCtaLabel(service)}
                  </Link>
                ) : (
                  <button
                    onClick={() => openServiceInquiryModal(service)}
                    className="rounded-full bg-[#0B1C3E] px-6 py-3 font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1a2f55]"
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
      </PublicPageShell>

      <PublicPageShell background="white" contentClassName="pb-6 pt-0 sm:pb-8">
        <div id="consultation" className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,_#006837_0%,_#0b3d2b_100%)] px-6 py-10 text-white shadow-[0_24px_80px_rgba(0,77,46,0.25)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">Personal Guidance</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Need help planning a more personal trip?</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-green-100">
                Request a private consultation for personalized travel guidance, planning support, and help understanding your next steps.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/book-consultation" className="inline-block rounded-full bg-white px-8 py-4 font-black uppercase tracking-[0.18em] text-[#006837] shadow-lg transition-colors hover:bg-[#D4AF37] hover:text-[#0B1C3E]">
                Request Consultation
              </Link>
              <Link to="/packages" className="inline-block rounded-full border border-white/40 px-8 py-4 font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#0B1C3E]">
                Browse Packages
              </Link>
            </div>
          </div>
        </div>
      </PublicPageShell>

      <TravelEvidenceSection />

      <MemoriesGallery />

      <section id="newsletter" className="bg-[#f7f2e8] py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-[#e8dfcf] bg-white shadow-[0_24px_80px_rgba(16,28,45,0.08)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="bg-[linear-gradient(135deg,_#0B1C3E_0%,_#10264f_60%,_#1d3d76_100%)] px-8 py-10 text-white sm:px-10">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#D4AF37]">Stay Connected</p>
                <h2 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Get future travel updates from NuurPath
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100">
                  Join the newsletter for selected package highlights, travel guidance updates, and important announcements from the NuurPath team.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {['Package highlights', 'Travel guidance', 'Important updates'].map((item) => (
                    <span key={item} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-[#fcfbf8] px-8 py-10 sm:px-10">
                <h3 className="text-lg font-black text-[#101c2d]">Newsletter Sign-Up</h3>
                <p className="mt-3 text-sm leading-7 text-[#67707e]">
                  Simple collection only for now. Campaign sending is not handled inside the website yet.
                </p>
                <div className="mt-6">
                  <NewsletterForm variant="panel" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
