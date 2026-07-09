import React, { useEffect, useState, useCallback } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getOperationalStatusBadgeStyle,
  getOperationalStatusLabel,
  getOperationalStatusOptions,
} from '../lib/operationalPipeline.js';
import {
  buildDirectWhatsAppUrl,
  buildPackageLeadFollowUpMessage,
} from '../lib/whatsapp.js';

const formatRequestDate = (value) => {
  if (!value) {
    return 'TBD';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'TBD' : parsed.toLocaleDateString();
};

const PackageBookingsAdmin = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    packageId: '',
    travelDate: '',
    passengers: 1,
    status: 'New',
    adminNotes: '',
  });
  const [showForm, setShowForm] = useState(false);
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`/package-bookings?page=${currentPage}`);
      if (response.data.bookings) {
        setBookings(response.data.bookings);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
      } else {
        setBookings(Array.isArray(response.data) ? response.data : []);
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load package requests.');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await axios.get('/packages');
        setPackages(Array.isArray(response.data) ? response.data : response.data.packages || []);
      } catch (err) {
        console.error('Failed to fetch packages', err);
      }
    };

    fetchPackages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingId) {
        await axios.put(`/package-bookings/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Package request pipeline updated successfully.' });
      } else {
        await axios.post('/package-bookings', formData);
        setMessage({ type: 'success', text: 'Package request created successfully.' });
      }

      setError(null);
      await fetchBookings();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save package request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      await axios.delete(`/package-bookings/${id}`);
      setMessage({ type: 'success', text: 'Package request deleted successfully.' });
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete request.');
    }
  };

  const handleEdit = (booking) => {
    setFormData({
      contactName: booking.contactName || booking.user?.name || '',
      contactEmail: booking.contactEmail || booking.user?.email || '',
      contactPhone: booking.contactPhone || '',
      packageId: booking.packageId || '',
      travelDate: booking.travelDate ? new Date(booking.travelDate).toISOString().split('T')[0] : '',
      passengers: booking.passengers || 1,
      status: getOperationalStatusLabel(booking.status),
      adminNotes: booking.adminNotes || '',
    });
    setEditingId(booking.id);
    setShowForm(true);
    setMessage(null);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setFormData({
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      packageId: '',
      travelDate: '',
      passengers: 1,
      status: 'New',
      adminNotes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openWhatsApp = (booking) => {
    const url = buildDirectWhatsAppUrl(
      booking.contactPhone,
      buildPackageLeadFollowUpMessage({
        contactName: booking.contactName || booking.user?.name,
        requestId: booking.requestId || booking.id,
        packageTitle: booking.packageTitle || booking.package?.title,
        status: getOperationalStatusLabel(booking.status),
        travelDate: booking.travelDate,
        passengers: booking.passengers,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportCSV = () => {
    if (bookings.length === 0) {
      alert('No requests to export.');
      return;
    }

    const headers = ['ID', 'Contact Name', 'Email', 'Phone', 'Package', 'Preferred Travel Date', 'Travelers', 'Pipeline Status', 'Internal Notes', 'Request Date'];
    const csvContent = [
      headers.join(','),
      ...bookings.map((booking) => {
        const date = new Date(booking.createdAt).toLocaleDateString();
        const packageTitle = (booking.packageTitle || booking.package?.title || 'N/A').replace(/"/g, '""');
        const contactName = (booking.contactName || booking.user?.name || 'Guest').replace(/"/g, '""');
        const adminNotes = (booking.adminNotes || '').replace(/"/g, '""');

        return [
          booking.id,
          `"${contactName}"`,
          booking.contactEmail || booking.user?.email || '',
          booking.contactPhone || '',
          `"${packageTitle}"`,
          formatRequestDate(booking.travelDate),
          booking.passengers,
          `"${getOperationalStatusLabel(booking.status)}"`,
          `"${adminNotes}"`,
          date,
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `package_pipeline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = bookings.filter((booking) => {
    const term = searchTerm.toLowerCase();
    const customerName = (booking.contactName || booking.user?.name || '').toLowerCase();
    const customerEmail = (booking.contactEmail || booking.user?.email || '').toLowerCase();
    const packageTitle = (booking.packageTitle || booking.package?.title || '').toLowerCase();

    return (
      customerName.includes(term) ||
      customerEmail.includes(term) ||
      packageTitle.includes(term) ||
      String(booking.id).includes(term)
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
      <h2 style={{ marginBottom: '20px' }}>Package Request Pipeline</h2>

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
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : 'Add New Request'}
        </button>
        <button
          onClick={exportCSV}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Export CSV
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '15px' }}>{editingId ? `Update Pipeline for Request #${editingId}` : 'New Package Request'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <input type="text" placeholder="Contact Name" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="email" placeholder="Contact Email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="tel" placeholder="Contact Phone / WhatsApp" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={formData.packageId} onChange={(e) => setFormData({ ...formData, packageId: e.target.value })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Select Package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
              ))}
            </select>
            <input type="date" value={formData.travelDate} onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="number" min="1" placeholder="Travelers" value={formData.passengers} onChange={(e) => setFormData({ ...formData, passengers: Number(e.target.value) || 1 })} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {getOperationalStatusOptions(formData.status).map((statusOption) => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </select>
            <textarea
              placeholder="Internal notes for your team only"
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={submitting} style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {submitting ? 'Saving...' : editingId ? 'Save Pipeline Update' : 'Create Request'}
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
          placeholder="Search by customer, email, package, or request ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '16px',
          }}
        />
      </div>

      {filteredBookings.length === 0 ? (
        <p>No new package requests yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Request Date</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Package</th>
                <th style={thStyle}>Travel</th>
                <th style={thStyle}>Pipeline</th>
                <th style={thStyle}>Internal Notes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td style={tdStyle}>{new Date(booking.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    {booking.contactName || booking.user?.name || 'Guest'}
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{booking.contactEmail || booking.user?.email || 'No email provided'}</span>
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{booking.contactPhone || 'No phone provided'}</span>
                    {!booking.userId && <div style={{ fontSize: '0.75em', color: '#856404', marginTop: '4px' }}>Guest / No account</div>}
                  </td>
                  <td style={tdStyle}>
                    <strong>{booking.packageTitle || booking.package?.title || 'Unknown package'}</strong>
                    {booking.customerNotes && (
                      <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#555' }}>
                        <strong>Customer note:</strong> {booking.customerNotes}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    Preferred: {formatRequestDate(booking.travelDate)}
                    <br />
                    Travelers: {booking.passengers}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...getOperationalStatusBadgeStyle(booking.status), padding: '4px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {getOperationalStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td style={tdStyle}>{booking.adminNotes || 'No internal notes yet.'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                      <button onClick={() => handleEdit(booking)} style={{ color: 'blue', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                        Update Pipeline
                      </button>
                      <button onClick={() => openWhatsApp(booking)} style={{ color: '#006837', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                        Continue on WhatsApp
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(booking.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '8px 16px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: '#e2e6ea', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            Previous
          </button>
          <span style={{ padding: '8px', alignSelf: 'center' }}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: '8px 16px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', backgroundColor: '#e2e6ea', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PackageBookingsAdmin;
