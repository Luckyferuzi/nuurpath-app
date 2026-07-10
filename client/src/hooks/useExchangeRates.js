import { useEffect, useState } from 'react';

const DEFAULT_EXCHANGE_RATES = Object.freeze({
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  SAR: 3.75,
  AED: 3.67,
});
const EXCHANGE_RATE_CACHE_KEY = 'nuurpath.exchange-rates.v1';
const EXCHANGE_RATE_TTL_MS = 12 * 60 * 60 * 1000;

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readCachedExchangeRates() {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object' || typeof parsedValue.rates !== 'object') {
      return null;
    }

    return {
      rates: { ...DEFAULT_EXCHANGE_RATES, ...parsedValue.rates },
      fetchedAt: Number.isFinite(parsedValue.fetchedAt) ? parsedValue.fetchedAt : null,
    };
  } catch (error) {
    console.warn('Unable to read cached exchange rates:', error);
    return null;
  }
}

function writeCachedExchangeRates(rates) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({
      rates,
      fetchedAt: Date.now(),
    }));
  } catch (error) {
    console.warn('Unable to persist exchange rates cache:', error);
  }
}

export function useExchangeRates() {
  const cachedRates = readCachedExchangeRates();
  const [rates, setRates] = useState(cachedRates?.rates || DEFAULT_EXCHANGE_RATES);

  useEffect(() => {
    const isCacheFresh = cachedRates?.fetchedAt && (Date.now() - cachedRates.fetchedAt) < EXCHANGE_RATE_TTL_MS;

    if (isCacheFresh) {
      return undefined;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        if (!isActive || !data?.rates) {
          return;
        }

        const nextRates = { ...DEFAULT_EXCHANGE_RATES, ...data.rates };
        setRates(nextRates);
        writeCachedExchangeRates(nextRates);
      } catch (error) {
        console.log('Using default exchange rates');
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [cachedRates?.fetchedAt]);

  return rates;
}
