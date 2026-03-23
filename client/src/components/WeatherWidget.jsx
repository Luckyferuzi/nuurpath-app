import React, { useState, useEffect } from 'react';

const WeatherWidget = ({ destination }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!destination) {
        setLoading(false);
        return;
    }

    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Get Coordinates
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Location not found');
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Get Weather
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherResponse.json();
        
        setWeather({
            location: { name, country },
            current: weatherData.current_weather
        });
      } catch (err) {
        // console.error("Weather fetch error:", err);
        setError("Weather unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination]);

  if (loading) return <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-500 text-sm">Loading weather...</div>;
  if (error || !weather) return null;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-[#0B1C3E] mb-2">Weather in {weather.location.name}</h3>
      <div className="flex items-center gap-4">
        <span className="text-4xl font-bold text-[#D4AF37]">{Math.round(weather.current.temperature)}°C</span>
        <div className="text-sm text-gray-600">
            <p>Wind: {weather.current.windspeed} km/h</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;