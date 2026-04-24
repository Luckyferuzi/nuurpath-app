import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';

const FlightBookingsAdmin = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${CONFIG.API_BASE_URL}/flights`, {
        headers: { 'x-auth-token': token }
      });
      setBookings(response.data);
      setError(null); // Clear previous errors on success
      setLoading(false);
    } catch (err) {
      console.error('Error fetching flight bookings:', err);
      setError('Failed to load flight bookings.');
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      setError(null); // Clear previous errors
      await axios.put(`${CONFIG.API_BASE_URL}/flights/${id}`, 
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );
      setBookings(bookings.map(b => 
        b.id === id ? { ...b, status: newStatus } : b
      ));
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update booking status.'); // User-facing error
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      const token = localStorage.getItem('token');
      setError(null); // Clear previous errors
      await axios.delete(`${CONFIG.API_BASE_URL}/flights/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete booking.'); // User-facing error
    }
  };

  const exportCSV = () => {
    if (bookings.length === 0) {
      alert("No bookings to export.");
      return;
    }

    const headers = ["ID", "Contact Name", "Email", "Phone", "From", "To", "Departure", "Return", "Passengers", "Class", "Status", "Booking Date"];
    const csvContent = [
      headers.join(","),
      ...bookings.map(b => {
        const date = new Date(b.createdAt).toLocaleDateString();
        const departureDate = new Date(b.departureDate).toLocaleDateString();
        const returnDate = b.returnDate ? new Date(b.returnDate).toLocaleDateString() : 'N/A';
        const name = (b.contactName || '').replace(/"/g, '""');
        
        return [
          b.id,
          `"${name}"`,
          b.contactEmail || '',
          b.contactPhone || '',
          `"${b.from}"`,
          `"${b.to}"`,
          departureDate,
          returnDate,
          b.passengers,
          b.travelClass,
          b.status,
          date
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `flight_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Flight Bookings</h2>
        {error && (
          <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '5px' }}>{error}</div>
        )}
        <button 
          onClick={exportCSV} 
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Export CSV
        </button>
      </div>
      
      {bookings.length === 0 ? (
        <p>No flight bookings found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Contact</th>
                <th style={thStyle}>Route</th>
                <th style={thStyle}>Travel Dates</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td style={tdStyle}>{new Date(booking.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    {booking.contactName}<br/>
                    <span style={{fontSize: '0.8em', color: '#666'}}>{booking.contactEmail}</span><br/>
                    <span style={{fontSize: '0.8em', color: '#666'}}>{booking.contactPhone}</span>
                  </td>
                  <td style={tdStyle}>{booking.from} ➝ {booking.to}</td>
                  <td style={tdStyle}>
                    Dep: {new Date(booking.departureDate).toLocaleDateString()}<br/>
                    {booking.returnDate && <>Ret: {new Date(booking.returnDate).toLocaleDateString()}</>}
                  </td>
                  <td style={tdStyle}>{booking.passengers} Pax<br/>{booking.travelClass}</td>
                  <td style={tdStyle}>
                    <select value={booking.status} onChange={(e) => handleStatusChange(booking.id, e.target.value)} style={{ padding: '4px' }}>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td style={tdStyle}><button onClick={() => handleDelete(booking.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button></td>
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