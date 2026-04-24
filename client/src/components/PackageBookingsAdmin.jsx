import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const PackageBookingsAdmin = () => {
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    packageId: '',
    travelDate: '',
    passengers: 1,
    status: 'Pending'
  });
  const [showForm, setShowForm] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/package-bookings?page=${currentPage}`);
      if (response.data.bookings) {
        setBookings(response.data.bookings);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
        setError(null); // Clear previous errors on success
      } else {
        setBookings(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/packages`);
      setPackages(Array.isArray(response.data) ? response.data : response.data.packages || []);
      setError(null); // Clear previous errors on success
    } catch (err) {
      console.error("Failed to fetch packages", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null); // Clear previous errors
      if (editingId) {
        await axios.put(`${CONFIG.API_BASE_URL}/package-bookings/${editingId}`, formData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/package-bookings`, formData);
      }
      fetchBookings();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save booking.'); // User-facing error
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await axios.delete(`${CONFIG.API_BASE_URL}/package-bookings/${id}`);
        fetchBookings();
      } catch (err) { // User-facing error
        setError(err.response?.data?.msg || err.message || 'Failed to delete booking.');
      }
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
      status: booking.status || 'Pending'
    });
    setEditingId(booking._id || booking.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setFormData({ contactName: '', contactEmail: '', contactPhone: '', packageId: '', travelDate: '', passengers: 1, status: 'Pending' });
    setEditingId(null);
    setShowForm(false);
  };

  const exportCSV = () => {
    if (bookings.length === 0) {
      alert("No bookings to export.");
      return;
    }

    const headers = ["ID", "Contact Name", "Email", "Phone", "Package", "Travel Date", "Passengers", "Status", "Booking Date"];
    const csvContent = [
      headers.join(","),
      ...bookings.map(b => {
        const date = new Date(b.createdAt).toLocaleDateString();
        const travelDate = new Date(b.travelDate).toLocaleDateString();
        const pkgTitle = (b.package?.title || 'N/A').replace(/"/g, '""');
        const name = (b.contactName || b.user?.name || '').replace(/"/g, '""');
        
        return [
          b.id,
          `"${name}"`,
          b.contactEmail || b.user?.email || '',
          b.contactPhone || '',
          `"${pkgTitle}"`,
          travelDate,
          b.passengers,
          b.status,
          date
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `package_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = bookings.filter(booking => {
    const term = searchTerm.toLowerCase();
    return (
      booking.user?.name?.toLowerCase().includes(term) ||
      booking.user?.email?.toLowerCase().includes(term) ||
      booking.package?.title?.toLowerCase().includes(term) ||
      booking.id.toString().includes(term)
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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '20px' }}>All Package Bookings</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '5px' }}>{error}</div>
      )}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setShowForm(!showForm)} 
          style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : 'Add New Booking'}
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
          <h3 style={{ marginBottom: '15px' }}>{editingId ? 'Edit Booking' : 'New Booking'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <input type="text" placeholder="Contact Name" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="email" placeholder="Contact Email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="tel" placeholder="Contact Phone" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Select Package</option>
              {packages.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>)}
            </select>
            <input type="date" value={formData.travelDate} onChange={e => setFormData({...formData, travelDate: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="number" min="1" placeholder="Passengers" value={formData.passengers} onChange={e => setFormData({...formData, passengers: parseInt(e.target.value)})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {editingId ? 'Update' : 'Create'}
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
          placeholder="Search by customer, email, or package..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '16px'
          }}
        />
      </div>
      
      {filteredBookings.length === 0 ? (
        <p>No package bookings found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Booking Date</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Package</th>
                <th style={thStyle}>Travel Date</th>
                <th style={thStyle}>Passengers</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking._id || booking.id}>
                  <td style={tdStyle}>{new Date(booking.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>{booking.contactName || booking.user?.name} <br/><span style={{fontSize: '0.8em', color: '#666'}}>{booking.contactEmail || booking.user?.email}</span></td>
                  <td style={tdStyle}>{booking.package?.title || booking.package}</td>
                  <td style={tdStyle}>{new Date(booking.travelDate).toLocaleDateString()}</td>
                  <td style={tdStyle}>{booking.passengers}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                      backgroundColor: booking.status === 'Confirmed' ? '#d4edda' : booking.status === 'Cancelled' ? '#f8d7da' : '#fff3cd',
                      color: booking.status === 'Confirmed' ? '#155724' : booking.status === 'Cancelled' ? '#721c24' : '#856404'
                    }}>
                      {booking.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(booking)} style={{ marginRight: '5px', color: 'blue', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                    <button onClick={() => handleDelete(booking._id || booking.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
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
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '8px 16px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', backgroundColor: '#e2e6ea', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            Previous
          </button>
          <span style={{ padding: '8px', alignSelf: 'center' }}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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