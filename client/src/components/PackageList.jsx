import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import axios, { resolveBackendUrl } from '../lib/api';
import {
  formatPackagePrice,
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

const PackageCard = ({ pkg, wishlist, toggleWishlist }) => {
  const packageId = pkg._id || pkg.id;
  const isSaved = wishlist.has(packageId);
  const highlights = getPackageHighlights(pkg).slice(0, 2);
  const summary = getPackageShortDescription(pkg.description, 118);
  const journeyLabel = getPackageJourneyLabel(pkg);
  const supportLine = getPackageSupportLine(pkg);
  const typeLabel = getPackageTypeLabel(pkg.type);
  const priceLabel = formatPackagePrice(pkg?.price);

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return 'https://placehold.co/600x400?text=No+Image';
    }

    return resolveBackendUrl(imagePath);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-[#e5dece] bg-white shadow-[0_14px_34px_rgba(16,28,45,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(16,28,45,0.08)]">
      <Link to={`/packages/${packageId}`} className="relative block border-b border-[#efe7da]">
        <div className="relative flex h-48 items-center justify-center bg-[#f5f1e8] p-4">
          {pkg.isFeatured ? (
            <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#0B1C3E] shadow-sm">
              Featured
            </span>
          ) : null}
          <button
            onClick={(event) => {
              event.preventDefault();
              toggleWishlist(packageId);
            }}
            className="absolute right-4 top-4 rounded-full border border-[#e4dbc9] bg-white p-2 shadow-sm transition-colors hover:bg-[#faf8f3]"
            title={isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}
            type="button"
          >
            <span className={`text-xl ${isSaved ? 'text-red-500' : 'text-gray-400'}`}>
              {isSaved ? ICONS.wishlistFilled : ICONS.wishlistEmpty}
            </span>
          </button>
          <img
            src={pkg.images && pkg.images.length > 0 ? getImageUrl(pkg.images[0]) : 'https://placehold.co/600x400?text=No+Image'}
            alt={pkg.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        </div>
      </Link>

      <div className="flex grow flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
              {typeLabel}
            </p>
            <h3 className="mt-3 text-xl font-black tracking-tight text-[#101c2d] sm:text-[1.6rem]">
              <Link to={`/packages/${packageId}`} className="transition-colors hover:text-[#0B1C3E]">
                {pkg.title}
              </Link>
            </h3>
          </div>
        </div>

        <p className="mt-3 text-sm font-semibold text-[#2d5f50]">
          {journeyLabel}
        </p>
        <p className="mt-3 text-sm leading-7 text-[#5f6774]">
          {summary}
        </p>

        {highlights.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.map((item) => (
              <span key={item} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#ede6d8] pt-4">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">Starting from</span>
            <span className="mt-1 block text-2xl font-black text-[#006837]">
              {priceLabel}
            </span>
          </div>
          <p className="max-w-[180px] text-right text-xs leading-6 text-[#6a7280]">
            {supportLine}
          </p>
        </div>

        <div className="mt-5">
          <Link
            to={`/packages/${packageId}`}
            className="block rounded-full bg-[#0B1C3E] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#1a2f55]"
          >
            View Package
          </Link>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const hasActiveFilters = Boolean(destinationFilter || minPrice || maxPrice);
  const activeFilterLabels = [
    destinationFilter ? `Search: ${destinationFilter}` : null,
    minPrice ? `Min price: ${minPrice}` : null,
    maxPrice ? `Max price: ${maxPrice}` : null,
  ].filter(Boolean);

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

  const clearFilters = () => {
    setDestinationFilter('');
    setMinPrice('');
    setMaxPrice('');
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
        description="Browse calm, well-organized package options and open the journey that fits your travel plan."
      />

      {packagesError && packages.length > 0 && (
        <div className="mb-6 mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Live updates are temporarily delayed, but the current package list is still available.
        </div>
      )}

      <section className="mt-8 rounded-[1.5rem] border border-[#e4dbc9] bg-white p-5 shadow-[0_14px_34px_rgba(16,28,45,0.04)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7240]">
              Browse With Ease
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-[#101c2d]">
              {totalPackages} package options
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#5f6774]">
              Open the filters only when you want to narrow the list by route or budget.
            </p>
          </div>
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-[#d8cfbf] bg-[#faf8f3] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-white"
            type="button"
          >
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {filtersOpen ? (
          <div className="mt-6 grid gap-4 border-t border-[#ede6d8] pt-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">
                Search by package or destination
              </span>
              <input
                type="text"
                placeholder="Example: Umrah or Dubai"
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="w-full rounded-[1rem] border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] focus:border-[#0B1C3E] focus:bg-white focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">
                Minimum price
              </span>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full rounded-[1rem] border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] focus:border-[#0B1C3E] focus:bg-white focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a7240]">
                Maximum price
              </span>
              <input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full rounded-[1rem] border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] focus:border-[#0B1C3E] focus:bg-white focus:outline-none"
              />
            </label>
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition-colors hover:bg-[#faf8f3] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              Clear
            </button>
          </div>
        ) : null}

        {!filtersOpen && hasActiveFilters ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#ede6d8] pt-5">
            {activeFilterLabels.map((label) => (
              <span key={label} className="rounded-full border border-[#e5dece] bg-[#faf8f3] px-3 py-1.5 text-xs font-semibold text-[#4d5562]">
                {label}
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs font-black uppercase tracking-[0.14em] text-[#0B1C3E] transition-colors hover:text-[#1a2f55]"
              type="button"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visiblePackages.length > 0 ? (
          visiblePackages.map((pkg) => (
            <PackageCard
              key={pkg._id || pkg.id}
              pkg={pkg}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            {hasActiveFilters
              ? 'No packages match the current filters. Try a different route or price range.'
              : 'Packages are being prepared right now. Please check again soon.'}
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
