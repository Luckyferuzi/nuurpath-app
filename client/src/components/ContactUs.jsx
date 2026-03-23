import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import axios from 'axios'; // Import axios
import { CONFIG } from '../config';

const ContactUs = () => {
  // ... (state variables remain the same)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState({ loading: false, error: null, success: false });
  const [activeIndex, setActiveIndex] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const recaptchaRef = useRef(null);
  const fileInputRef = useRef(null);

  const faqData = [
    {
      question: "What are your office hours?",
      answer: "We are open Monday to Saturday from 9:00 AM to 6:00 PM. We are closed on Sundays and public holidays."
    },
    {
      question: "Do you offer visa assistance?",
      answer: "Yes, we provide comprehensive visa assistance for Hajj, Umrah, and other international destinations as part of our travel packages."
    },
    {
      question: "How can I book a package?",
      answer: "You can book directly through our website by browsing our packages, or you can contact us via phone or email for a personalized booking experience."
    },
    {
      question: "Can I customize my travel itinerary?",
      answer: "Absolutely! We specialize in creating tailored travel experiences. Please use the contact form above to tell us about your specific requirements."
    }
  ];

  const { name, email, subject, message } = formData;
  const MAX_MESSAGE_LENGTH = 1000;

  useEffect(() => {
    if (status.success) {
      const timer = setTimeout(() => {
        setStatus(prev => ({ ...prev, success: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status.success]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setStatus({ loading: false, error: 'Please enter a valid email address.', success: false });
      return;
    }

    if (!agreedToTerms) {
      setStatus({ loading: false, error: 'Please agree to the Terms and Conditions.', success: false });
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
      const formDataToSend = new FormData();
      formDataToSend.append('name', name);
      formDataToSend.append('email', email);
      formDataToSend.append('subject', subject);
      formDataToSend.append('message', message);
      formDataToSend.append('captchaToken', captchaToken);
      
      if (attachment) {
        formDataToSend.append('attachment', attachment);
      }

      // Use axios instead of fetch to leverage the baseURL configuration
      await axios.post(`${CONFIG.API_BASE_URL}/contact`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStatus({ loading: false, error: null, success: true });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setAgreedToTerms(false);
      setAttachment(null);
      setPreviewUrl(null);
      setCaptchaToken(null);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || err.message || 'Failed to send message';
      setStatus({ loading: false, error: errorMessage, success: false });
    }
  };

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
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

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0B1C3E',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#0B1C3E' }}>Contact Us</h2>
      
      {status.success && (
        <div style={{ padding: '15px', backgroundColor: '#d4edda', color: '#155724', marginBottom: '20px', borderRadius: '4px', textAlign: 'center' }}>
          Message sent successfully! We will get back to you soon.
        </div>
      )}
      
      {status.error && (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', marginBottom: '20px', borderRadius: '4px', textAlign: 'center' }}>
          {status.error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={labelStyle} htmlFor="name">Name</label>
        <input style={inputStyle} type="text" id="name" name="name" value={name} onChange={handleChange} required placeholder="Your Name" />

        <label style={labelStyle} htmlFor="email">Email</label>
        <input style={inputStyle} type="email" id="email" name="email" value={email} onChange={handleChange} required placeholder="Your Email" />

        <label style={labelStyle} htmlFor="subject">Subject</label>
        <input style={inputStyle} type="text" id="subject" name="subject" value={subject} onChange={handleChange} required placeholder="Subject" />

        <label style={labelStyle} htmlFor="message">Message</label>
        <textarea style={{ ...inputStyle, height: '150px', marginBottom: '5px' }} id="message" name="message" value={message} onChange={handleChange} required placeholder="How can we help you?" maxLength={MAX_MESSAGE_LENGTH} />
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', marginBottom: '15px' }}>
          {message.length} / {MAX_MESSAGE_LENGTH} characters
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle} htmlFor="attachment">Attachment (optional)</label>
          <input 
            type="file" 
            id="attachment" 
            onChange={handleFileChange} 
            ref={fileInputRef}
            accept="image/*,application/pdf"
            style={inputStyle} 
          />
          {attachment && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              {previewUrl ? (
                <>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Image Preview:</p>
                  <img src={previewUrl} alt="Attachment Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '10px' }} />
                </>
              ) : (
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>Selected: {attachment.name}</p>
              )}
              <button
                type="button"
                onClick={handleRemoveAttachment}
                style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Remove Attachment
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ marginRight: '10px', width: 'auto', cursor: 'pointer' }}
          />
          <label htmlFor="terms" style={{ margin: 0, fontWeight: 'normal', fontSize: '14px', color: '#333', cursor: 'pointer' }}>
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#0B1C3E', textDecoration: 'underline' }}>Terms and Conditions</a>
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {isMounted && (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
              onChange={(token) => setCaptchaToken(token)}
            />
          )}
        </div>

        <button type="submit" style={{ ...buttonStyle, opacity: status.loading ? 0.7 : 1 }} disabled={status.loading}>
          {status.loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>

      {showConfirmation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.3rem', maxWidth: '500px', width: '90%', boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.2)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.5, color: '#0B1C3E' }}>Confirm Message</h3>
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
              <p style={{ marginTop: 0, color: '#555' }}>Please review your message details before sending:</p>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
                  <div><strong>Name:</strong> {name}</div>
                  <div><strong>Email:</strong> {email}</div>
                  <div><strong>Subject:</strong> {subject}</div>
                  {attachment && <div><strong>Attachment:</strong> {attachment.name}</div>}
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
                style={{ padding: '0.375rem 0.75rem', backgroundColor: '#0B1C3E', color: 'white', border: '1px solid #0B1C3E', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#0B1C3E' }}>Our Location</h3>
        <div style={{ textAlign: 'center', marginBottom: '20px', color: '#555' }}>
            <p style={{ margin: '5px 0' }}><strong>Address:</strong> GSM PLAZA, 2nd Floor</p>
            <p style={{ margin: '5px 0' }}><strong>Phone:</strong> {CONFIG.CONTACT_PHONES}</p>
        </div>
        <div style={{ width: '100%', height: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
          <iframe
            title="Office Location"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            src="https://maps.google.com/maps?q=GSM+Plaza&t=&z=13&ie=UTF8&iwloc=&output=embed"
          ></iframe>
        </div>
        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <a 
                href="https://www.google.com/maps?q=GSM+Plaza" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#0B1C3E',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}
            >
                Get Directions
            </a>
            <a 
                href={`tel:${CONFIG.CONTACT_PHONES}`}
                style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#D4AF37',
                    color: '#0B1C3E',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                }}
            >
                Call Now
            </a>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '20px', color: '#0B1C3E' }}>Follow Us</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3b5998', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#C13584', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1DA1F2', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.942-2.178-1.524-3.591-1.524-2.719 0-4.943 2.224-4.943 4.943 0 .387.044.765.127 1.139-4.098-.202-7.728-2.165-10.148-5.144-.424.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
          </a>
        </div>
      </div>

      <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '30px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#0B1C3E' }}>Frequently Asked Questions</h3>
        <div style={{ textAlign: 'left' }}>
          {faqData.map((faq, index) => (
            <div key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' }}>
              <div 
                onClick={() => toggleFAQ(index)} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '10px 0'
                }}
              >
                <h4 style={{ color: '#0B1C3E', margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{faq.question}</h4>
                <span style={{ color: '#0B1C3E', fontWeight: 'bold', fontSize: '18px' }}>{activeIndex === index ? '−' : '+'}</span>
              </div>
              <div
                style={{
                  maxHeight: activeIndex === index ? '500px' : '0',
                  opacity: activeIndex === index ? '1' : '0',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease-in-out'
                }}
              >
                <p style={{ color: '#555', margin: '10px 0 0 0', lineHeight: '1.5' }}>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
