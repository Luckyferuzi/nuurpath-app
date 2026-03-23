import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function FlightBookingForm() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    departureDate: '',
    returnDate: '',
    passengers: 1,
    travelClass: 'Economy',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactName: user.name || '',
        contactEmail: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        userId: isAuthenticated ? (user.id || user._id) : null,
        returnDate: formData.returnDate || null
      };

      await axios.post('/api/flights', payload);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to submit booking request');
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
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333'
  };

  return (
    <div style={containerStyle}>
      <h2 className="text-2xl font-bold mb-6 text-[#0B1C3E] text-center">Book a Flight</h2>
      
      {success && (
        <div className="p-4 mb-4 text-green-700 bg-green-100 rounded text-center">
          Flight request submitted successfully! Redirecting...
        </div>
      )}
      
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="text" name="from" required style={inputStyle} value={formData.from} onChange={handleChange} placeholder="City or Airport" />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="text" name="to" required style={inputStyle} value={formData.to} onChange={handleChange} placeholder="City or Airport" />
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
            <label style={labelStyle}>Class</label>
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

        <label style={labelStyle}>Contact Phone</label>
        <input type="tel" name="contactPhone" required style={inputStyle} value={formData.contactPhone} onChange={handleChange} />

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}