//Users/issatende/Projects/nuurpath-travels/client/src/components/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios, { resolveBackendUrl } from '../lib/api';
import PackageList from './PackageList';
import GlobalSupport from './GlobalSupport';
import BookingForm from './BookingForm';
import MemoriesGallery from './MemoriesGallery';
import ServiceInquiryForm from './ServiceInquiryForm';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [tripsError, setTripsError] = useState(null);
  const [servicesError, setServicesError] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [serviceInquiryModalOpen, setServiceInquiryModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const processSteps = [
    {
      title: 'Submit Your Request',
      description: 'Choose a package or service and share the details we need to understand your travel plans.',
    },
    {
      title: 'Team Review',
      description: 'Our team checks your request, clarifies requirements, and prepares the next steps.',
    },
    {
      title: 'Continue on WhatsApp',
      description: 'We continue the important conversation with you directly on WhatsApp.',
    },
    {
      title: 'Get Guided Support',
      description: 'Receive guidance for packages, flights, documents, and travel preparation.',
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

  useEffect(() => {
    const getImageUrl = (imagePath) => {
      if (!imagePath) return "https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels";
      return resolveBackendUrl(imagePath);
    };

    const fetchTrips = async () => {
      try {
        const response = await axios.get(`/packages`);
        const data = Array.isArray(response.data) ? response.data : (response.data.packages || []);
        
        const trips = data.slice(0, 5).map(pkg => ({
          id: pkg._id || pkg.id,
          title: pkg.title,
          image: (pkg.images && pkg.images.length > 0) ? getImageUrl(pkg.images[0]) : "https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels",
          link: `/packages/${pkg._id || pkg.id}`
        }));
        setUpcomingTrips(trips);
      } catch (error) {
        setTripsError('Something went wrong while loading packages. Please try again or contact us on WhatsApp.');
        console.error("Failed to fetch upcoming trips", error);
      } finally {
        setLoadingTrips(false);
      }
    };

    const fetchServices = async () => {
      try {
        const response = await axios.get(`/services`);
        setServices(response.data);
      } catch (error) {
        setServicesError('Something went wrong while loading our services. Please try again or contact us on WhatsApp.');
        console.error("Failed to fetch services", error);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchTrips();
    fetchServices();
  }, []);

  useEffect(() => {
    if (upcomingTrips.length === 0 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % upcomingTrips.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [upcomingTrips.length, isPaused]);

  const nextSlide = () => {
    if (upcomingTrips.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % upcomingTrips.length);
  };

  const prevSlide = () => {
    if (upcomingTrips.length === 0) return;
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
    if (!touchStart || !touchEnd) return;
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

  return (
    <div className="bg-gray-50 min-h-screen">
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
      {/* Hero Section */}
      <div className="bg-[#0B1C3E] text-white py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] bg-fixed"></div>
        <div className="container mx-auto relative z-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            Start Your Journey <br/>
            <span className="text-[#D4AF37]">with Guided Travel Support</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-medium">
            Explore Umrah packages, request flights, and get visa or passport guidance online - then continue with the NuurPath team on WhatsApp for the next steps.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center mb-5">
            <Link to="/packages" className="bg-[#D4AF37] text-[#0B1C3E] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white transition-colors">
              Explore Packages
            </Link>
            <Link to="/book-flight" className="border-2 border-[#D4AF37] text-[#D4AF37] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#0B1C3E] transition-colors">
              Ask About Flights
            </Link>
            <a href="#services" onClick={scrollToSection('services')} className="border-2 border-white text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-[#0B1C3E] transition-colors cursor-pointer">
              Get Travel Guidance
            </a>
          </div>
          <p className="text-sm text-gray-400 font-semibold tracking-wide">
            Start your request online. Continue with our team on WhatsApp. No online payment is required on the website.
          </p>
        </div>
      </div>

      {/* Trust Process Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">How NuurPath Helps</h2>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
          <p className="text-gray-600 mt-4 max-w-3xl mx-auto">
            NuurPath helps you start important travel requests online, then continue with real human support for quotations, document guidance, and next steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {processSteps.map((step, index) => (
            <div key={step.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left">
              <div className="w-12 h-12 rounded-full bg-[#0B1C3E] text-white flex items-center justify-center font-black text-lg mb-4">
                {index + 1}
              </div>
              <h3 className="text-lg font-bold text-[#0B1C3E] mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-6">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {trustBadges.map((badge) => (
            <span key={badge} className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-[#0B1C3E] shadow-sm">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Featured Packages Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">Featured Packages</h2>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Explore Umrah and travel package options, then send your request online for human review and WhatsApp follow-up.
          </p>
        </div>
        
        {tripsError && (
            <div className="text-center text-red-500 mb-8">{tripsError}</div>
        )}
        <div 
          className="relative max-w-5xl mx-auto overflow-hidden rounded-2xl shadow-2xl aspect-video group bg-gray-200"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
            {loadingTrips ? (
                <div className="w-full h-full flex flex-col items-center justify-center animate-pulse bg-gray-300">
                    <div className="h-12 w-2/3 bg-gray-400 rounded mb-6"></div>
                    <div className="h-12 w-40 bg-gray-400 rounded-full"></div>
                </div>
            ) : upcomingTrips.length > 0 ? (
                <>
                    {upcomingTrips.map((trip, index) => (
                        <div 
                            key={trip.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-4">
                                <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-center">{trip.title}</h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Link to={trip.link} className="bg-[#D4AF37] text-[#0B1C3E] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white transition-colors">
                                        View Package
                                    </Link>
                                    <button 
                                        onClick={() => handleBookNow(trip.id)}
                                        className="border-2 border-white text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-[#0B1C3E] transition-colors"
                                    >
                                        Request Package
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-10">
                        &#10094;
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition-colors z-10">
                        &#10095;
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {upcomingTrips.map((_, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`w-3 h-3 rounded-full transition-colors ${idx === currentSlide ? 'bg-[#D4AF37]' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold text-xl">
                    No packages are available right now. Please check again soon or contact us on WhatsApp.
                </div>
            )}
        </div>
      </div>

      {/* Services Section */}
      <div id="services" className="bg-white py-16 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">Travel Support Services</h2>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              Start your request online and continue with our team on WhatsApp for guidance, quotations, document steps, and next actions.
            </p>
          </div>
          {servicesError && (
            <div className="text-center text-red-500 mb-8">{servicesError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {loadingServices ? (
              [1, 2].map((i) => (
                <div key={i} className="p-8 rounded-2xl bg-gray-50 border border-gray-100 text-center animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 w-3/4 bg-gray-200 mx-auto mb-3 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 mx-auto mb-2 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 mx-auto rounded"></div>
                </div>
              ))
            ) : services.length > 0 ? (
              services.map((service, index) => (
                <div 
                  key={service._id || service.id} 
                  className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow text-center animate-fadeInUp"
                  style={{ opacity: 0, animationDelay: `${index * 0.2}s` }}
                >
                  <div className="text-4xl mb-4">{index % 2 === 0 ? '✈️' : '🌴'}</div>
                  <h3 className="text-xl font-bold text-[#0B1C3E] mb-3">{service.title}</h3>
                  <p className="text-gray-600 mb-4">
                    {getServiceDescription(service)}
                  </p>
                  <p className="text-xs uppercase tracking-[2px] text-gray-500 font-bold mb-6">
                    Human support for important travel steps
                  </p>
                  {isConsultationService(service) ? (
                    <Link
                      to="/book-consultation"
                      className="inline-block bg-[#0B1C3E] text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[#1a2f55] transition-colors"
                    >
                      {getServiceCtaLabel(service)}
                    </Link>
                  ) : (
                    <button
                      onClick={() => openServiceInquiryModal(service)}
                      className="bg-[#0B1C3E] text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[#1a2f55] transition-colors"
                    >
                      {getServiceCtaLabel(service)}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500">No services are available right now. Please check again soon or contact us on WhatsApp.</div>
            )}
          </div>
        </div>
      </div>

      {/* Private Consultation CTA */}
      <div id="consultation" className="bg-[#006837] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Need Personalized Travel Guidance?</h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Request a private consultation for personalized travel guidance, planning support, and help understanding your next steps.
          </p>
          <Link to="/book-consultation" className="inline-block bg-white text-[#006837] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#0B1C3E] transition-colors shadow-lg">
            Request Private Consultation
          </Link>
        </div>
      </div>

      {/* Package List */}
      <div className="py-10">
        <PackageList />
      </div>

      {/* Memories & Testimonials Gallery */}
      <MemoriesGallery />

      {/* Global Support Form */}
      <GlobalSupport />

      {/* Booking Modal */}
      {bookingModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeBookingModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={closeBookingModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 bg-gray-100 rounded-full p-1"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeServiceInquiryModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeServiceInquiryModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 bg-gray-100 rounded-full p-1"
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
