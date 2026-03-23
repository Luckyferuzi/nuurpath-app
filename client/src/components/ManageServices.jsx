import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const ManageServices = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', icon: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/services');
            setServices(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching services:', err);
            setError('Failed to load services.');
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post('/api/services', formData);
            setServices([...services, res.data]);
            setFormData({ title: '', description: '', icon: '' });
            setSubmitting(false);
        } catch (err) {
            console.error('Error creating service:', err);
            alert(err.response?.data?.msg || 'Failed to create service');
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this service?')) return;
        try {
            await axios.delete(`/api/services/${id}`);
            setServices(services.filter(s => s.id !== id));
        } catch (err) {
            console.error('Error deleting service:', err);
            alert('Failed to delete service');
        }
    };

    // Styles matching your AdminDashboard theme
    const containerStyle = { padding: '20px', maxWidth: '1000px', margin: '20px auto' };
    const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
    const thStyle = { textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', backgroundColor: '#f8f9fa', color: '#0B1C3E' };
    const tdStyle = { padding: '12px', borderBottom: '1px solid #eee' };
    const formStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '30px' };
    const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
    const btnStyle = { padding: '10px 20px', backgroundColor: '#006837', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
    const deleteBtnStyle = { padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

    if (loading) return <div style={containerStyle}>Loading services...</div>;

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>Manage Services</h2>
                <Link to="/admin" style={{ textDecoration: 'none', color: '#0056b3', fontWeight: 'bold' }}>&larr; Back to Dashboard</Link>
            </div>

            {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

            {/* Add Service Form */}
            <div style={formStyle}>
                <h3 style={{ marginTop: 0, color: '#0B1C3E' }}>Add New Service</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="title"
                        placeholder="Service Title (e.g., Visa Assistance)"
                        value={formData.title}
                        onChange={handleInputChange}
                        style={inputStyle}
                        required
                    />
                    <textarea
                        name="description"
                        placeholder="Service Description"
                        value={formData.description}
                        onChange={handleInputChange}
                        style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
                        required
                    />
                    <input
                        type="text"
                        name="icon"
                        placeholder="Icon Name (e.g., Plane, Hotel, Shield)"
                        value={formData.icon}
                        onChange={handleInputChange}
                        style={inputStyle}
                    />
                    <button type="submit" style={btnStyle} disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Service'}
                    </button>
                </form>
            </div>

            {/* Services Table */}
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thStyle}>Icon</th>
                        <th style={thStyle}>Title</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {services.map(service => (
                        <tr key={service.id}>
                            <td style={tdStyle}>{service.icon || '—'}</td>
                            <td style={tdStyle}><strong>{service.title}</strong></td>
                            <td style={tdStyle}>{service.description}</td>
                            <td style={tdStyle}>
                                <button 
                                    onClick={() => handleDelete(service.id)} 
                                    style={deleteBtnStyle}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {services.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', padding: '30px', color: '#666' }}>No services found. Add your first service above.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ManageServices;