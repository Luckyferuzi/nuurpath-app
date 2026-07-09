import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../lib/api';
import { buildPackageRequestWhatsAppUrl } from '../lib/whatsapp';
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
  nationality: '',
};

const BookingForm = ({ packageId: propPackageId, onClose, isModal }) => {
  const { packageId: paramPackageId } = useParams();
  const packageId = propPackageId || paramPackageId;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle');
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    if (!packageId) {
      return;
    }

    axios.get(`/packages/${packageId}`)
      .then((res) => setPkg(res.data))
      .catch((err) => {
        console.error('Failed to fetch package:', err);
        setErrorMessage('Unable to load the selected package right now.');
      });
  }, [packageId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: user.name || prev.fullName,
      email: user.email || prev.email,
      phone: user.contactInfo || prev.phone,
    }));
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const uploadData = new FormData();
    uploadData.append('passport', file);

    setUploading(true);
    setErrorMessage('');

    try {
      const res = await axios.post('/bookings/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData((prev) => ({ ...prev, passportCopy: res.data.url }));
    } catch (error) {
      console.error('Upload failed', error);
      setErrorMessage(error.response?.data?.msg || 'Failed to upload the passport copy.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!packageId) {
      setStatus('error');
      setErrorMessage('No package was selected for this request.');
      return;
    }

    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();

    if (trimmedPhone.length < 7) {
      setStatus('error');
      setErrorMessage('Please enter a valid phone or WhatsApp number.');
      return;
    }

    if (formData.passportExpiryDate && formData.date) {
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

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        contactName: trimmedName,
        contactEmail: trimmedEmail,
        contactPhone: trimmedPhone,
        locationFrom: formData.locationFrom.trim(),
        passportNumber: formData.passportNumber.trim(),
        passportExpiryDate: formData.passportExpiryDate || undefined,
        passportCopy: formData.passportCopy || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        specialRequests: formData.specialRequests.trim(),
        nationality: formData.nationality || undefined,
        travelDate: formData.date || undefined,
        passengers: parseInt(formData.passengers, 10),
        packageId: parseInt(packageId, 10),
      };

      const response = await axios.post('/bookings', payload);
      const responseData = response.data || {};
      const savedRequest = responseData.booking || responseData;
      const requestId = responseData.requestId || savedRequest.id;
      const packageTitle = responseData.packageTitle || savedRequest.package?.title || pkg?.title || 'your selected package';
      const whatsappUrl = buildPackageRequestWhatsAppUrl({
        packageTitle,
        requestId,
        contactName: trimmedName,
        travelDate: payload.travelDate,
        passengers: payload.passengers,
        locationFrom: payload.locationFrom,
      });

      setSuccessDetails({
        requestId,
        packageTitle,
        whatsappUrl,
      });
      setStatus('success');
    } catch (err) {
      console.error('Package request error:', err.response?.data || err.message);
      setStatus('error');
      setErrorMessage(err.response?.data?.msg || err.response?.data?.error || 'Something went wrong. Please try again or contact us on WhatsApp.');
    }
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: isModal ? '0 auto' : '40px auto',
    padding: '30px',
    border: isModal ? 'none' : '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: isModal ? 'none' : '0 4px 6px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  };

  if (status === 'success' && successDetails) {
    return (
      <div style={containerStyle}>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-2xl font-bold text-[#0B1C3E] mb-3">Your Package Request Has Been Received</h2>
          <p className="text-gray-700 mb-3">
            Your request for <span className="font-semibold">{successDetails.packageTitle}</span> has been received.
          </p>
          <p className="text-gray-700 mb-4">
            Reference <span className="font-semibold">#{successDetails.requestId}</span>. The NuurPath team will review your details, confirm availability, and continue with you on WhatsApp.
          </p>
          <p className="text-gray-700 mb-4">
            No online payment is required on the website.
          </p>
          {!isAuthenticated && (
            <p className="text-sm text-gray-500 mb-5">
              Create an account to track requests and receive future offers. You can still start a request without signing in.
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
                onClick={() => navigate('/dashboard?tab=bookings')}
                className="w-full border border-[#0B1C3E] text-[#0B1C3E] py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                View My Requests
              </button>
            )}
            {isModal && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/packages')}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Browse More Packages
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 className="text-2xl font-bold mb-6 text-[#0B1C3E] text-center">
        Request Package
      </h2>

      {pkg && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Selected Package</p>
          <p className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</p>
          <p className="text-xs text-gray-500 uppercase tracking-[2px] font-bold mt-2">Starting from</p>
          <p className="text-[#D4AF37] font-bold">{typeof pkg.price === 'number' ? `$${pkg.price.toLocaleString()}` : pkg.price}</p>
        </div>
      )}

      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
        Start your request online and our team will review availability, required details, and next steps on WhatsApp. No online payment is required on the website. {isAuthenticated ? 'This request will also appear in your dashboard.' : 'No login is required to send this request.'}
      </div>

      {status === 'error' && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">{errorMessage}</div>}

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-bold text-gray-700">Full Name</label>
        <input type="text" name="fullName" required style={inputStyle} value={formData.fullName} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Email Address</label>
        <input type="email" name="email" required style={inputStyle} value={formData.email} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Phone / WhatsApp Number</label>
        <input type="tel" name="phone" required style={inputStyle} value={formData.phone} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Preferred Travel Date</label>
        <input type="date" name="date" style={inputStyle} value={formData.date} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Number of Travelers</label>
        <input type="number" name="passengers" min="1" required style={inputStyle} value={formData.passengers} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Departure City</label>
        <input type="text" name="locationFrom" style={inputStyle} value={formData.locationFrom} onChange={handleChange} placeholder="e.g. New York" />

        <label className="block mb-2 font-bold text-gray-700">Special Requests or Travel Notes</label>
        <textarea
          name="specialRequests"
          style={{ ...inputStyle, height: '90px' }}
          value={formData.specialRequests}
          onChange={handleChange}
          placeholder="Tell us anything helpful about your travelers, dates, or preferences."
        />

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-lg font-bold text-[#0B1C3E] mb-2">Optional Travel Details</h3>
          <p className="text-sm text-gray-500 mb-4">
            These details are optional at this stage. Share them now if you want our team to review documents and requirements earlier.
          </p>

          <label className="block mb-2 font-bold text-gray-700">Passport Number</label>
          <input type="text" name="passportNumber" style={inputStyle} value={formData.passportNumber} onChange={handleChange} placeholder="Enter passport number" />

          <label className="block mb-2 font-bold text-gray-700">Passport Copy (Scan/Photo)</label>
          <div className="mb-4">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handlePassportUpload}
              style={inputStyle}
            />
            {uploading && <p className="text-sm text-blue-600">Uploading document...</p>}
            {formData.passportCopy && <p className="text-sm text-green-600">Passport copy attached successfully.</p>}
          </div>

          <label className="block mb-2 font-bold text-gray-700">Passport Expiry Date</label>
          <input type="date" name="passportExpiryDate" style={inputStyle} value={formData.passportExpiryDate} onChange={handleChange} />

          <label className="block mb-2 font-bold text-gray-700">Nationality</label>
          <select name="nationality" style={inputStyle} value={formData.nationality} onChange={handleChange}>
            <option value="">Select nationality</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          <label className="block mb-2 font-bold text-gray-700">Date of Birth</label>
          <input type="date" name="dateOfBirth" style={inputStyle} value={formData.dateOfBirth} onChange={handleChange} />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting' || uploading}
          className="w-full mt-6 bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending Request...' : 'Send Package Request'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
