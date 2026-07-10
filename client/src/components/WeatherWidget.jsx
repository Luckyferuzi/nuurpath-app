import React, { useEffect, useState } from 'react';

const WEATHER_CACHE_KEY = 'nuurpath.weather.v1';
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readWeatherCache() {
  if (!canUseSessionStorage()) {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(WEATHER_CACHE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch (error) {
    console.warn('Unable to read weather cache:', error);
    return {};
  }
}

function writeWeatherCache(cache) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Unable to persist weather cache:', error);
  }
}

function getWeatherCacheEntry(destination) {
  if (!destination) {
    return null;
  }

  const cache = readWeatherCache();
  const cacheKey = String(destination).trim().toLowerCase();
  const entry = cache[cacheKey];

  if (!entry || !entry.data) {
    return null;
  }

  return entry;
}

function setWeatherCacheEntry(destination, data) {
  const cache = readWeatherCache();
  const cacheKey = String(destination).trim().toLowerCase();
  cache[cacheKey] = {
    data,
    fetchedAt: Date.now(),
  };
  writeWeatherCache(cache);
}

const WeatherWidget = ({ destination }) => {
  const cachedEntry = getWeatherCacheEntry(destination);
  const [weather, setWeather] = useState(cachedEntry?.data || null);
  const [loading, setLoading] = useState(Boolean(destination) && !cachedEntry?.data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!destination) {
      setWeather(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const nextCachedEntry = getWeatherCacheEntry(destination);
    const cacheIsFresh = nextCachedEntry?.fetchedAt && (Date.now() - nextCachedEntry.fetchedAt) < WEATHER_CACHE_TTL_MS;

    if (nextCachedEntry?.data) {
      setWeather(nextCachedEntry.data);
      setLoading(false);
      setError(null);
    } else {
      setWeather(null);
      setLoading(true);
    }

    if (cacheIsFresh) {
      return undefined;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('Location not found');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherResponse.json();

        if (!isActive) {
          return;
        }

        const nextWeather = {
          location: { name, country },
          current: weatherData.current_weather,
        };
        setWeather(nextWeather);
        setError(null);
        setLoading(false);
        setWeatherCacheEntry(destination, nextWeather);
      } catch (fetchError) {
        if (!isActive) {
          return;
        }

        setError('Weather unavailable');
        setLoading(false);
      }
    }, nextCachedEntry?.data ? 1200 : 350);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [destination]);

  if (loading) {
    return <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center text-sm text-gray-500">Loading weather...</div>;
  }

  if (error || !weather) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-bold text-[#0B1C3E]">Weather in {weather.location.name}</h3>
      <div className="flex items-center gap-4">
        <span className="text-4xl font-bold text-[#D4AF37]">
          {Math.round(weather.current.temperature)}
          {'\u00B0'}C
        </span>
        <div className="text-sm text-gray-600">
          <p>Wind: {weather.current.windspeed} km/h</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;
