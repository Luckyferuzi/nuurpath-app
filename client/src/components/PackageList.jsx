import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PackageComparison from './PackageComparison';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import axios, { resolveBackendUrl } from '../lib/api';

const ICONS = {
  wishlistFilled: '\u2665',
  wishlistEmpty: '\u2661',
  destination: '\u{1F4CD}',
  duration: '\u23F1\uFE0F',
};

const PackageCard = ({ pkg, wishlist, toggleWishlist, compareList, toggleCompare }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const packageId = pkg._id || pkg.id;
  const isSaved = wishlist.has(packageId);
  const isInCompare = compareList.some((item) => (item._id || item.id) === packageId);

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/600x400?text=No+Image';
    }

    return resolveBackendUrl(imagePath);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="relative h-48 overflow-hidden">
        <img
          src={pkg.images && pkg.images.length > 0 ? getImageUrl(pkg.images[0]) : 'https://placehold.co/600x400?text=No+Image'}
          alt={pkg.title}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        {pkg.isFeatured && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-[#D4AF37] px-2 py-1 text-xs text-white">
            Featured
          </span>
        )}
        <button
          onClick={() => toggleWishlist(packageId)}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-2 shadow-sm transition-all hover:bg-white"
          title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
          type="button"
        >
          <span className={`text-xl ${isSaved ? 'text-red-500' : 'text-gray-400'}`}>
            {isSaved ? ICONS.wishlistFilled : ICONS.wishlistEmpty}
          </span>
        </button>
      </div>

      <div className="flex grow flex-col p-6">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</h3>
          <div className="text-right">
            <span className="block text-xs font-bold uppercase tracking-[2px] text-gray-500">Starting from</span>
            <span className="text-lg font-bold text-[#006837]">
              {typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}
            </span>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-3 text-sm text-gray-500">
          {pkg.destination && <span>{ICONS.destination} {pkg.destination}</span>}
          {pkg.duration && <span>{ICONS.duration} {pkg.duration}</span>}
        </div>

        <div className="mb-4 grow text-sm text-gray-600">
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
              onClick={() => setShowFullDescription((current) => !current)}
              className="mt-1 font-semibold text-[#006837] hover:underline focus:outline-none"
              type="button"
            >
              {showFullDescription ? 'Show Less' : 'Show More Details'}
            </button>
          )}
        </div>

        <p className="mb-4 text-xs text-gray-500">
          Availability, requirements, and next steps are confirmed by our team after you submit your request.
        </p>

        <div className="mt-auto space-y-2">
          <Link
            to={`/packages/${packageId}`}
            className="block w-full rounded-lg bg-[#0B1C3E] py-2 text-center text-white transition-colors hover:bg-[#1a2f55]"
          >
            Ask About This Package
          </Link>
          <button
            onClick={() => toggleCompare(pkg)}
            className={`w-full rounded-lg border py-2 text-sm font-bold transition-colors ${
              isInCompare
                ? 'border-gray-300 bg-gray-100 text-gray-600'
                : 'border-[#0B1C3E] bg-white text-[#0B1C3E] hover:bg-gray-50'
            }`}
            type="button"
          >
            {isInCompare ? 'Remove from Compare' : '+ Add to Compare'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PackageList = () => {
  const { isAuthenticated } = useAuth();
  const {
    packages,
    packagesLoading,
    packagesError,
  } = usePublicContent();
  const [wishlist, setWishlist] = useState(new Set());
  const [error, setError] = useState(null);
  const [destinationFilter, setDestinationFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [compareList, setCompareList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlist(new Set());
      return undefined;
    }

    let isActive = true;
    const fetchWishlist = async () => {
      try {
        const wishlistRes = await axios.get('/wishlist');
        if (!isActive || !wishlistRes.data) {
          return;
        }

        setWishlist(new Set(wishlistRes.data.map((item) => item.packageId)));
      } catch (wishlistErr) {
        console.error('Failed to fetch wishlist:', wishlistErr);
      }
    };

    fetchWishlist();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = destinationFilter.trim().toLowerCase();
    const parsedMinPrice = minPrice === '' ? null : Number(minPrice);
    const parsedMaxPrice = maxPrice === '' ? null : Number(maxPrice);

    return packages.filter((pkg) => {
      const packageTitle = String(pkg?.title || '').toLowerCase();
      const packageDestination = String(pkg?.destination || '').toLowerCase();
      const matchesSearch = !normalizedSearch
        || packageTitle.includes(normalizedSearch)
        || packageDestination.includes(normalizedSearch);
      const numericPrice = typeof pkg?.price === 'number' ? pkg.price : Number(pkg?.price);
      const hasNumericPrice = Number.isFinite(numericPrice);
      const matchesMinPrice = parsedMinPrice === null || (hasNumericPrice && numericPrice >= parsedMinPrice);
      const matchesMaxPrice = parsedMaxPrice === null || (hasNumericPrice && numericPrice <= parsedMaxPrice);

      return matchesSearch && matchesMinPrice && matchesMaxPrice;
    });
  }, [packages, destinationFilter, minPrice, maxPrice]);

  const totalPackages = filteredPackages.length;
  const totalPages = Math.max(1, Math.ceil(totalPackages / itemsPerPage));
  const visiblePackages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPackages.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredPackages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [destinationFilter, minPrice, maxPrice]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleWishlist = async (pkgId) => {
    if (!isAuthenticated) {
      setError('Create an account to save favorites and track future requests.');
      return;
    }

    try {
      await axios.post(`/wishlist/${pkgId}`);
      setWishlist((prev) => {
        const next = new Set(prev);
        if (next.has(pkgId)) {
          next.delete(pkgId);
        } else {
          next.add(pkgId);
        }
        return next;
      });
    } catch (wishlistErr) {
      console.error('Wishlist error:', wishlistErr);
      setError('Unable to update your saved packages right now. Please try again.');
    }
  };

  const toggleCompare = (pkg) => {
    setCompareList((prev) => {
      const packageId = pkg._id || pkg.id;
      const exists = prev.find((item) => (item._id || item.id) === packageId);

      if (exists) {
        return prev.filter((item) => (item._id || item.id) !== packageId);
      }

      if (prev.length >= 3) {
        setError('You can compare up to 3 packages at a time.');
        return prev;
      }

      return [...prev, pkg];
    });
  };

  const blockingError = error || (packages.length === 0 ? packagesError : null);

  if (packagesLoading && packages.length === 0) {
    return <div className="p-10 text-center">Loading packages and request options...</div>;
  }

  if (blockingError) {
    return <div className="p-10 text-center text-red-500">{blockingError}</div>;
  }

  return (
    <PublicPageShell background="soft" contentClassName="py-10 sm:py-12 lg:py-16">
      <PublicPageHeader
        eyebrow="Curated Journeys"
        title="Explore travel packages"
        description="Browse package options, compare routes, and send your request online when you are ready."
        actions={<Link to="/contact" className="rounded-full bg-[#0B1C3E] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1a2f55]">Talk To NuurPath</Link>}
      />

      {packagesError && packages.length > 0 && (
        <div className="mb-6 mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live updates are temporarily delayed, but the current package list is still available.
        </div>
      )}

      <div className="mb-8 mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.4rem] border border-[#e4dbc9] bg-white p-4 shadow-sm md:flex-row">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search package or destination..."
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-[#0B1C3E] focus:outline-none"
          />
        </div>
        <div className="flex w-full gap-2 md:w-1/3">
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-300 p-2 focus:border-[#0B1C3E] focus:outline-none"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-300 p-2 focus:border-[#0B1C3E] focus:outline-none"
          />
        </div>
        <div className="text-sm text-gray-500">
          Showing {visiblePackages.length} of {totalPackages} package options
        </div>
      </div>

      {compareList.length > 0 && (
        <PackageComparison
          packages={compareList}
          onRemove={(id) => setCompareList((prev) => prev.filter((pkg) => (pkg._id || pkg.id) !== id))}
        />
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {visiblePackages.length > 0 ? (
          visiblePackages.map((pkg) => (
            <PackageCard
              key={pkg._id || pkg.id}
              pkg={pkg}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              compareList={compareList}
              toggleCompare={toggleCompare}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No packages match this search right now. Try a different destination or price range.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-10 flex justify-center space-x-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
            type="button"
          >
            Previous
          </button>
          <span className="px-4 py-2 font-bold text-[#0B1C3E]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-lg bg-[#0B1C3E] px-4 py-2 text-white transition-colors hover:bg-[#1a2f55] disabled:opacity-50"
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </PublicPageShell>
  );
};

export default PackageList;
