import React, { useCallback, useEffect, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getOperationalStatusBadgeStyle,
  getOperationalStatusLabel,
  getOperationalStatusOptions,
} from '../lib/operationalPipeline.js';
import {
  buildDirectWhatsAppUrl,
  buildFlightLeadFollowUpMessage,
} from '../lib/whatsapp.js';

const formatDate = (value, fallback = 'TBD') => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toLocaleDateString();
};

const FlightBookingsAdmin = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: 'New',
    adminNotes: '',
  });
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get('/flights');
      setBookings(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load flight requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const resetForm = () => {
    setEditingBooking(null);
    setFormData({
      status: 'New',
      adminNotes: '',
    });
    setSaving(false);
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      status: getOperationalStatusLabel(booking.status),
      adminNotes: booking.adminNotes || '',
    });
    setMessage(null);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingBooking) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put(`/flights/${editingBooking.id}`, formData);
      const updatedBooking = response.data;
      setBookings((prev) => prev.map((booking) => (
        booking.id === updatedBooking.id ? updatedBooking : booking
      )));
      setError(null);
      setMessage({ type: 'success', text: `Flight request #${updatedBooking.requestId || updatedBooking.id} updated successfully.` });
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update flight request.');
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      await axios.delete(`/flights/${id}`);
      setBookings((prev) => prev.filter((booking) => booking.id !== id));
      setMessage({ type: 'success', text: 'Flight request deleted successfully.' });
      setError(null);
      if (editingBooking?.id === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete request.');
    }
  };

  const openWhatsApp = (booking) => {
    const url = buildDirectWhatsAppUrl(
      booking.contactPhone,
      buildFlightLeadFollowUpMessage({
        contactName: booking.contactName || booking.user?.name,
        requestId: booking.requestId || booking.id,
        status: getOperationalStatusLabel(booking.status),
        from: booking.from,
        to: booking.to,
        departureDate: booking.departureDate,
        returnDate: booking.returnDate,
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

    const headers = ['ID', 'Contact Name', 'Email', 'Phone', 'From', 'To', 'Departure', 'Return', 'Passengers', 'Class', 'Request Status', 'Internal Notes', 'Request Date'];
    const csvContent = [
      headers.join(','),
      ...bookings.map((booking) => {
        const name = (booking.contactName || booking.user?.name || 'Guest').replace(/"/g, '""');
        const notes = (booking.adminNotes || '').replace(/"/g, '""');

        return [
          booking.requestId || booking.id,
          `"${name}"`,
          booking.contactEmail || booking.user?.email || '',
          booking.contactPhone || '',
          `"${String(booking.from || '').replace(/"/g, '""')}"`,
          `"${String(booking.to || '').replace(/"/g, '""')}"`,
          formatDate(booking.departureDate),
          formatDate(booking.returnDate, 'One Way'),
          booking.passengers || 1,
          booking.travelClass || '',
          `"${getOperationalStatusLabel(booking.status)}"`,
          `"${notes}"`,
          formatDate(booking.createdAt),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flight_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = bookings.filter((booking) => {
    const term = searchTerm.toLowerCase();
    const name = (booking.contactName || booking.user?.name || '').toLowerCase();
    const email = (booking.contactEmail || booking.user?.email || '').toLowerCase();
    const route = `${booking.from || ''} ${booking.to || ''}`.toLowerCase();

    return (
      name.includes(term) ||
      email.includes(term) ||
      route.includes(term) ||
      String(booking.requestId || booking.id).includes(term)
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
      <h2 style={{ marginBottom: '20px' }}>Flight Request Follow-Up</h2>

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

      {editingBooking && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '10px' }}>Update Flight Request #{editingBooking.requestId || editingBooking.id}</h3>
          <p style={{ marginTop: 0, marginBottom: '15px', color: '#555' }}>
            {(editingBooking.contactName || editingBooking.user?.name || 'Guest')} · {editingBooking.from} to {editingBooking.to}
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
                {saving ? 'Saving...' : 'Save Request Update'}
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
          placeholder="Search by customer, email, route, or request ID..."
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

      {filteredBookings.length === 0 ? (
        <p>No new flight requests yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Request Date</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Route</th>
                <th style={thStyle}>Travel</th>
                <th style={thStyle}>Request Status</th>
                <th style={thStyle}>Internal Notes</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td style={tdStyle}>{formatDate(booking.createdAt)}</td>
                  <td style={tdStyle}>
                    {booking.contactName || booking.user?.name || 'Guest'}
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{booking.contactEmail || booking.user?.email || 'No email provided'}</span>
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#666' }}>{booking.contactPhone || 'No phone provided'}</span>
                    {!booking.userId && <div style={{ fontSize: '0.75em', color: '#856404', marginTop: '4px' }}>Guest / No account</div>}
                  </td>
                  <td style={tdStyle}>
                    <strong>{booking.from} to {booking.to}</strong>
                    <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#555' }}>
                      {booking.tripType || (booking.returnDate ? 'Round Trip' : 'One Way')}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    Departure: {formatDate(booking.departureDate)}
                    <br />
                    Return: {formatDate(booking.returnDate, 'One Way')}
                    <br />
                    Passengers: {booking.passengers || 1} ({booking.travelClass || 'Class not set'})
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
                        Update Request
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
    </div>
  );
};

export default FlightBookingsAdmin;
