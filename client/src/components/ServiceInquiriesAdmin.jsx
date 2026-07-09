import React, { useCallback, useEffect, useState } from 'react';
import axios from '../lib/api';
import {
  getOperationalStatusBadgeStyle,
  getOperationalStatusLabel,
  getOperationalStatusOptions,
} from '../lib/operationalPipeline.js';
import {
  buildDirectWhatsAppUrl,
  buildServiceLeadFollowUpMessage,
} from '../lib/whatsapp.js';

const formatDate = (value, fallback = 'TBD') => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString();
};

const ServiceInquiriesAdmin = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [formData, setFormData] = useState({
    status: 'New',
    adminNotes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchInquiries = useCallback(async () => {
    try {
      const response = await axios.get('/services/inquiries');
      setInquiries(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load service inquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleEdit = (inquiry) => {
    setEditingInquiry(inquiry);
    setFormData({
      status: getOperationalStatusLabel(inquiry.status),
      adminNotes: inquiry.adminNotes || '',
    });
    setMessage(null);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setEditingInquiry(null);
    setFormData({ status: 'New', adminNotes: '' });
    setSaving(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingInquiry) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put(`/services/inquiries/${editingInquiry.id}`, formData);
      const updatedInquiry = response.data;
      setInquiries((prev) => prev.map((inquiry) => (
        inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry
      )));
      setError(null);
      setMessage({ type: 'success', text: `Service inquiry #${updatedInquiry.inquiryId || updatedInquiry.id} updated successfully.` });
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update service inquiry.');
      setSaving(false);
    }
  };

  const openWhatsApp = (inquiry) => {
    const url = buildDirectWhatsAppUrl(
      inquiry.contactPhone,
      buildServiceLeadFollowUpMessage({
        contactName: inquiry.contactName,
        requestId: inquiry.inquiryId || inquiry.id,
        status: getOperationalStatusLabel(inquiry.status),
        serviceTitle: inquiry.serviceTitle || inquiry.serviceType,
        country: inquiry.country,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportCSV = () => {
    if (inquiries.length === 0) {
      alert('No inquiries to export.');
      return;
    }

    const headers = ['ID', 'Contact Name', 'Email', 'Phone', 'Service', 'Country', 'Preferred Date', 'Applicants', 'Urgency', 'Documents', 'Pipeline Status', 'Customer Message', 'Internal Notes', 'Request Date'];
    const csvContent = [
      headers.join(','),
      ...inquiries.map((inquiry) => {
        const name = String(inquiry.contactName || '').replace(/"/g, '""');
        const serviceTitle = String(inquiry.serviceTitle || inquiry.serviceType || '').replace(/"/g, '""');
        const customerMessage = String(inquiry.customerMessage || '').replace(/"/g, '""');
        const adminNotes = String(inquiry.adminNotes || '').replace(/"/g, '""');

        return [
          inquiry.inquiryId || inquiry.id,
          `"${name}"`,
          inquiry.contactEmail || '',
          inquiry.contactPhone || '',
          `"${serviceTitle}"`,
          inquiry.country || '',
          formatDate(inquiry.preferredDate),
          inquiry.applicants || '',
          inquiry.urgency || '',
          inquiry.documentStatus || '',
          `"${getOperationalStatusLabel(inquiry.status)}"`,
          `"${customerMessage}"`,
          `"${adminNotes}"`,
          formatDate(inquiry.createdAt),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `service_pipeline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const term = searchTerm.toLowerCase();
    return (
      String(inquiry.inquiryId || inquiry.id).includes(term) ||
      String(inquiry.contactName || '').toLowerCase().includes(term) ||
      String(inquiry.contactEmail || '').toLowerCase().includes(term) ||
      String(inquiry.serviceTitle || inquiry.serviceType || '').toLowerCase().includes(term)
    );
  });

  const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderBottom: '2px solid #dee2e6',
    textAlign: 'left',
    fontWeight: 'bold',
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'top',
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '20px' }}>Service Inquiry Pipeline</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '5px' }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ color: message.type === 'success' ? '#155724' : '#721c24', marginBottom: '20px', padding: '10px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', borderRadius: '5px' }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={exportCSV}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Export CSV
        </button>
      </div>

      {editingInquiry && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '10px' }}>Update Pipeline for Inquiry #{editingInquiry.inquiryId || editingInquiry.id}</h3>
          <p style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>
            {(editingInquiry.serviceTitle || editingInquiry.serviceType)} for {editingInquiry.contactName}
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <select
              value={formData.status}
              onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {getOperationalStatusOptions(formData.status).map((statusOption) => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </select>
            <textarea
              value={formData.adminNotes}
              onChange={(event) => setFormData({ ...formData, adminNotes: event.target.value })}
              placeholder="Internal notes for your team only"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={saving} style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Pipeline Update'}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by customer, email, service, or request ID..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '16px',
          }}
        />
      </div>

      {filteredInquiries.length === 0 ? (
        <p>No service inquiries yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Request Date</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Pipeline</th>
                <th style={thStyle}>Internal Notes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td style={tdStyle}>{formatDate(inquiry.createdAt)}</td>
                  <td style={tdStyle}>
                    <strong>{inquiry.serviceTitle || inquiry.serviceType}</strong>
                    {!inquiry.userId && <div style={{ fontSize: '0.75em', color: '#856404', marginTop: '4px' }}>Guest / No account</div>}
                    {inquiry.customerMessage && (
                      <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#555' }}>
                        <strong>Customer note:</strong> {inquiry.customerMessage}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {inquiry.contactName}
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{inquiry.contactEmail}</span>
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{inquiry.contactPhone || 'No phone provided'}</span>
                  </td>
                  <td style={tdStyle}>
                    <div>{inquiry.country || 'No country or destination provided'}</div>
                    {inquiry.preferredDate && <div style={{ fontSize: '0.85em', color: '#666' }}>Preferred: {formatDate(inquiry.preferredDate)}</div>}
                    {inquiry.applicants && <div style={{ fontSize: '0.85em', color: '#666' }}>Applicants: {inquiry.applicants}</div>}
                    {inquiry.urgency && <div style={{ fontSize: '0.85em', color: '#666' }}>Urgency: {inquiry.urgency}</div>}
                    {inquiry.documentStatus && <div style={{ fontSize: '0.85em', color: '#666' }}>Documents: {inquiry.documentStatus}</div>}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...getOperationalStatusBadgeStyle(inquiry.status), padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {getOperationalStatusLabel(inquiry.status)}
                    </span>
                  </td>
                  <td style={tdStyle}>{inquiry.adminNotes || 'No internal notes yet.'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                      <button
                        onClick={() => handleEdit(inquiry)}
                        style={{ color: 'blue', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                      >
                        Update Pipeline
                      </button>
                      <button
                        onClick={() => openWhatsApp(inquiry)}
                        style={{ color: '#006837', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                      >
                        Continue on WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServiceInquiriesAdmin;
