import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { CONFIG } from '../config';

const ManageUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '', // Assuming username might be a field
    email: '',
    password: '',
    role: 'user'
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/users?page=${currentPage}`);

      const data = response.data;
      
      if (data.users) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || 1);
      } else {
        // Fallback for non-paginated responses, though API should be paginated
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId) => {
    if (currentUser && (currentUser._id === userId || currentUser.id === userId)) {
      alert("You cannot delete your own account.");
      setError("You cannot delete your own account."); // User-facing error
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${CONFIG.API_BASE_URL}/users/${userId}`);

      setUsers(users.filter(user => (user._id || user.id) !== userId)); // Optimistic update
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete user.'); // User-facing error
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null); // Clear previous errors
      if (editingId) {
        const data = { ...formData };
        if (!data.password) delete data.password; // Don't send empty password on update
        await axios.put(`${CONFIG.API_BASE_URL}/users/${editingId}`, data);
      } else {
        await axios.post(`${CONFIG.API_BASE_URL}/users`, formData);
      } // Consider adding a success message here
      
      fetchUsers();
      resetForm();
    } catch (err) {
      alert('Failed to save user: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleEdit = (user) => {
    setFormData({
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '', // Always blank on edit
      role: user.role || 'user'
    });
    setEditingId(user._id || user.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const resetForm = () => {
    setFormData({ name: '', username: '', email: '', password: '', role: 'user' });
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

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '20px' }}>Manage Users</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#ffe0e0', borderRadius: '5px' }}>{error}</div>
      )}
      <button 
        onClick={() => setShowForm(!showForm)} 
        style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        {showForm ? 'Cancel' : 'Add New User'}
      </button>

      {showForm && (
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
          <h3 style={{ marginBottom: '15px' }}>{editingId ? 'Edit User' : 'New User'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password {editingId && '(Leave blank to keep current)'}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} minLength="6" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#006837', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {editingId ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Joined Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id || user.id}>
                <td style={tdStyle}>{user.name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: user.role === 'admin' ? '#d1ecf1' : '#e2e3e5', color: user.role === 'admin' ? '#0c5460' : '#383d41', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {user.role}
                    </span>
                </td>
                <td style={tdStyle}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td style={tdStyle}>
                  {currentUser && (currentUser._id === (user._id || user.id) || currentUser.id === (user._id || user.id)) ? (
                    <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '14px' }}>Current User</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user._id || user.id)}
                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

export default ManageUsers;
