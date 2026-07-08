import React, { useState, useRef, forwardRef, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { CONFIG } from '../config';
import { useAuth } from '../contexts/AuthContext.jsx';

const RECAPTCHA_SITE_KEY = (process.env.REACT_APP_RECAPTCHA_SITE_KEY || '').trim();

const DateCustomInput = forwardRef(({ value, onClick, onChange, ...props }, ref) => (
  <input
    style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
    value={value}
    onClick={onClick}
    onChange={onChange}
    ref={ref}
    {...props}
  />
));

const PrivateConsultationBooking = () => {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    phone: '',
    date: null,
    time: null
  });
  const [status, setStatus] = useState({ loading: false, error: null, success: false });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const recaptchaRef = useRef(null);
  const isRecaptchaConfigured = Boolean(RECAPTCHA_SITE_KEY);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!agreedToTerms) {
      setStatus({ loading: false, error: 'Please agree to the Terms and Conditions.', success: false });
      return;
    }

    if (!isRecaptchaConfigured) {
      setStatus({ loading: false, error: 'Booking is temporarily unavailable. Please try again later.', success: false });
      return;
    }

    if (!captchaToken) {
      setStatus({ loading: false, error: 'Please complete the reCAPTCHA check.', success: false });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmation(false);
    setStatus({ loading: true, error: null, success: false });

    try {
      // Ensure date is formatted as YYYY-MM-DD and time as HH:MM AM/PM
      const formattedDate = formData.date ? formData.date.toLocaleDateString('en-CA') : ''; // YYYY-MM-DD
      const formattedTime = formData.time ? formData.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

      const payload = {
        ...formData,
        date: formattedDate,
        time: formattedTime,
        captchaToken,
        userId: isAuthenticated ? user.id : null
      };

      await axios.post(`${CONFIG.API_BASE_URL}/appointments/private`, payload);

      setStatus({ loading: false, error: null, success: true });
      setFormData({ name: '', email: '', description: '', phone: '', date: null, time: null });
      setAgreedToTerms(false);
      setCaptchaToken(null);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.msg || err.message || 'Failed to book consultation';
      setStatus({ loading: false, error: errorMessage, success: false }); // User-facing error
    }
  };

  const containerStyle = {
    maxWidth: '500px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
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

  const buttonStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  };

  const isWeekday = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Book a Private Consultation</h2>
      
      {status.success && (
        <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '15px', borderRadius: '4px' }}>
          Consultation booked successfully!
        </div>
      )}
      
      {status.error && (
        <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '15px', borderRadius: '4px' }}>
          {status.error}
        </div>
      )}
      
      <style>{`
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker {
          font-family: 'Plus Jakarta Sans', sans-serif;
          border-color: #e0e0e0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .react-datepicker__header {
          background-color: #0B1C3E;
          border-bottom: none;
        }
        .react-datepicker__current-month, 
        .react-datepicker__day-name, 
        .react-datepicker-time__header {
          color: white;
        }
        .react-datepicker__navigation-icon::before {
          border-color: #D4AF37;
        }
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected,
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
          background-color: #D4AF37;
          color: #0B1C3E;
          font-weight: bold;
        }
        .react-datepicker__day--selected:hover,
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected:hover {
          background-color: #c59d32;
        }
        .react-datepicker__day:hover,
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item:hover {
          background-color: #f0f0f0;
        }
      `}</style>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle} htmlFor="name">Name</label>
        <input style={inputStyle} type="text" id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Your Full Name" />

        <label style={labelStyle} htmlFor="email">Email Address</label>
        <input style={inputStyle} type="email" id="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Your Email Address" />

        <label style={labelStyle} htmlFor="phone">Phone Number</label>
        <input style={inputStyle} type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Your Phone Number" />

        <label style={labelStyle} htmlFor="description">Brief Description of Concern/Request</label>
        <textarea style={{ ...inputStyle, height: '100px' }} id="description" name="description" value={formData.description} onChange={handleChange} required placeholder="Describe your concern..." />

        <label style={labelStyle} htmlFor="date">Preferred Date</label>
        <DatePicker
          selected={formData.date}
          onChange={(date) => setFormData(prev => ({ ...prev, date }))}
          dateFormat="yyyy-MM-dd"
          minDate={new Date()}
          filterDate={isWeekday}
          customInput={<DateCustomInput />}
          placeholderText="Select Date"
          required
        />

        <label style={labelStyle} htmlFor="time">Preferred Time</label>
        <DatePicker
          selected={formData.time}
          onChange={(time) => setFormData(prev => ({ ...prev, time }))}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="h:mm aa"
          customInput={<DateCustomInput />}
          placeholderText="Select Time"
          required
        />

        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ marginRight: '10px', cursor: 'pointer' }}
          />
          <label htmlFor="terms" style={{ margin: 0, fontWeight: 'normal', fontSize: '14px', color: '#333', cursor: 'pointer' }}>
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>Terms and Conditions</a>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {isRecaptchaConfigured ? (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
            />
          ) : (
            <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' }}>
              reCAPTCHA is currently unavailable. Please try again later.
            </div>
          )}
        </div>

        <button type="submit" style={{ ...buttonStyle, opacity: status.loading ? 0.7 : 1 }} disabled={status.loading}>
          {status.loading ? 'Booking...' : 'Book Private Call'}
        </button>
      </form>

      {showConfirmation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.3rem', maxWidth: '500px', width: '90%', boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.2)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.5, color: '#0B1C3E' }}>Confirm Booking</h3>
              <button 
                type="button" 
                onClick={() => setShowConfirmation(false)} 
                style={{ background: 'transparent', border: 0, fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', opacity: 0.5, padding: '1rem', margin: '-1rem -1rem -1rem auto' }}
                onMouseOver={e => e.currentTarget.style.opacity = 1}
                onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            {/* Modal Body */}
            <div style={{ padding: '1rem' }}>
              <p style={{ marginTop: 0, color: '#555' }}>Please review your details before confirming:</p>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                  <div><strong>Name:</strong> {formData.name}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Phone:</strong> {formData.phone}</div>
                  <div><strong>Date:</strong> {formData.date?.toLocaleDateString()}</div>
                  <div><strong>Time:</strong> {formData.time?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem', borderTop: '1px solid #dee2e6' }}>
              <button 
                type="button" 
                onClick={() => setShowConfirmation(false)} 
                style={{ padding: '0.375rem 0.75rem', backgroundColor: '#6c757d', color: 'white', border: '1px solid #6c757d', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmSubmit} 
                style={{ padding: '0.375rem 0.75rem', backgroundColor: '#007bff', color: 'white', border: '1px solid #007bff', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateConsultationBooking;
