import React, { useCallback, useEffect, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getOperationalStatusBadgeStyle,
  getOperationalStatusLabel,
  getOperationalStatusOptions,
} from '../lib/operationalPipeline.js';
import {
  buildConsultationLeadFollowUpMessage,
  buildDirectWhatsAppUrl,
} from '../lib/whatsapp.js';

const PrivateConsultationsAdmin = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    description: '',
    status: 'New',
    adminNotes: '',
  });
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const fetchConsultations = useCallback(async () => {
    try {
      const response = await axios.get('/appointments/private');
      setConsultations(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load consultation requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      description: '',
      status: 'New',
      adminNotes: '',
    });
    setEditingId(null);
    setShowForm(false);
    setSubmitting(false);
  };

  const handleEdit = (consultation) => {
    setFormData({
      name: consultation.name || '',
      email: consultation.email || '',
      phone: consultation.phone || '',
      date: consultation.date || '',
      time: consultation.time || '',
      description: consultation.description || '',
      status: getOperationalStatusLabel(consultation.status),
      adminNotes: consultation.adminNotes || '',
    });
    setEditingId(consultation.id);
    setShowForm(true);
    setMessage(null);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingId) {
        await axios.put(`/appointments/private/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Consultation request updated successfully.' });
      } else {
        const createPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          time: formData.time,
          description: formData.description,
          status: formData.status,
        };
        const createResponse = await axios.post('/appointments/private', createPayload);
        const createdConsultationId = createResponse.data?.id;

        if (createdConsultationId && (formData.adminNotes.trim() || getOperationalStatusLabel(formData.status) !== 'New')) {
          await axios.put(`/appointments/private/${createdConsultationId}`, {
            status: formData.status,
            adminNotes: formData.adminNotes,
          });
        }

        setMessage({ type: 'success', text: 'Consultation request created successfully.' });
      }

      setError(null);
      await fetchConsultations();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save consultation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this consultation request?')) {
      return;
    }

    try {
      await axios.delete(`/appointments/private/${id}`);
      setMessage({ type: 'success', text: 'Consultation request deleted successfully.' });
      setError(null);
      await fetchConsultations();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete consultation request.');
    }
  };

  const openWhatsApp = (consultation) => {
    const url = buildDirectWhatsAppUrl(
      consultation.phone,
      buildConsultationLeadFollowUpMessage({
        contactName: consultation.name,
        requestId: consultation.requestId || consultation.id,
        status: getOperationalStatusLabel(consultation.status),
        date: consultation.date,
        time: consultation.time,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredConsultations = consultations.filter((consultation) => {
    const term = searchTerm.toLowerCase();
    return (
      String(consultation.requestId || consultation.id).includes(term) ||
      String(consultation.name || '').toLowerCase().includes(term) ||
      String(consultation.email || '').toLowerCase().includes(term) ||
      String(consultation.phone || '').toLowerCase().includes(term)
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
      <h2 style={{ marginBottom: '20px' }}>Consultation Follow-Ups</h2>

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
          onClick={() => {
            if (showForm) {
              resetForm();
              return;
            }

            setShowForm(true);
            setEditingId(null);
            setMessage(null);
          }}
          style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : 'Add New Consultation'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '15px' }}>{editingId ? `Update Consultation Request #${editingId}` : 'New Consultation Request'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <input type="text" placeholder="Name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="email" placeholder="Email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="tel" placeholder="Phone / WhatsApp" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="date" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <input type="time" value={formData.time} onChange={(event) => setFormData({ ...formData, time: event.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <textarea placeholder="Consultation summary or request details" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }} required />
            <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {getOperationalStatusOptions(formData.status).map((statusOption) => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </select>
            <textarea
              placeholder="Internal notes for your team only"
              value={formData.adminNotes}
              onChange={(event) => setFormData({ ...formData, adminNotes: event.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={submitting} style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {submitting ? 'Saving...' : editingId ? 'Save Request Update' : 'Create Request'}
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
          placeholder="Search by customer, email, phone, or request ID..."
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

      {filteredConsultations.length === 0 ? (
        <p>No consultation requests yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Request Date</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Preferred Slot</th>
                <th style={thStyle}>Request Summary</th>
                <th style={thStyle}>Request Status</th>
                <th style={thStyle}>Internal Notes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultations.map((consultation) => (
                <tr key={consultation.id}>
                  <td style={tdStyle}>{consultation.createdAt ? new Date(consultation.createdAt).toLocaleDateString() : 'TBD'}</td>
                  <td style={tdStyle}>
                    {consultation.name}
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{consultation.email}</span>
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{consultation.phone}</span>
                    {!consultation.userId && <div style={{ fontSize: '0.75em', color: '#856404', marginTop: '4px' }}>Guest / No account</div>}
                  </td>
                  <td style={tdStyle}>
                    Date: {consultation.date || 'TBD'}
                    <br />
                    Time: {consultation.time || 'TBD'}
                  </td>
                  <td style={tdStyle}>{consultation.description || 'No description provided.'}</td>
                  <td style={tdStyle}>
                    <span style={{ ...getOperationalStatusBadgeStyle(consultation.status), padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {getOperationalStatusLabel(consultation.status)}
                    </span>
                  </td>
                  <td style={tdStyle}>{consultation.adminNotes || 'No internal notes yet.'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                      <button onClick={() => handleEdit(consultation)} style={{ color: 'blue', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                        Update Request
                      </button>
                      <button onClick={() => openWhatsApp(consultation)} style={{ color: '#006837', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                        Continue on WhatsApp
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(consultation.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                          Delete
                        </button>
                      )}
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

export default PrivateConsultationsAdmin;
