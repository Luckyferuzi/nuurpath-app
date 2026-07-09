import React, { useEffect, useState } from 'react';
import axios from '../lib/api';
import { buildServiceInquiryWhatsAppUrl } from '../lib/whatsapp';
import { useAuth } from '../contexts/AuthContext.jsx';

const initialFormData = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  country: '',
  preferredDate: '',
  applicants: '',
  urgency: '',
  documentStatus: '',
  message: '',
};

const urgencyOptions = ['Normal', 'Soon', 'Urgent'];
const documentStatusOptions = [
  'Just starting',
  'Need help understanding requirements',
  'Documents partly ready',
  'Documents ready',
];

const getServiceMeta = (service) => {
  const title = String(service?.title || '').toLowerCase();

  if (title.includes('visa')) {
    return {
      heading: 'Start Visa Guidance',
      intro: 'Tell us your destination and travel purpose. We help you understand the required documents and next steps.',
      helper: 'Our team will review your details and guide you on requirements, preparation, and next steps. Approval is decided by the relevant authorities.',
      submitLabel: 'Start Visa Guidance',
    };
  }

  if (title.includes('passport')) {
    return {
      heading: 'Start Passport Support',
      intro: 'Start your passport support request and receive guidance on procedures, documents, and preparation.',
      helper: 'Our team will review your details and guide you on required steps and preparation. Completion depends on official procedures and issuing authorities.',
      submitLabel: 'Start Passport Support',
    };
  }

  if (title.includes('document')) {
    return {
      heading: 'Start Travel Document Support',
      intro: 'Share your situation so our team can guide you on travel documents, preparation, and next steps.',
      helper: 'We help you understand the process and required documents before continuing with you on WhatsApp.',
      submitLabel: 'Get Document Guidance',
    };
  }

  if (title.includes('flight')) {
    return {
      heading: 'Ask About Flights',
      intro: 'Share your route, dates, and travel needs. Our team will guide you on the next steps and suitable options.',
      helper: 'Flight availability and pricing are confirmed by our team after reviewing your request.',
      submitLabel: 'Ask About Flights',
    };
  }

  if (title.includes('consult')) {
    return {
      heading: 'Request Consultation',
      intro: 'Request a private consultation for personalized travel guidance and planning support.',
      helper: 'Our team will review your request and continue with you on WhatsApp.',
      submitLabel: 'Request Consultation',
    };
  }

  if (title.includes('package') || title.includes('holiday') || title.includes('umrah')) {
    return {
      heading: 'Request Travel Package Guidance',
      intro: 'Explore guided travel options and share your request online so our team can advise on availability and next steps.',
      helper: 'Our team will review your request and continue with you on WhatsApp. No online payment is required on the website.',
      submitLabel: 'Request Package Guidance',
    };
  }

  return {
    heading: 'Start Your Request',
    intro: 'Need help with a travel service? Share your request and our team will guide you through the next steps.',
    helper: 'We help you understand the required steps and continue with you on WhatsApp.',
    submitLabel: 'Start Request',
  };
};

const ServiceInquiryForm = ({ service, onClose, isModal }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);
  const serviceMeta = getServiceMeta(service);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!service?.id && !service?.title) {
      setStatus('error');
      setErrorMessage('No service was selected for this request.');
      return;
    }

    if (formData.contactPhone.trim().length < 7) {
      setStatus('error');
      setErrorMessage('Please enter a valid phone or WhatsApp number.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload = {
        serviceId: service?.id,
        serviceType: service?.title || 'Service Inquiry',
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        country: formData.country.trim(),
        preferredDate: formData.preferredDate || undefined,
        applicants: formData.applicants ? parseInt(formData.applicants, 10) : undefined,
        urgency: formData.urgency || undefined,
        documentStatus: formData.documentStatus || undefined,
        message: formData.message.trim(),
      };

      const response = await axios.post('/services/inquiries', payload);
      const inquiry = response.data || {};
      const inquiryId = inquiry.inquiryId || inquiry.id;
      const serviceTitle = inquiry.serviceTitle || inquiry.serviceType || service?.title || 'Service Request';
      const whatsappUrl = buildServiceInquiryWhatsAppUrl({
        inquiryId,
        contactName: payload.contactName,
        serviceTitle,
        country: payload.country,
        preferredDate: payload.preferredDate,
        message: payload.message,
      });

      setSuccessDetails({
        inquiryId,
        serviceTitle,
        whatsappUrl,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.response?.data?.msg || err.message || 'Something went wrong. Please try again or contact us on WhatsApp.');
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
          <h2 className="text-2xl font-bold text-[#0B1C3E] mb-3">Your Request Has Been Received</h2>
          <p className="text-gray-700 mb-3">
            Service: <span className="font-semibold">{successDetails.serviceTitle}</span>
          </p>
          <p className="text-gray-700 mb-3">
            Reference <span className="font-semibold">#{successDetails.inquiryId}</span>. Our team will review your details, prepare the next steps, and continue with you on WhatsApp.
          </p>
          <p className="text-gray-700 mb-5">
            No online payment is required on the website.
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={successDetails.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white py-3 rounded-lg font-bold hover:opacity-95 transition-opacity"
            >
              Continue on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                if (typeof onClose === 'function') {
                  onClose();
                }
              }}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              {isModal ? 'Close' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 className="text-2xl font-bold mb-6 text-[#0B1C3E] text-center">{serviceMeta.heading}</h2>
      <p className="text-center text-gray-600 mb-6">{serviceMeta.intro}</p>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Selected Service</p>
        <p className="text-xl font-bold text-[#0B1C3E]">{service?.title || 'Service Support'}</p>
        <p className="text-sm text-gray-600 mt-2">
          Start your request online, then continue with our team on WhatsApp.
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
        {serviceMeta.helper}
      </div>

      {status === 'error' && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-bold text-gray-700">Contact Name</label>
        <input type="text" name="contactName" required style={inputStyle} value={formData.contactName} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Contact Email</label>
        <input type="email" name="contactEmail" required style={inputStyle} value={formData.contactEmail} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Phone / WhatsApp Number</label>
        <input type="tel" name="contactPhone" required style={inputStyle} value={formData.contactPhone} onChange={handleChange} />

        <label className="block mb-2 font-bold text-gray-700">Country or Destination</label>
        <input type="text" name="country" style={inputStyle} value={formData.country} onChange={handleChange} placeholder="e.g. Saudi Arabia" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label className="block mb-2 font-bold text-gray-700">Preferred Date</label>
            <input type="date" name="preferredDate" style={inputStyle} value={formData.preferredDate} onChange={handleChange} />
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">Applicants</label>
            <input type="number" name="applicants" min="1" style={inputStyle} value={formData.applicants} onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label className="block mb-2 font-bold text-gray-700">Urgency</label>
            <select name="urgency" style={inputStyle} value={formData.urgency} onChange={handleChange}>
              <option value="">Select urgency</option>
              {urgencyOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">Document Status</label>
            <select name="documentStatus" style={inputStyle} value={formData.documentStatus} onChange={handleChange}>
              <option value="">Select document status</option>
              {documentStatusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="block mb-2 font-bold text-gray-700">How Can We Help?</label>
        <textarea
          name="message"
          required
          style={{ ...inputStyle, height: '90px' }}
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us what you need help with, your destination, and any important details."
        />

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-[#0B1C3E] text-white py-3 rounded-lg font-bold hover:bg-[#1a2f55] transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending Request...' : serviceMeta.submitLabel}
        </button>
      </form>
    </div>
  );
};

export default ServiceInquiryForm;
