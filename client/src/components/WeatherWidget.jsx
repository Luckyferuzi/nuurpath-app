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

        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('Location not found');
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherResponse.json();

        setWeather({
          location: { name, country },
          current: weatherData.current_weather,
        });
      } catch (err) {
        setError('Weather unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
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
