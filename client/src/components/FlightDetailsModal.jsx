import React from 'react';

const FlightDetailsModal = ({ flight, onClose }) => {
  if (!flight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="bg-[#0B1C3E] p-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-xl">Flight Details</h3>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white text-2xl leading-none focus:outline-none"
          >
            &times;
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Route Info */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">From</p>
              <p className="font-bold text-2xl text-[#0B1C3E]">{flight.from}</p>
            </div>
            <div className="text-3xl text-gray-300">✈</div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">To</p>
              <p className="font-bold text-2xl text-[#0B1C3E]">{flight.to}</p>
            </div>
          </div>

          {/* Flight Specifics */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Departure</p>
              <p className="font-medium text-gray-800">{new Date(flight.departureDate).toLocaleDateString()}</p>
            </div>
            {flight.returnDate && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Return</p>
                <p className="font-medium text-gray-800">{new Date(flight.returnDate).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Passengers</p>
              <p className="font-medium text-gray-800">{flight.passengers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Class</p>
              <p className="font-medium text-gray-800">{flight.travelClass}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-sm font-bold text-[#0B1C3E] mb-3 border-b border-gray-200 pb-2">Contact Information</p>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500 w-16 inline-block">Name:</span> <span className="font-medium">{flight.contactName}</span></p>
              <p><span className="text-gray-500 w-16 inline-block">Email:</span> <span className="font-medium">{flight.contactEmail}</span></p>
              <p><span className="text-gray-500 w-16 inline-block">Phone:</span> <span className="font-medium">{flight.contactPhone}</span></p>
            </div>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-gray-500 font-medium">Booking Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                flight.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 
                flight.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
            }`}>
                {flight.status || 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetailsModal;