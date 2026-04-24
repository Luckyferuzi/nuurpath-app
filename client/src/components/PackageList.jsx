import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config';
import PackageComparison from './PackageComparison';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';

const PackageCard = ({ pkg, wishlist, toggleWishlist, compareList, toggleCompare }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Helper to construct the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://placehold.co/600x400?text=No+Image';
    if (imagePath.startsWith('http')) return imagePath;
    
    // Remove '/api' from base URL to get the root server URL
    const baseUrl = CONFIG.API_BASE_URL.replace('/api', '');
    return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-lg overflow-hidden bg-white relative group flex flex-col h-full">
      {/* 1. Show Package Image */}
      <div className="h-48 overflow-hidden relative">
        <img 
          src={pkg.images && pkg.images.length > 0 ? getImageUrl(pkg.images[0]) : 'https://placehold.co/600x400?text=No+Image'} 
          alt={pkg.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {pkg.isFeatured && (
          <span className="absolute top-2 left-2 bg-[#D4AF37] text-white text-xs px-2 py-1 rounded-full z-10">
            Featured
          </span>
        )}
        <button 
          onClick={() => toggleWishlist(pkg._id || pkg.id)}
          className="absolute top-2 right-2 z-10 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white transition-all"
          title={wishlist.has(pkg._id || pkg.id) ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <span className={`text-xl ${wishlist.has(pkg._id || pkg.id) ? 'text-red-500' : 'text-gray-400'}`}>
            {wishlist.has(pkg._id || pkg.id) ? '♥' : '♡'}
          </span>
        </button>
      </div>

      <div className="p-6 flex flex-col grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</h3>
          <span className="text-[#006837] font-bold text-lg">
            {typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}
          </span>
        </div>

        <div className="text-sm text-gray-500 mb-3 flex items-center gap-3">
          {pkg.destination && <span>📍 {pkg.destination}</span>}
          {pkg.duration && <span>⏱️ {pkg.duration}</span>}
        </div>
        
        {/* 2. Show Less and More Detail Option */}
        <div className="text-gray-600 text-sm mb-4 grow">
          {showFullDescription ? (
            <p>{pkg.description}</p>
          ) : (
            <p>
              {pkg.description && pkg.description.length > 100 
                ? `${pkg.description.substring(0, 100)}...` 
                : pkg.description}
            </p>
          )}
          
          {pkg.description && pkg.description.length > 100 && (
            <button 
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-[#006837] font-semibold mt-1 hover:underline focus:outline-none"
            >
              {showFullDescription ? 'Show Less' : 'Show More Details'}
            </button>
          )}
        </div>
        
        <div className="mt-auto space-y-2">
          <Link to={`/packages/${pkg._id || pkg.id}`} className="block w-full text-center bg-[#0B1C3E] text-white py-2 rounded-lg hover:bg-[#1a2f55] transition-colors">
            View Details
          </Link>
          <button 
            onClick={() => toggleCompare(pkg)}
            className={`w-full py-2 rounded-lg text-sm font-bold border transition-colors ${
              compareList.find(p => (p._id || p.id) === (pkg._id || pkg.id))
                ? 'bg-gray-100 text-gray-600 border-gray-300'
                : 'bg-white text-[#0B1C3E] border-[#0B1C3E] hover:bg-gray-50'
            }`}
          >
            {compareList.find(p => (p._id || p.id) === (pkg._id || pkg.id)) ? 'Remove from Compare' : '+ Add to Compare'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PackageList = () => {
  const { isAuthenticated } = useAuth();
  const [displayPackages, setDisplayPackages] = useState([]);
  const [totalPackages, setTotalPackages] = useState(0);
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [destinationFilter, setDestinationFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Comparison
  const [compareList, setCompareList] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        // Fetch packages with server-side pagination and filtering
        const params = new URLSearchParams({
          page: currentPage,
          limit: itemsPerPage
        });
        
        if (destinationFilter) params.append('search', destinationFilter);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);

        const response = await axios.get(`${CONFIG.API_BASE_URL}/packages`, { params });
        const data = response.data;
        
        if (data.packages) {
          setDisplayPackages(data.packages);
          setTotalPages(data.totalPages);
          setTotalPackages(data.totalPackages);
        } else {
          setDisplayPackages([]);
        }

        // Fetch wishlist if logged in
        if (isAuthenticated) {
          try {
            const wishlistRes = await axios.get(`${CONFIG.API_BASE_URL}/wishlist`);
            if (wishlistRes.data) {
              setWishlist(new Set(wishlistRes.data.map(item => item.packageId)));
            }
          } catch (wishlistErr) {
            console.error("Failed to fetch wishlist:", wishlistErr);
            // Don't block the main UI if wishlist fails
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [isAuthenticated, currentPage, destinationFilter, minPrice, maxPrice]);

  const toggleWishlist = async (pkgId) => {
    if (!isAuthenticated) {
      setError('Please login to save favorites.'); // User-facing error
      return;
    }
    try {
      await axios.post(`${CONFIG.API_BASE_URL}/wishlist/${pkgId}`);
      setWishlist(prev => {
        const newSet = new Set(prev); // Optimistic update
        if (newSet.has(pkgId)) newSet.delete(pkgId);
        else newSet.add(pkgId);
        return newSet;
      });
    } catch (err) {
      console.error('Wishlist error:', err);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [destinationFilter, minPrice, maxPrice]);

  const toggleCompare = (pkg) => {
    setCompareList(prev => {
      const exists = prev.find(p => (p._id || p.id) === (pkg._id || pkg.id));
      if (exists) {
        return prev.filter(p => (p._id || p.id) !== (pkg._id || pkg.id));
      } else {
        if (prev.length >= 3) {
          setError("You can compare up to 3 packages at a time."); // User-facing error
          return prev;
        }
        return [...prev, pkg];
      }
    });
  };

  if (loading) return <div className="text-center p-10">Loading packages...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-center mb-8 text-[#0B1C3E]">Our Travel Packages</h2>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/3">
          <input type="text" placeholder="Search destination..." value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0B1C3E]" />
        </div>
        <div className="flex gap-2 w-full md:w-1/3">
          <input type="number" placeholder="Min Price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0B1C3E]" />
          <input type="number" placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0B1C3E]" />
        </div>
        <div className="text-sm text-gray-500">Showing {displayPackages.length} of {totalPackages} packages</div>
      </div>

      {/* Comparison Table */}
      {compareList.length > 0 && (
        <PackageComparison packages={compareList} onRemove={(id) => setCompareList(prev => prev.filter(p => (p._id || p.id) !== id))} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayPackages.length > 0 ? displayPackages.map((pkg) => (
          <PackageCard 
            key={pkg._id || pkg.id} 
            pkg={pkg} 
            wishlist={wishlist} 
            toggleWishlist={toggleWishlist} 
            compareList={compareList} 
            toggleCompare={toggleCompare} 
          />
        )) : <div className="col-span-full text-center text-gray-500">No packages found.</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-10 space-x-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-[#0B1C3E] font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-[#0B1C3E] text-white rounded-lg disabled:opacity-50 hover:bg-[#1a2f55] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PackageList;