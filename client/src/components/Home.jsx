import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveBackendUrl } from '../lib/api';
import {
  getPackageHighlights,
  getPackageJourneyLabel,
  getPackageShortDescription,
} from '../lib/packagePresentation.js';
import {
  getServiceCtaLabel,
  getServiceEntryPath,
  getServicePublicDescription,
} from '../lib/servicePresentation.js';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import GlobalSupport from './GlobalSupport';
import MemoriesGallery from './MemoriesGallery';
import NewsletterForm from './NewsletterForm';
import { PublicPageShell, PublicSectionHeading } from './PublicPageShell.jsx';
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
    description: getPackageShortDescription(pkg.description, 108),
    highlights: getPackageHighlights(pkg).slice(0, 2),
    journeyLabel: getPackageJourneyLabel(pkg),
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

  const showTripSkeleton = packagesLoading && upcomingTrips.length === 0;
  const showServicesSkeleton = servicesLoading && services.length === 0;
  const activeTrip = upcomingTrips[currentSlide] || null;

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
        .home-line-clamp-1 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
          overflow: hidden;
        }
        .home-line-clamp-2 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }
        .home-line-clamp-3 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        }
      `}</style>

      <section className="bg-[#0B1C3E] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-20">
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">Guided Travel Support</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Start your travel plan with a clear first step.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Browse packages, request flights, and ask for visa or passport guidance. Start on the website, then continue with the NuurPath team on WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/packages" className="rounded-full bg-[#D4AF37] px-8 py-3 text-center font-black uppercase tracking-[0.16em] text-[#0B1C3E] transition-colors hover:bg-white">
                Explore Packages
              </Link>
              <Link to="/book-flight" className="rounded-full border border-white/30 px-8 py-3 text-center font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[#0B1C3E]">
                Request Flight
              </Link>
              <a
                href="#how-it-works"
                onClick={scrollToSection('how-it-works')}
                className="cursor-pointer rounded-full border border-white/30 px-8 py-3 text-center font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[#0B1C3E]"
              >
                How It Works
              </a>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">What To Expect</p>
            <ul className="mt-4 space-y-4 text-sm leading-7 text-slate-200">
              <li>Start the request online with the important details.</li>
              <li>Receive human follow-up from the NuurPath team.</li>
              <li>No online payment is required on the website.</li>
            </ul>
          </div>
        </div>
      </section>

      <PublicPageShell background="soft" contentClassName="py-14 sm:py-16 lg:py-20">
        <PublicSectionHeading
          eyebrow="Start Here"
          title="Featured packages"
          description="Start with the journeys NuurPath wants to highlight, then ask for availability, guidance, and the next step."
          actions={<Link to="/packages" className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1a2f55]">View All Packages</Link>}
        />
        {packagesError && upcomingTrips.length === 0 && (
          <div className="mb-8 mt-10 text-center text-red-500">{packagesError}</div>
        )}
        <div
          className="group relative mx-auto mt-10 min-h-[250px] max-w-[49rem] overflow-hidden rounded-[1.6rem] border border-[#e6dfd2] bg-white shadow-[0_18px_44px_rgba(16,28,45,0.08)] sm:min-h-[300px] lg:min-h-[310px]"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {showTripSkeleton ? (
            <div className="grid min-h-[250px] grid-cols-[132px_minmax(0,1fr)] sm:min-h-[300px] sm:grid-cols-[0.86fr_1.14fr] lg:grid-cols-[0.94fr_1.06fr]">
              <div className="min-h-full bg-[#f3eee4]">
                <div className="h-full w-full bg-gray-300"></div>
              </div>
              <div className="flex flex-col justify-center gap-3 bg-white p-4 sm:gap-4 sm:p-6 lg:p-7">
                <div className="h-5 w-28 rounded bg-gray-200"></div>
                <div className="h-7 w-3/4 rounded bg-gray-200"></div>
                <div className="h-4 w-full rounded bg-gray-200"></div>
                <div className="h-4 w-4/5 rounded bg-gray-200"></div>
                <div className="flex gap-3">
                  <div className="h-10 w-28 rounded-full bg-gray-200"></div>
                  <div className="h-10 w-28 rounded-full bg-gray-200"></div>
                </div>
              </div>
            </div>
          ) : activeTrip ? (
            <>
              <div className="grid min-h-[250px] grid-cols-[132px_minmax(0,1fr)] sm:min-h-[300px] sm:grid-cols-[0.86fr_1.14fr] lg:grid-cols-[0.94fr_1.06fr]">
                <div className="flex min-h-full items-center justify-center overflow-hidden bg-[#f3eee4] p-2 sm:h-[250px] sm:p-4 lg:h-full">
                  <img
                    src={activeTrip.image}
                    alt={activeTrip.title}
                    className="block max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                </div>
                <div className="flex flex-col justify-center bg-white p-4 sm:p-6 lg:p-7">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
                    Featured package
                  </p>
                  <h3 className="home-line-clamp-2 mt-2 text-lg font-black tracking-tight text-[#101c2d] sm:mt-3 sm:text-[1.7rem]">
                    {activeTrip.title}
                  </h3>
                  <p className="home-line-clamp-2 mt-2 text-sm font-semibold leading-6 text-[#2d5f50] sm:mt-3">
                    {activeTrip.journeyLabel}
                  </p>
                  <p className="home-line-clamp-2 mt-2 text-sm leading-6 text-[#5f6774] sm:mt-3 sm:leading-7">
                    {activeTrip.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                    {activeTrip.highlights.map((item) => (
                      <span key={item} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:gap-3 sm:flex-row">
                    <Link to={activeTrip.link} className="rounded-full bg-[#0B1C3E] px-5 py-2.5 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#1a2f55] sm:px-7 sm:py-3 sm:text-sm">
                      View Package
                    </Link>
                    <Link
                      to={`/book/${activeTrip.id}`}
                      className="rounded-full border border-[#d8cfbf] bg-white px-5 py-2.5 text-center text-xs font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3] sm:px-7 sm:py-3 sm:text-sm"
                    >
                      Request Package
                    </Link>
                  </div>
                </div>
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#e7decd] bg-white p-2 text-[#101c2d] shadow-sm transition-colors hover:bg-[#faf8f3] sm:left-4 sm:p-2.5"
                type="button"
              >
                &#10094;
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[#e7decd] bg-white p-2 text-[#101c2d] shadow-sm transition-colors hover:bg-[#faf8f3] sm:right-4 sm:p-2.5"
                type="button"
              >
                &#10095;
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-4">
                {upcomingTrips.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-3 w-3 rounded-full transition-colors ${idx === currentSlide ? 'bg-[#D4AF37]' : 'bg-[#d7cfbe]'}`}
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

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {trustBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-[#e7decd] bg-white px-4 py-2 text-sm font-semibold text-[#0B1C3E]">
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
                  {getServicePublicDescription(service)}
                </p>
                <p className="mb-6 text-xs font-black uppercase tracking-[0.22em] text-[#8a7240]">
                  Human support for important travel steps
                </p>
                <Link
                  to={getServiceEntryPath(service)}
                  className="inline-block rounded-full bg-[#0B1C3E] px-6 py-3 font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1a2f55]"
                >
                  {getServiceCtaLabel(service)}
                </Link>
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
        <div id="consultation" className="overflow-hidden rounded-[1.75rem] bg-[#006837] px-6 py-10 text-white shadow-[0_16px_40px_rgba(0,77,46,0.18)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Personal Guidance</p>
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

      <section id="newsletter" className="bg-[#f7f6f2] py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#e8dfcf] bg-white shadow-[0_16px_40px_rgba(16,28,45,0.06)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="bg-[#0B1C3E] px-8 py-10 text-white sm:px-10">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Stay Connected</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Get future travel updates from NuurPath
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100">
                  Join the newsletter for selected package highlights, travel guidance updates, and important announcements from the NuurPath team.
                </p>
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
    </div>
  );
};

export default Home;
