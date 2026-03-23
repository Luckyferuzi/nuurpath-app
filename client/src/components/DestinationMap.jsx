import React from 'react';

const DestinationMap = ({ destination }) => {
  if (!destination) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-100">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-[#0B1C3E] uppercase tracking-wider">
          Trip Destination
        </h3>
        <span className="text-xs font-medium text-gray-500">{destination}</span>
      </div>
      <div className="h-64 w-full bg-gray-100">
        <iframe
          title={`Map of ${destination}`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={`https://www.google.com/maps?q=${encodeURIComponent(destination)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          className="w-full h-full"
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
};

export default DestinationMap;