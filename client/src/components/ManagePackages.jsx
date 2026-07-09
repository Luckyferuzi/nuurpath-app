import React, { useState, useEffect } from 'react';
import axios, { resolveBackendUrl } from '../lib/api';

const ManagePackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    destination: '',
    duration: '',
    type: '',
    itinerary: ''
  });
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [uploadingItineraryIndex, setUploadingItineraryIndex] = useState(null);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null); // Added for form-specific errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`/packages`);
      setPackages(Array.isArray(response.data) ? response.data : response.data.packages || []);
      setError(null); // Clear general error on successful fetch
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null); // Clear previous form errors
    try {
      // Use structured itinerary if available, otherwise use the text field
      const finalItinerary = itineraryItems.length > 0 ? JSON.stringify(itineraryItems) : formData.itinerary;
      
      if (image) {
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (key !== 'itinerary') submitData.append(key, formData[key]);
        });
        submitData.append('itinerary', finalItinerary);
        submitData.append('image', image);

        if (editingId) {
          await axios.put(`/packages/${editingId}`, submitData);
        } else {
          await axios.post('/packages', submitData);
        }
      } else {
        const payload = { ...formData, itinerary: finalItinerary };
        
        if (editingId) {
          await axios.put(`/packages/${editingId}`, payload);
        } else {
          await axios.post('/packages', payload);
        }
      }
      
      setFormData({ title: '', description: '', price: '', destination: '', duration: '', type: '', itinerary: '' });
      setImage(null);
      setEditingId(null);
      setItineraryItems([]);
      fetchPackages();
    } catch (error) {
      setFormError(error.response?.data?.msg || error.message || 'Failed to save package.'); // User-facing error
      console.error('Error saving package:', error); // Log for debugging
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (pkg) => {
    setFormData({
      title: pkg.title || '',
      description: pkg.description || '',
      price: pkg.price || '',
      destination: pkg.destination || '',
      duration: pkg.duration || '',
      type: pkg.type || '',
      itinerary: pkg.itinerary || ''
    });

    // Try to parse structured itinerary
    try {
      const parsed = JSON.parse(pkg.itinerary);
      if (Array.isArray(parsed)) {
        setItineraryItems(parsed.map((item, idx) => ({
          ...item,
          id: item.id || `item-${Date.now()}-${idx}`
        })));
        // Clear text field if structured data exists to avoid confusion
        setFormData(prev => ({ ...prev, itinerary: '' }));
      } else {
        setItineraryItems([]);
      }
    } catch (e) {
      setItineraryItems([]);
    }

    setEditingId(pkg._id || pkg.id);
    setImage(null);
    window.scrollTo(0, 0);
  };

  const addItineraryDay = () => {
    setItineraryItems([...itineraryItems, { 
      day: itineraryItems.length + 1, 
      title: '', 
      description: '', 
      location: '',
      id: `new-${Date.now()}`
    }]);
  };

  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    
    const newItems = [...itineraryItems];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    const updatedItems = newItems.map((item, index) => ({ ...item, day: index + 1 }));
    setItineraryItems(updatedItems);
    setDraggedItemIndex(null);
  };

  const updateItineraryDay = (index, field, value) => {
    const newItems = [...itineraryItems];
    newItems[index][field] = value;
    setItineraryItems(newItems);
  };

  const handleItineraryImageUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingItineraryIndex(index);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const res = await axios.post('/packages/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateItineraryDay(index, 'image', res.data.url);
    } catch (err) {
      setFormError(err.response?.data?.msg || err.message || 'Failed to upload image for itinerary day.'); // User-facing error
      console.error("Error uploading image:", err);
    } finally {
      setUploadingItineraryIndex(null);
      e.target.value = null; // Clear the file input
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      try {
        await axios.delete(`/packages/${id}`);
        fetchPackages();
      } catch (error) {
        setError(error.response?.data?.msg || error.message || 'Failed to delete package.'); // User-facing error
        console.error('Error deleting package:', error); // Log for debugging
      }
    }
  };

  const removeItineraryDay = (index) => {
    const newItems = itineraryItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, day: i + 1 }));
    setItineraryItems(newItems);
  };

  if (loading) return <div className="text-center p-10">Loading packages...</div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h2 className="text-3xl font-bold text-[#0B1C3E] mb-8">Manage Packages</h2>

      {error && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-10">
        <h3 className="text-xl font-bold text-[#0B1C3E] mb-4">{editingId ? 'Edit Package' : 'Add New Package'}</h3>
        {formError && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">{formError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Package Title" className="p-3 border rounded-lg w-full" required />
            <input name="price" value={formData.price} onChange={handleChange} placeholder="Price (e.g. 1500)" className="p-3 border rounded-lg w-full" required />
            <input name="destination" value={formData.destination} onChange={handleChange} placeholder="Destination" className="p-3 border rounded-lg w-full" />
            <input name="duration" value={formData.duration} onChange={handleChange} placeholder="Duration (e.g. 7 Days)" className="p-3 border rounded-lg w-full" />
            <input name="type" value={formData.type} onChange={handleChange} placeholder="Type (e.g. Hajj, Umrah, Vacation)" className="p-3 border rounded-lg w-full" />
            <input type="file" onChange={handleImageChange} accept="image/*" className="p-3 border rounded-lg w-full" />
          </div>
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="p-3 border rounded-lg w-full h-24" required />
          
          {/* Itinerary Builder */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-gray-700">Itinerary</label>
              <button type="button" onClick={addItineraryDay} className="text-sm bg-[#0B1C3E] text-white px-3 py-1 rounded hover:bg-[#1a2f55]">
                + Add Day
              </button>
            </div>
            
            {itineraryItems.length > 0 ? (
              <div className="space-y-3 mb-4">
                {itineraryItems.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={`flex gap-2 items-start bg-white p-3 rounded border border-gray-200 transition-all ${draggedItemIndex === index ? 'opacity-50 border-dashed border-gray-400' : ''}`}
                  >
                    <div className="pt-2 cursor-move text-gray-400 hover:text-[#0B1C3E]" title="Drag to reorder">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <span className="font-bold text-[#0B1C3E] pt-2 w-16">Day {item.day}</span>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        placeholder="Title (e.g., Arrival in Makkah)" 
                        className="w-full p-2 border rounded text-sm"
                        value={item.title}
                        onChange={(e) => updateItineraryDay(index, 'title', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Location (e.g. Eiffel Tower, Paris)" 
                        className="w-full p-2 border rounded text-sm"
                        value={item.location || ''}
                        onChange={(e) => updateItineraryDay(index, 'location', e.target.value)}
                      />
                      <textarea 
                        placeholder="Activities description..." 
                        className="w-full p-2 border rounded text-sm h-16"
                        value={item.description}
                        onChange={(e) => updateItineraryDay(index, 'description', e.target.value)}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs font-bold text-gray-500">Day Image:</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleItineraryImageUpload(index, e)}
                          className="text-xs"
                          disabled={uploadingItineraryIndex === index}
                        />
                        {uploadingItineraryIndex === index ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0B1C3E]"></div>
                        ) : (
                          item.image && <img src={resolveBackendUrl(item.image)} alt="Preview" className="h-10 w-10 object-cover rounded border" />
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItineraryDay(index)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <textarea name="itinerary" value={formData.itinerary} onChange={handleChange} placeholder="Simple text itinerary (or use 'Add Day' for structured view)..." className="p-3 border rounded-lg w-full h-24 mb-2" />
            )}
          </div>
          
          <div className="flex gap-4">
            <button type="submit" disabled={isSubmitting} className="bg-[#006837] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#00502a] transition-colors flex items-center gap-2">
              {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {editingId ? 'Update Package' : 'Add Package'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ title: '', description: '', price: '', destination: '', duration: '', type: '', itinerary: '' }); setImage(null); setItineraryItems([]); }} className="bg-gray-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-600 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid gap-6">
        {packages.map(pkg => (
          <div key={pkg._id || pkg.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</h3>
              <p className="text-gray-600 text-sm">{pkg.destination} • {pkg.duration}</p>
              <p className="text-[#D4AF37] font-bold mt-1">${pkg.price}</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button onClick={() => handleEdit(pkg)} className="text-blue-600 hover:text-blue-800 font-bold text-sm">Edit</button>
              <button onClick={() => handleDelete(pkg._id || pkg.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagePackages;
