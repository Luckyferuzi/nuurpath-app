import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PackageComparison from './PackageComparison';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import axios, { resolveBackendUrl } from '../lib/api';
import {
  getPackageHighlights,
  getPackageJourneyLabel,
  getPackageShortDescription,
  getPackageSupportLine,
  getPackageTypeLabel,
} from '../lib/packagePresentation.js';

const ICONS = {
  wishlistFilled: '\u2665',
  wishlistEmpty: '\u2661',
};

const PackageCard = ({ pkg, wishlist, toggleWishlist, compareList, toggleCompare }) => {
  const packageId = pkg._id || pkg.id;
  const isSaved = wishlist.has(packageId);
  const isInCompare = compareList.some((item) => (item._id || item.id) === packageId);
  const highlights = getPackageHighlights(pkg);
  const summary = getPackageShortDescription(pkg.description, 138);
  const journeyLabel = getPackageJourneyLabel(pkg);
  const supportLine = getPackageSupportLine(pkg);
  const typeLabel = getPackageTypeLabel(pkg.type);

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/600x400?text=No+Image';
    }

    return resolveBackendUrl(imagePath);
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#e5dece] bg-white shadow-[0_14px_34px_rgba(16,28,45,0.05)] transition-shadow hover:shadow-[0_18px_48px_rgba(16,28,45,0.09)]">
      <Link to={`/packages/${packageId}`} className="relative block h-56 overflow-hidden">
        <img
          src={pkg.images && pkg.images.length > 0 ? getImageUrl(pkg.images[0]) : 'https://placehold.co/600x400?text=No+Image'}
          alt={pkg.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"></div>
        {pkg.isFeatured ? (
          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0B1C3E]">
            Featured
          </span>
        ) : null}
        <button
          onClick={(event) => {
            event.preventDefault();
            toggleWishlist(packageId);
          }}
          className="absolute right-4 top-4 rounded-full bg-white/92 p-2 shadow-sm transition-colors hover:bg-white"
          title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
          type="button"
        >
          <span className={`text-xl ${isSaved ? 'text-red-500' : 'text-gray-400'}`}>
            {isSaved ? ICONS.wishlistFilled : ICONS.wishlistEmpty}
          </span>
        </button>
      </Link>

      <div className="flex grow flex-col p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
          {typeLabel}
        </p>
        <h3 className="mt-3 text-2xl font-black tracking-tight text-[#101c2d]">
          <Link to={`/packages/${packageId}`} className="transition-colors hover:text-[#0B1C3E]">
            {pkg.title}
          </Link>
        </h3>
        <p className="mt-3 text-sm font-semibold text-[#2d5f50]">
          {journeyLabel}
        </p>
        <p className="mt-3 text-sm leading-7 text-[#5f6774]">
          {summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span key={item} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#ede6d8] pt-5">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Starting from</span>
            <span className="mt-1 block text-2xl font-black text-[#006837]">
              {typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}
            </span>
          </div>
          <p className="max-w-[190px] text-right text-xs leading-6 text-[#6a7280]">
            {supportLine}
          </p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Link
            to={`/packages/${packageId}`}
            className="flex-1 rounded-full bg-[#0B1C3E] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1a2f55]"
          >
            View Package
          </Link>
          <button
            onClick={() => toggleCompare(pkg)}
            className={`rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition-colors ${
              isInCompare
                ? 'bg-[#efeae0] text-[#4d5562]'
                : 'border border-[#d8cfbf] bg-white text-[#101c2d] hover:bg-[#faf8f3]'
            }`}
            type="button"
          >
            {isInCompare ? 'Compared' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
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
            placeholder="Search by package or destination"
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 focus:border-[#0B1C3E] focus:outline-none"
          />
        </div>
        <div className="flex w-full gap-2 md:w-1/3">
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-1/2 rounded-xl border border-gray-300 p-3 focus:border-[#0B1C3E] focus:outline-none"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-1/2 rounded-xl border border-gray-300 p-3 focus:border-[#0B1C3E] focus:outline-none"
          />
        </div>
        <div className="text-sm text-gray-500">
          {totalPackages} package options
        </div>
      </div>

      {compareList.length > 0 && (
        <PackageComparison
          packages={compareList}
          onRemove={(id) => setCompareList((prev) => prev.filter((pkg) => (pkg._id || pkg.id) !== id))}
        />
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
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
