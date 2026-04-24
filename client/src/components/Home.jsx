//Users/issatende/Projects/nuurpath-travels/client/src/components/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CONFIG } from '../config';
import PackageList from './PackageList';
import GlobalSupport from './GlobalSupport';
import BookingForm from './BookingForm';
import MemoriesGallery from './MemoriesGallery';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null); // Added error state for general errors
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);

  useEffect(() => {
    const getImageUrl = (imagePath) => {
      if (!imagePath) return "https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels";
      if (imagePath.startsWith('http')) return imagePath;
      const baseUrl = CONFIG.API_BASE_URL.replace('/api', '');
      return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    };

    const fetchTrips = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/packages`);
        const data = Array.isArray(response.data) ? response.data : (response.data.packages || []);
        
        const trips = data.slice(0, 5).map(pkg => ({
          id: pkg._id || pkg.id,
          title: pkg.title,
          image: (pkg.images && pkg.images.length > 0) ? getImageUrl(pkg.images[0]) : "https://placehold.co/1200x600/0B1C3E/D4AF37?text=NuurPath+Travels",
          link: `/packages/${pkg._id || pkg.id}`
        }));
        setUpcomingTrips(trips);
      } catch (error) {
        setError('Failed to fetch upcoming trips.');
        console.error("Failed to fetch upcoming trips", error);
      } finally {
        setLoadingTrips(false);
      }
    };

    const fetchServices = async () => {
      try {
        const response = await axios.get(`${CONFIG.API_BASE_URL}/services`);
        setServices(response.data);
      } catch (error) {
        setError('Failed to fetch services.');
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

  const scrollToConsultation = (e) => {
    e.preventDefault();
    const element = document.getElementById('consultation');
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
      {/* Hero Section with Mission */}
      <div className="bg-[#0B1C3E] text-white py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] bg-fixed"></div>
        <div className="container mx-auto relative z-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            Explore the World, <br/>
            <span className="text-[#D4AF37]">Stay True to Your Faith</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 font-medium">
            Our mission is to provide exceptional travel experiences that honor your values. 
            From spiritual journeys to leisure vacations, we ensure every step of your path is enlightened.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/packages" className="bg-[#D4AF37] text-[#0B1C3E] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white transition-colors">
              View Packages
            </Link>
            <a href="#consultation" onClick={scrollToConsultation} className="border-2 border-[#D4AF37] text-[#D4AF37] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#0B1C3E] transition-colors cursor-pointer">
              Book Consultation
            </a>
          </div>
        </div>
      </div>

      {/* Upcoming Trips Promotion Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">Upcoming Trips</h2>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
        </div>
        
        {error && ( // Display general error for this section
            <div className="text-center text-red-500 mb-8">{error}</div>
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
                                        View Details
                                    </Link>
                                    <button 
                                        onClick={() => handleBookNow(trip.id)}
                                        className="border-2 border-white text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-white hover:text-[#0B1C3E] transition-colors"
                                    >
                                        Book Now
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
                    No upcoming trips found.
                </div>
            )}
        </div>
      </div>

      {/* Services Section */}
      <div className="bg-white py-16 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black uppercase tracking-widest text-[#0B1C3E] mb-2">Our Services</h2>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
          </div>
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
                  <p className="text-gray-600">
                    {service.description}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500">No services found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Private Consultation CTA */}
      <div id="consultation" className="bg-[#006837] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Plan Your Perfect Journey</h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Need personalized advice? Book a private consultation with our travel experts to discuss your specific needs and preferences.
          </p>
          <Link to="/book-consultation" className="inline-block bg-white text-[#006837] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#0B1C3E] transition-colors shadow-lg">
            Book a Private Call
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
    </div>
  );
};

export default Home;
