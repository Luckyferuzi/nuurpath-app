import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CONFIG } from '../config';
import { useAuth } from '../contexts/AuthContext.jsx';

const PrivateConsultationsAdmin = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    description: '',
    status: 'Pending'
  });

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/appointments/private`);
      setConsultations(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this consultation request?')) return;

    try {
      await axios.delete(`${CONFIG.API_BASE_URL}/appointments/private/${id}`);
      fetchConsultations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${CONFIG.API_BASE_URL}/appointments/private/${editingId}`, formData);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/appointments/private`, formData);
      }
      
      fetchConsultations();
      resetForm();
    } catch (err) {
      alert('Failed to save consultation: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleEdit = (consultation) => {
    setFormData({
      name: consultation.name || '',
      email: consultation.email || '',
      phone: consultation.phone || '',
      date: consultation.date || '',
      time: consultation.time || '',
      description: consultation.description || '',
      status: consultation.status || 'Pending'
    });
    setEditingId(consultation._id || consultation.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', date: '', time: '', description: '', status: 'Pending' });
    setEditingId(null);
    setShowForm(false);
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

  const actionButtonStyle = {
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: 'none',
    marginRight: '5px',
    fontSize: '14px'
  };

  const deleteButtonStyle = {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '20px' }}>Private Consultation Requests</h2>

      <button 
        onClick={() => setShowForm(!showForm)} 
        style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        {showForm ? 'Cancel' : 'Add New Consultation'}
      </button>

      {showForm && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '15px' }}>{editingId ? 'Edit Consultation' : 'New Consultation'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <input type="text" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', height: '80px' }} />
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="Completed">Completed</option>
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
      
      {consultations.length === 0 ? (
        <p>No consultation requests found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Date Requested</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Preferred Date</th>
                <th style={thStyle}>Preferred Time</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((consultation) => (
                <tr key={consultation._id || consultation.id}>
                  <td style={tdStyle}>
                    {new Date(consultation.createdAt).toLocaleDateString()}
                  </td>
                  <td style={tdStyle}>{consultation.name}</td>
                  <td style={tdStyle}>{consultation.phone}</td>
                  <td style={tdStyle}>{consultation.date}</td>
                  <td style={tdStyle}>{consultation.time}</td>
                  <td style={tdStyle}>{consultation.description}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      backgroundColor: consultation.status === 'Contacted' ? '#d4edda' : '#fff3cd',
                      color: consultation.status === 'Contacted' ? '#155724' : '#856404',
                      fontSize: '12px'
                    }}>
                      {consultation.status || 'Pending'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(consultation)} style={{ ...actionButtonStyle, backgroundColor: '#007bff', color: 'white' }}>Edit</button>
                    {user?.role === 'admin' && (
                      <button style={deleteButtonStyle} onClick={() => handleDelete(consultation._id || consultation.id)}>
                        Delete
                      </button>
                    )}
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