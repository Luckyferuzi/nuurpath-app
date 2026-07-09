import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/api';
import { buildFlightRequestWhatsAppUrl } from '../lib/whatsapp';
import { useAuth } from '../contexts/AuthContext.jsx';

const initialFormData = {
  from: '',
  to: '',
  departureDate: '',
  returnDate: '',
  passengers: 1,
  travelClass: 'Economy',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

function getInitialFormData(user) {
  return {
    ...initialFormData,
    contactName: user?.name || '',
    contactEmail: user?.email || '',
    contactPhone: user?.contactInfo || '',
  };
}

export default function FlightBookingForm() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => getInitialFormData(user));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contactName: user.name || prev.contactName,
      contactEmail: user.email || prev.contactEmail,
      contactPhone: user.contactInfo || prev.contactPhone,
    }));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setSuccessDetails(null);
    setError('');
    setLoading(false);
    setFormData(getInitialFormData(user));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedFrom = formData.from.trim();
    const trimmedTo = formData.to.trim();
    const trimmedName = formData.contactName.trim();
    const trimmedEmail = formData.contactEmail.trim();
    const trimmedPhone = formData.contactPhone.trim();
    const passengerCount = parseInt(formData.passengers, 10);
    const tripType = formData.returnDate ? 'Round Trip' : 'One Way';

    if (trimmedPhone.length < 7) {
      setLoading(false);
      setError('Please enter a valid phone or WhatsApp number.');
      return;
    }

    if (trimmedFrom.toLowerCase() === trimmedTo.toLowerCase()) {
      setLoading(false);
      setError('Departure and destination cannot be the same.');
      return;
    }

    if (formData.returnDate) {
      const departure = new Date(formData.departureDate);
      const returnDate = new Date(formData.returnDate);
      if (returnDate < departure) {
        setLoading(false);
        setError('Return date cannot be earlier than departure date.');
        return;
      }
    }

    try {
      const payload = {
        from: trimmedFrom,
        to: trimmedTo,
        departureDate: formData.departureDate,
        returnDate: formData.returnDate || null,
        passengers: passengerCount,
        travelClass: formData.travelClass,
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
      };

      const response = await axios.post('/flights', payload);
      const request = response.data || {};
      const requestId = request.requestId || request.id;
      const whatsappUrl = buildFlightRequestWhatsAppUrl({
        requestId,
        contactName: request.contactName || trimmedName,
        from: request.from || trimmedFrom,
        to: request.to || trimmedTo,
        departureDate: request.departureDate || payload.departureDate,
        returnDate: request.returnDate || payload.returnDate,
        passengers: request.passengers || passengerCount,
        tripType: request.tripType || tripType,
      });

      setSuccessDetails({
        requestId,
        from: request.from || trimmedFrom,
        to: request.to || trimmedTo,
        departureDate: request.departureDate || payload.departureDate,
        passengers: request.passengers || passengerCount,
        tripType: request.tripType || tripType,
        whatsappUrl,
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Something went wrong. Please try again or contact us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '30px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333',
  };

  if (successDetails) {
    return (
      <div style={containerStyle}>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-2xl font-bold text-[#0B1C3E] mb-3">Your Flight Request Has Been Received</h2>
          <p className="text-gray-700 mb-3">
            Route: <span className="font-semibold">{successDetails.from} to {successDetails.to}</span>
          </p>
          <p className="text-gray-700 mb-3">
            Departure: <span className="font-semibold">{new Date(successDetails.departureDate).toLocaleDateString()}</span> • {successDetails.tripType}
          </p>
          <p className="text-gray-700 mb-3">
            Reference <span className="font-semibold">#{successDetails.requestId}</span>. Our team will review your route, check suitable options, and continue with you on WhatsApp.
          </p>
          <p className="text-gray-700 mb-5">
            No online payment is required on the website.
          </p>
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 mb-5">
              Create an account to track requests and receive future offers. You can still start requests without signing in.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <a
              href={successDetails.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white py-3 rounded-lg font-bold hover:opacity-95 transition-opacity"
            >
              Continue on WhatsApp
            </a>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/dashboard?tab=flights')}
                className="w-full border border-[#0B1C3E] text-[#0B1C3E] py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                View My Requests
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Send Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 className="text-2xl font-bold mb-3 text-[#0B1C3E] text-center">Request Flight Quote</h2>
      <p className="text-center text-gray-600 mb-6">
        Tell us your route and travel dates. Our team will check available options and follow up with the next steps.
      </p>

      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
        Start your request online. Flight availability and pricing are confirmed by our team after reviewing your details, and no online payment is required on the website.
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="text" name="from" required style={inputStyle} value={formData.from} onChange={handleChange} placeholder="City or airport" />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="text" name="to" required style={inputStyle} value={formData.to} onChange={handleChange} placeholder="City or airport" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Departure Date</label>
            <input type="date" name="departureDate" required style={inputStyle} value={formData.departureDate} onChange={handleChange} />
          </div>
          <div>
            <label style={labelStyle}>Return Date (Optional)</label>
            <input type="date" name="returnDate" style={inputStyle} value={formData.returnDate} onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Passengers</label>
            <input type="number" name="passengers" min="1" required style={inputStyle} value={formData.passengers} onChange={handleChange} />
          </div>
          <div>
            <label style={labelStyle}>Cabin Class</label>
            <select name="travelClass" style={inputStyle} value={formData.travelClass} onChange={handleChange}>
              <option value="Economy">Economy</option>
              <option value="Business">Business</option>
              <option value="First">First Class</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Contact Name</label>
        <input type="text" name="contactName" required style={inputStyle} value={formData.contactName} onChange={handleChange} />

        <label style={labelStyle}>Contact Email</label>
        <input type="email" name="contactEmail" required style={inputStyle} value={formData.contactEmail} onChange={handleChange} />

        <label style={labelStyle}>Contact Phone / WhatsApp</label>
        <input type="tel" name="contactPhone" required style={inputStyle} value={formData.contactPhone} onChange={handleChange} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending Request...' : 'Request Flight Quote'}
        </button>
      </form>
    </div>
  );
}
