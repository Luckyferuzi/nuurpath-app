//dev/null
//Users/issatende/Projects/nuurpath-travels/client/src/components/BookingForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { countries } from '../data/countries';

const initialFormData = {
  fullName: '',
  email: '',
  phone: '',
  date: '',
  passengers: 1,
  locationFrom: '',
  passportNumber: '',
  passportExpiryDate: '',
  passportCopy: '',
  dateOfBirth: '',
  specialRequests: '',
  nationality: ''
};

const BookingForm = ({ packageId: propPackageId, onClose, isModal }) => {
  const { packageId: paramPackageId } = useParams();
  const packageId = propPackageId || paramPackageId;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (packageId) {
      axios.get(`/api/packages/${packageId}`)
        .then(res => setPkg(res.data))
        .catch(err => console.error("Failed to fetch package:", err));
    }
  }, [packageId]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
        phone: user.contactInfo || prev.phone
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('passport', file);

    setUploading(true);
    try {
        const res = await axios.post('/api/bookings/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setFormData(prev => ({ ...prev, passportCopy: res.data.url }));
    } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload passport copy");
    } finally {
        setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
        alert("Please log in to book a trip.");
        navigate('/login');
        return;
    }

    if (!packageId) {
        alert("No package selected.");
        return;
    }

    setStatus('submitting');

    try {
      
      if (!formData.date) {
          setStatus('error');
          return;
      }

      if (formData.passportExpiryDate) {
        const travelDateObj = new Date(formData.date);
        const expiryDateObj = new Date(formData.passportExpiryDate);
        const minExpiryDate = new Date(travelDateObj);
        minExpiryDate.setMonth(minExpiryDate.getMonth() + 6);

        if (expiryDateObj < minExpiryDate) {
            setStatus('error');
            setErrorMessage('Passport must be valid for at least 6 months after the travel date.');
            return;
        }
      }

      const payload = {
        contactName: formData.fullName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        locationFrom: formData.locationFrom,
        passportNumber: formData.passportNumber,
        passportExpiryDate: formData.passportExpiryDate,
        passportCopy: formData.passportCopy,
        dateOfBirth: formData.dateOfBirth,
        specialRequests: formData.specialRequests,
        nationality: formData.nationality,
        travelDate: formData.date, // Send as YYYY-MM-DD string, backend will parse
        userId: user?.id || user?._id,
        passengers: parseInt(formData.passengers, 10),
        packageId: parseInt(packageId, 10)
      };

      await axios.post('/api/bookings', payload);

      setStatus('success');
      setTimeout(() => {
          if (onClose) {
            onClose();
          } else {
            navigate('/dashboard');
          }
      }, 2000);
    } catch (err) {
      console.error('Booking error:', err.response?.data || err.message);
      setStatus('error');
      setErrorMessage(err.response?.data?.msg || err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: isModal ? '0 auto' : '40px auto',
    padding: '30px',
    border: isModal ? 'none' : '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: isModal ? 'none' : '0 4px 6px rgba(0,0,0,0.05)'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box'
  };

  return (
    <div style={containerStyle}>
      <h2 className="text-2xl font-bold mb-6 text-[#0B1C3E] text-center">
        Book Your Trip
      </h2>
      
      {pkg && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Selected Package</p>
          <p className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</p>
          <p className="text-[#D4AF37] font-bold">{typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}</p>
        </div>
      )}

      {status === 'success' && <div className="p-4 mb-4 text-green-700 bg-green-100 rounded">Booking submitted successfully! Redirecting...</div>}
      {status === 'error' && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">{errorMessage}</div>}

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-bold text-gray-700">Full Name</label>
        <input type="text" name="fullName" required style={inputStyle} value={formData.fullName} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Email Address</label>
        <input type="email" name="email" required style={inputStyle} value={formData.email} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Phone Number</label>
        <input type="tel" name="phone" required style={inputStyle} value={formData.phone} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Departure City</label>
        <input type="text" name="locationFrom" required style={inputStyle} value={formData.locationFrom} onChange={handleChange} placeholder="e.g. New York" />

        <label className="block mb-2 font-bold text-gray-700">Passport Number</label>
        <input type="text" name="passportNumber" required style={inputStyle} value={formData.passportNumber} onChange={handleChange} placeholder="Enter Passport Number" />

        <label className="block mb-2 font-bold text-gray-700">Passport Copy (Scan/Photo)</label>
        <div className="mb-4">
            <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={handlePassportUpload}
                style={inputStyle}
            />
            {uploading && <p className="text-sm text-blue-600">Uploading...</p>}
            {formData.passportCopy && <p className="text-sm text-green-600">✓ Passport uploaded successfully</p>}
        </div>

        <label className="block mb-2 font-bold text-gray-700">Passport Expiry Date</label>
        <input type="date" name="passportExpiryDate" required style={inputStyle} value={formData.passportExpiryDate} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Nationality</label>
        <select name="nationality" required style={inputStyle} value={formData.nationality} onChange={handleChange}>
          <option value="">Select Nationality</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

        <label className="block mb-2 font-bold text-gray-700">Date of Birth</label>
        <input type="date" name="dateOfBirth" required style={inputStyle} value={formData.dateOfBirth} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Travel Date</label>
        <input type="date" name="date" required style={inputStyle} value={formData.date} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Special Dietary Requirements</label>
        <textarea name="specialRequests" style={{...inputStyle, height: '80px'}} value={formData.specialRequests} onChange={handleChange} placeholder="Vegetarian, Halal, Gluten-free, etc." />

        <label className="block mb-2 font-bold text-gray-700">Number of Passengers</label>
        <input type="number" name="passengers" min="1" required style={inputStyle} value={formData.passengers} onChange={handleChange} />

        <button 
            type="submit" 
            disabled={status === 'submitting'}
            className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50"
        >
            {status === 'submitting' ? 'Submitting...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
