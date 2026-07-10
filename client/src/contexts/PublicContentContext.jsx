import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from '../lib/api';

const PUBLIC_CONTENT_CACHE_KEY = 'nuurpath.public-content.v1';
const REFRESH_INTERVAL_MS = 45000;

const PublicContentContext = createContext(null);

function sortFeaturedPackages(packages) {
  return [...packages]
    .filter((pkg) => pkg?.isFeatured)
    .sort((firstPackage, secondPackage) => {
      const firstOrder = Number.isFinite(firstPackage?.featuredOrder) ? firstPackage.featuredOrder : Number.MAX_SAFE_INTEGER;
      const secondOrder = Number.isFinite(secondPackage?.featuredOrder) ? secondPackage.featuredOrder : Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      if ((firstPackage?.displayOrder || 0) !== (secondPackage?.displayOrder || 0)) {
        return (firstPackage?.displayOrder || 0) - (secondPackage?.displayOrder || 0);
      }

      return (firstPackage?.id || 0) - (secondPackage?.id || 0);
    });
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readPublicContentCache() {
  if (!canUseSessionStorage()) {
    return {
      packages: [],
      services: [],
      hasPackagesCache: false,
      hasServicesCache: false,
      lastPackagesSyncAt: null,
      lastServicesSyncAt: null,
    };
  }

  try {
    const rawValue = window.sessionStorage.getItem(PUBLIC_CONTENT_CACHE_KEY);

    if (!rawValue) {
      return {
        packages: [],
        services: [],
        hasPackagesCache: false,
        hasServicesCache: false,
        lastPackagesSyncAt: null,
        lastServicesSyncAt: null,
      };
    }

    const parsedValue = JSON.parse(rawValue);
    const packages = Array.isArray(parsedValue?.packages) ? parsedValue.packages : [];
    const services = Array.isArray(parsedValue?.services) ? parsedValue.services : [];

    return {
      packages,
      services,
      hasPackagesCache: Array.isArray(parsedValue?.packages),
      hasServicesCache: Array.isArray(parsedValue?.services),
      lastPackagesSyncAt: Number.isFinite(parsedValue?.lastPackagesSyncAt) ? parsedValue.lastPackagesSyncAt : null,
      lastServicesSyncAt: Number.isFinite(parsedValue?.lastServicesSyncAt) ? parsedValue.lastServicesSyncAt : null,
    };
  } catch (error) {
    console.warn('Unable to read public content cache:', error);

    return {
      packages: [],
      services: [],
      hasPackagesCache: false,
      hasServicesCache: false,
      lastPackagesSyncAt: null,
      lastServicesSyncAt: null,
    };
  }
}

function writePublicContentCache(payload) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(PUBLIC_CONTENT_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to persist public content cache:', error);
  }
}

function normalizePackagesResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.packages)) {
    return data.packages;
  }

  return [];
}

function normalizeServicesResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.services)) {
    return data.services;
  }

  return [];
}

export const PublicContentProvider = ({ children, enabled = true }) => {
  const initialCacheRef = useRef(readPublicContentCache());
  const [packages, setPackages] = useState(initialCacheRef.current.packages);
  const [services, setServices] = useState(initialCacheRef.current.services);
  const [hasPackagesCache, setHasPackagesCache] = useState(initialCacheRef.current.hasPackagesCache);
  const [hasServicesCache, setHasServicesCache] = useState(initialCacheRef.current.hasServicesCache);
  const [packagesLoading, setPackagesLoading] = useState(!initialCacheRef.current.hasPackagesCache);
  const [servicesLoading, setServicesLoading] = useState(!initialCacheRef.current.hasServicesCache);
  const [packagesRefreshing, setPackagesRefreshing] = useState(false);
  const [servicesRefreshing, setServicesRefreshing] = useState(false);
  const [packagesError, setPackagesError] = useState(null);
  const [servicesError, setServicesError] = useState(null);
  const [lastPackagesSyncAt, setLastPackagesSyncAt] = useState(initialCacheRef.current.lastPackagesSyncAt);
  const [lastServicesSyncAt, setLastServicesSyncAt] = useState(initialCacheRef.current.lastServicesSyncAt);
  const packagesRef = useRef(packages);
  const servicesRef = useRef(services);

  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    writePublicContentCache({
      packages,
      services,
      lastPackagesSyncAt,
      lastServicesSyncAt,
    });
  }, [packages, services, lastPackagesSyncAt, lastServicesSyncAt]);

  const refreshPackages = useCallback(async () => {
    const canRenderCachedPackages = hasPackagesCache;

    if (canRenderCachedPackages) {
      setPackagesRefreshing(true);
    } else {
      setPackagesLoading(true);
    }

    try {
      const response = await axios.get('/packages');
      const nextPackages = normalizePackagesResponse(response.data);
      setPackages(nextPackages);
      setHasPackagesCache(true);
      setPackagesError(null);
      setLastPackagesSyncAt(Date.now());
      return nextPackages;
    } catch (error) {
      console.error('Failed to refresh public packages:', error);
      setPackagesError('Package updates are temporarily delayed. Please try again shortly.');
      return packagesRef.current;
    } finally {
      setPackagesLoading(false);
      setPackagesRefreshing(false);
    }
  }, [hasPackagesCache]);

  const refreshServices = useCallback(async () => {
    const canRenderCachedServices = hasServicesCache;

    if (canRenderCachedServices) {
      setServicesRefreshing(true);
    } else {
      setServicesLoading(true);
    }

    try {
      const response = await axios.get('/services');
      const nextServices = normalizeServicesResponse(response.data);
      setServices(nextServices);
      setHasServicesCache(true);
      setServicesError(null);
      setLastServicesSyncAt(Date.now());
      return nextServices;
    } catch (error) {
      console.error('Failed to refresh public services:', error);
      setServicesError('Service updates are temporarily delayed. Please try again shortly.');
      return servicesRef.current;
    } finally {
      setServicesLoading(false);
      setServicesRefreshing(false);
    }
  }, [hasServicesCache]);

  const refreshAllPublicContent = useCallback(async () => {
    await Promise.allSettled([refreshPackages(), refreshServices()]);
  }, [refreshPackages, refreshServices]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    refreshAllPublicContent();

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      refreshAllPublicContent();
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshAllPublicContent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshAllPublicContent]);

  const featuredPackages = useMemo(
    () => sortFeaturedPackages(packages),
    [packages]
  );

  const value = useMemo(() => ({
    packages,
    featuredPackages,
    services,
    packagesLoading,
    servicesLoading,
    packagesRefreshing,
    servicesRefreshing,
    packagesError,
    servicesError,
    lastPackagesSyncAt,
    lastServicesSyncAt,
    refreshPackages,
    refreshServices,
    refreshAllPublicContent,
  }), [
    packages,
    featuredPackages,
    services,
    packagesLoading,
    servicesLoading,
    packagesRefreshing,
    servicesRefreshing,
    packagesError,
    servicesError,
    lastPackagesSyncAt,
    lastServicesSyncAt,
    refreshPackages,
    refreshServices,
    refreshAllPublicContent,
  ]);

  return (
    <PublicContentContext.Provider value={value}>
      {children}
    </PublicContentContext.Provider>
  );
};

export function usePublicContent() {
  const context = useContext(PublicContentContext);

  if (!context) {
    throw new Error('usePublicContent must be used within a PublicContentProvider.');
  }

  return context;
}
