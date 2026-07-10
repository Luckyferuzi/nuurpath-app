import React, { useEffect, useMemo, useState } from 'react';
import axios, { resolveBackendUrl } from '../lib/api';

const EMPTY_FORM_DATA = {
  title: '',
  description: '',
  price: '',
  destination: '',
  duration: '',
  type: 'Umrah',
  itinerary: '',
  isFeatured: false,
  featuredOrder: '',
};

const PACKAGE_TYPE_OPTIONS = [
  'Umrah',
  'Hajj',
  'Holiday',
  'Flight Support',
  'Family Travel',
  'Business Travel',
  'Custom Package',
];

function getPackageId(pkg) {
  return pkg?._id || pkg?.id;
}

function sortFeaturedPackages(packages) {
  return [...packages]
    .filter((pkg) => pkg?.isFeatured)
    .sort((firstPackage, secondPackage) => {
      const firstOrder = Number.isFinite(firstPackage?.featuredOrder) ? firstPackage.featuredOrder : Number.MAX_SAFE_INTEGER;
      const secondOrder = Number.isFinite(secondPackage?.featuredOrder) ? secondPackage.featuredOrder : Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return (firstPackage?.displayOrder || 0) - (secondPackage?.displayOrder || 0);
    });
}

function parseStructuredItinerary(itinerary) {
  if (!itinerary) {
    return [];
  }

  try {
    const parsed = JSON.parse(itinerary);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item, index) => ({
      day: item?.day || index + 1,
      title: item?.title || '',
      description: item?.description || '',
      location: item?.location || '',
      image: item?.image || '',
      id: item?.id || `itinerary-${Date.now()}-${index}`,
    }));
  } catch (error) {
    return [];
  }
}

function parseJourneyStops(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((stop, index) => ({
    city: stop?.city || '',
    stayLabel: stop?.stayLabel || '',
    accommodation: stop?.accommodation || '',
    notes: stop?.notes || '',
    image: stop?.image || '',
    id: stop?.id || `journey-${Date.now()}-${index}`,
  }));
}

const ManagePackages = () => {
  const [packages, setPackages] = useState([]);
  const [packageOrderDraft, setPackageOrderDraft] = useState([]);
  const [featuredOrderDraft, setFeaturedOrderDraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [image, setImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [journeyStops, setJourneyStops] = useState([]);
  const [uploadingItineraryIndex, setUploadingItineraryIndex] = useState(null);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState('');
  const [orderError, setOrderError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedItineraryIndex, setDraggedItineraryIndex] = useState(null);
  const [draggedPackageIndex, setDraggedPackageIndex] = useState(null);
  const [draggedFeaturedIndex, setDraggedFeaturedIndex] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get('/packages');
      const nextPackages = Array.isArray(response.data) ? response.data : response.data.packages || [];
      setPackages(nextPackages);
      setPackageOrderDraft(nextPackages);
      setFeaturedOrderDraft(sortFeaturedPackages(nextPackages));
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching packages:', fetchError);
      setError(fetchError.response?.data?.msg || fetchError.message || 'Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM_DATA);
    setImage(null);
    setExistingImageUrl('');
    setEditingId(null);
    setItineraryItems([]);
    setJourneyStops([]);
    setFormError(null);
  };

  const baselineFeaturedPackages = useMemo(
    () => sortFeaturedPackages(packages),
    [packages]
  );
  const hasPackageOrderChanges = packageOrderDraft.map(getPackageId).join(',') !== packages.map(getPackageId).join(',');
  const hasFeaturedOrderChanges = featuredOrderDraft.map(getPackageId).join(',') !== baselineFeaturedPackages.map(getPackageId).join(',');
  const hasOrderChanges = hasPackageOrderChanges || hasFeaturedOrderChanges;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'isFeatured' && !checked) {
      setFormData((current) => ({
        ...current,
        isFeatured: false,
        featuredOrder: '',
      }));
    }
  };

  const handleImageChange = (event) => {
    setImage(event.target.files[0] || null);
  };

  const addJourneyStop = () => {
    setJourneyStops((current) => [
      ...current,
      {
        city: '',
        stayLabel: '',
        accommodation: '',
        notes: '',
        image: '',
        id: `journey-${Date.now()}-${current.length}`,
      },
    ]);
  };

  const updateJourneyStop = (index, field, value) => {
    setJourneyStops((current) => current.map((stop, stopIndex) => (
      stopIndex === index ? { ...stop, [field]: value } : stop
    )));
  };

  const moveJourneyStop = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= journeyStops.length) {
      return;
    }

    const nextStops = [...journeyStops];
    const [movedStop] = nextStops.splice(index, 1);
    nextStops.splice(targetIndex, 0, movedStop);
    setJourneyStops(nextStops);
  };

  const removeJourneyStop = (index) => {
    setJourneyStops((current) => current.filter((_, stopIndex) => stopIndex !== index));
  };

  const addItineraryDay = () => {
    setItineraryItems((current) => [
      ...current,
      {
        day: current.length + 1,
        title: '',
        description: '',
        location: '',
        image: '',
        id: `itinerary-${Date.now()}-${current.length}`,
      },
    ]);
  };

  const updateItineraryDay = (index, field, value) => {
    setItineraryItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const handleItineraryDragStart = (index) => {
    setDraggedItineraryIndex(index);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleItineraryDrop = (dropIndex) => {
    if (draggedItineraryIndex === null || draggedItineraryIndex === dropIndex) {
      return;
    }

    const nextItems = [...itineraryItems];
    const [draggedItem] = nextItems.splice(draggedItineraryIndex, 1);
    nextItems.splice(dropIndex, 0, draggedItem);

    setItineraryItems(nextItems.map((item, index) => ({
      ...item,
      day: index + 1,
    })));
    setDraggedItineraryIndex(null);
  };

  const handleItineraryImageUpload = async (index, event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setUploadingItineraryIndex(index);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const response = await axios.post('/packages/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateItineraryDay(index, 'image', response.data.url);
    } catch (uploadError) {
      setFormError(uploadError.response?.data?.msg || uploadError.message || 'Failed to upload itinerary image.');
      console.error('Error uploading itinerary image:', uploadError);
    } finally {
      setUploadingItineraryIndex(null);
      event.target.value = null;
    }
  };

  const removeItineraryDay = (index) => {
    setItineraryItems((current) => current
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item, itemIndex) => ({ ...item, day: itemIndex + 1 })));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess('');

    try {
      const finalItinerary = itineraryItems.length > 0
        ? JSON.stringify(itineraryItems.map((item, index) => ({
            day: index + 1,
            title: item.title,
            description: item.description,
            location: item.location || '',
            image: item.image || '',
          })))
        : formData.itinerary;
      const finalJourneyStops = JSON.stringify(journeyStops.map((stop, index) => ({
        order: index + 1,
        city: stop.city,
        stayLabel: stop.stayLabel || '',
        accommodation: stop.accommodation || '',
        notes: stop.notes || '',
        image: stop.image || '',
      })));

      const packagePayload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        destination: formData.destination,
        duration: formData.duration,
        type: formData.type,
        itinerary: finalItinerary,
        journeyStops: finalJourneyStops,
        isFeatured: formData.isFeatured ? 'true' : 'false',
      };

      if (formData.isFeatured && formData.featuredOrder !== '') {
        packagePayload.featuredOrder = formData.featuredOrder;
      }

      if (image) {
        const submitData = new FormData();
        Object.entries(packagePayload).forEach(([key, value]) => {
          submitData.append(key, value);
        });
        submitData.append('image', image);

        if (editingId) {
          await axios.put(`/packages/${editingId}`, submitData);
        } else {
          await axios.post('/packages', submitData);
        }
      } else if (editingId) {
        await axios.put(`/packages/${editingId}`, packagePayload);
      } else {
        await axios.post('/packages', packagePayload);
      }

      setFormSuccess(editingId ? 'Package updated successfully.' : 'Package created successfully.');
      resetForm();
      await fetchPackages();
    } catch (submitError) {
      setFormError(submitError.response?.data?.msg || submitError.message || 'Failed to save package.');
      console.error('Error saving package:', submitError);
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
      type: pkg.type || 'Umrah',
      itinerary: pkg.itinerary || '',
      isFeatured: Boolean(pkg.isFeatured),
      featuredOrder: pkg.featuredOrder || '',
    });
    setItineraryItems(parseStructuredItinerary(pkg.itinerary));
    setJourneyStops(parseJourneyStops(pkg.journeyStops));
    setEditingId(getPackageId(pkg));
    setImage(null);
    setExistingImageUrl(pkg.images && pkg.images.length > 0 ? resolveBackendUrl(pkg.images[0]) : '');
    setFormError(null);
    setFormSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      await axios.delete(`/packages/${id}`);
      await fetchPackages();
    } catch (deleteError) {
      setError(deleteError.response?.data?.msg || deleteError.message || 'Failed to delete package.');
      console.error('Error deleting package:', deleteError);
    }
  };

  const handlePackageDragStart = (index) => {
    setDraggedPackageIndex(index);
  };

  const handlePackageDrop = (dropIndex) => {
    if (draggedPackageIndex === null || draggedPackageIndex === dropIndex) {
      return;
    }

    const nextPackages = [...packageOrderDraft];
    const [draggedPackage] = nextPackages.splice(draggedPackageIndex, 1);
    nextPackages.splice(dropIndex, 0, draggedPackage);
    setPackageOrderDraft(nextPackages);
    setDraggedPackageIndex(null);
    setOrderSuccess('');
  };

  const handleFeaturedDragStart = (index) => {
    setDraggedFeaturedIndex(index);
  };

  const handleFeaturedDrop = (dropIndex) => {
    if (draggedFeaturedIndex === null || draggedFeaturedIndex === dropIndex) {
      return;
    }

    const nextFeaturedPackages = [...featuredOrderDraft];
    const [draggedPackage] = nextFeaturedPackages.splice(draggedFeaturedIndex, 1);
    nextFeaturedPackages.splice(dropIndex, 0, draggedPackage);
    setFeaturedOrderDraft(nextFeaturedPackages);
    setDraggedFeaturedIndex(null);
    setOrderSuccess('');
  };

  const resetOrderDrafts = () => {
    setPackageOrderDraft(packages);
    setFeaturedOrderDraft(sortFeaturedPackages(packages));
    setOrderError(null);
    setOrderSuccess('');
  };

  const savePackageOrder = async () => {
    setIsSavingOrder(true);
    setOrderError(null);
    setOrderSuccess('');

    try {
      const featuredOrderMap = new Map(featuredOrderDraft.map((pkg, index) => [getPackageId(pkg), index + 1]));
      const payload = packageOrderDraft.map((pkg, index) => ({
        id: getPackageId(pkg),
        displayOrder: index + 1,
        isFeatured: Boolean(pkg.isFeatured),
        featuredOrder: pkg.isFeatured ? featuredOrderMap.get(getPackageId(pkg)) || null : null,
      }));

      await axios.put('/packages/reorder', { packages: payload });
      setOrderSuccess('Package order saved successfully.');
      await fetchPackages();
    } catch (saveError) {
      setOrderError(saveError.response?.data?.msg || saveError.message || 'Failed to save package order.');
      console.error('Error saving package order:', saveError);
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading packages...</div>;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h2 className="mb-8 text-3xl font-bold text-[#0B1C3E]">Manage Packages</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{error}</div>
      )}

      <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#0B1C3E]">{editingId ? 'Edit Package' : 'Add New Package'}</h3>
          <p className="mt-2 text-sm text-gray-600">
            Group the package clearly so staff can understand the route, the selling points, and how it should appear publicly.
          </p>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">{formSuccess}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h4 className="mb-4 text-lg font-bold text-[#0B1C3E]">Basic Information</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Package title</span>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Premium Umrah Package - December 2026"
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Package type</span>
                <input
                  list="package-type-options"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Umrah, Hajj, Holiday..."
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required
                />
                <datalist id="package-type-options">
                  {PACKAGE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Explain the main value of this package, who it suits, and what support is included."
                className="h-28 w-full rounded-lg border border-gray-300 p-3"
                required
              />
            </label>
          </section>

          <section className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h4 className="mb-4 text-lg font-bold text-[#0B1C3E]">Pricing and Public Summary</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Price</span>
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="1500"
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Summary destination</span>
                <input
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="Makkah and Madinah"
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Duration</span>
                <input
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="10 Days"
                  className="w-full rounded-lg border border-gray-300 p-3"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Main image</span>
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="w-full rounded-lg border border-gray-300 p-3"
                />
              </label>
            </div>

            {existingImageUrl && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-gray-700">Current image</p>
                <img src={existingImageUrl} alt="Current package" className="h-24 w-40 rounded-lg border border-gray-200 object-cover" />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-[#0B1C3E]">Journey Route</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Use this section when a package moves through more than one city, such as Makkah, Madinah, Jeddah, or transit stops.
                </p>
              </div>
              <button
                type="button"
                onClick={addJourneyStop}
                className="rounded-lg bg-[#0B1C3E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1a2f55]"
              >
                Add Stop
              </button>
            </div>

            {journeyStops.length > 0 ? (
              <div className="space-y-4">
                {journeyStops.map((stop, index) => (
                  <div key={stop.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="font-bold text-[#0B1C3E]">Stop {index + 1}</h5>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveJourneyStop(index, -1)}
                          disabled={index === 0}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveJourneyStop(index, 1)}
                          disabled={index === journeyStops.length - 1}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => removeJourneyStop(index)}
                          className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="City"
                        className="rounded-lg border border-gray-300 p-3"
                        value={stop.city}
                        onChange={(event) => updateJourneyStop(index, 'city', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Stay label, for example 4 Nights"
                        className="rounded-lg border border-gray-300 p-3"
                        value={stop.stayLabel}
                        onChange={(event) => updateJourneyStop(index, 'stayLabel', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Accommodation or hotel"
                        className="rounded-lg border border-gray-300 p-3 md:col-span-2"
                        value={stop.accommodation}
                        onChange={(event) => updateJourneyStop(index, 'accommodation', event.target.value)}
                      />
                      <textarea
                        placeholder="Notes for this stop"
                        className="h-24 rounded-lg border border-gray-300 p-3 md:col-span-2"
                        value={stop.notes}
                        onChange={(event) => updateJourneyStop(index, 'notes', event.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No structured route stops yet. Add stops here if the package includes more than one city or stage.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-[#0B1C3E]">Day-by-Day Itinerary</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Use structured days when you want a detailed public itinerary. Leave it empty to use the simple text field instead.
                </p>
              </div>
              <button
                type="button"
                onClick={addItineraryDay}
                className="rounded-lg bg-[#0B1C3E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1a2f55]"
              >
                Add Day
              </button>
            </div>

            {itineraryItems.length > 0 ? (
              <div className="space-y-3">
                {itineraryItems.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleItineraryDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleItineraryDrop(index)}
                    className={`flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 ${draggedItineraryIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''}`}
                  >
                    <div className="cursor-move pt-2 text-gray-400" title="Drag to reorder">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <div className="w-full space-y-3">
                      <div className="font-bold text-[#0B1C3E]">Day {item.day}</div>
                      <input
                        type="text"
                        placeholder="Title"
                        className="w-full rounded-lg border border-gray-300 p-3"
                        value={item.title}
                        onChange={(event) => updateItineraryDay(index, 'title', event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Location"
                        className="w-full rounded-lg border border-gray-300 p-3"
                        value={item.location}
                        onChange={(event) => updateItineraryDay(index, 'location', event.target.value)}
                      />
                      <textarea
                        placeholder="Activities or description"
                        className="h-24 w-full rounded-lg border border-gray-300 p-3"
                        value={item.description}
                        onChange={(event) => updateItineraryDay(index, 'description', event.target.value)}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-[2px] text-gray-500">Day image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleItineraryImageUpload(index, event)}
                          className="text-sm"
                          disabled={uploadingItineraryIndex === index}
                        />
                        {uploadingItineraryIndex === index && (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[#0B1C3E]"></div>
                        )}
                        {item.image && uploadingItineraryIndex !== index && (
                          <img src={resolveBackendUrl(item.image)} alt="Itinerary preview" className="h-10 w-10 rounded border border-gray-200 object-cover" />
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItineraryDay(index)}
                      className="rounded border border-red-200 px-2 py-1 text-sm font-bold text-red-600"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                name="itinerary"
                value={formData.itinerary}
                onChange={handleChange}
                placeholder="Simple text itinerary, or use Add Day for a structured itinerary."
                className="h-28 w-full rounded-lg border border-gray-300 p-3"
              />
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h4 className="mb-4 text-lg font-bold text-[#0B1C3E]">Visibility and Homepage Promotion</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <span className="block font-semibold text-[#0B1C3E]">Show this package in the featured section</span>
                  <span className="mt-1 block text-sm text-gray-600">
                    Featured packages can have a separate homepage order from the general package order.
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Featured position</span>
                <input
                  name="featuredOrder"
                  value={formData.featuredOrder}
                  onChange={handleChange}
                  placeholder="Leave blank to place at the end"
                  className="w-full rounded-lg border border-gray-300 p-3"
                  disabled={!formData.isFeatured}
                />
                <span className="mt-2 block text-xs text-gray-500">
                  You can also fine-tune featured order in the reorder workspace below.
                </span>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-[#006837] px-6 py-3 font-bold text-white transition-colors hover:bg-[#00502a]"
            >
              {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>}
              {editingId ? 'Update Package' : 'Create Package'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-gray-500 px-6 py-3 font-bold text-white transition-colors hover:bg-gray-600"
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#0B1C3E]">General Package Order</h3>
              <p className="mt-1 text-sm text-gray-600">
                Drag packages to control the order customers see by default. New packages are placed at the end unless you move them.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {packageOrderDraft.map((pkg, index) => (
              <div
                key={getPackageId(pkg)}
                draggable
                onDragStart={() => handlePackageDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handlePackageDrop(index)}
                className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 ${draggedPackageIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''}`}
              >
                <div className="cursor-move text-gray-400" title="Drag to reorder">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1C3E] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[#0B1C3E]">{pkg.title}</p>
                  <p className="text-sm text-gray-500">{pkg.destination} | {pkg.duration}</p>
                </div>
                {pkg.isFeatured && (
                  <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-xs font-bold uppercase tracking-[2px] text-[#8f6b00]">
                    Featured
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[#0B1C3E]">Featured Package Order</h3>
            <p className="mt-1 text-sm text-gray-600">
              Drag only the homepage-featured packages here to control their separate featured sequence.
            </p>
          </div>
          {featuredOrderDraft.length > 0 ? (
            <div className="space-y-3">
              {featuredOrderDraft.map((pkg, index) => (
                <div
                  key={getPackageId(pkg)}
                  draggable
                  onDragStart={() => handleFeaturedDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleFeaturedDrop(index)}
                  className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 ${draggedFeaturedIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''}`}
                >
                  <div className="cursor-move text-gray-400" title="Drag to reorder">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-[#0B1C3E]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#0B1C3E]">{pkg.title}</p>
                    <p className="text-sm text-gray-500">General order #{pkg.displayOrder}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
              No featured packages yet. Mark a package as featured in the form above and it will appear here.
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={savePackageOrder}
            disabled={isSavingOrder || !hasOrderChanges}
            className="rounded-lg bg-[#0B1C3E] px-6 py-3 font-bold text-white transition-colors hover:bg-[#1a2f55] disabled:opacity-50"
          >
            {isSavingOrder ? 'Saving Order...' : 'Save Package Order'}
          </button>
          <button
            type="button"
            onClick={resetOrderDrafts}
            disabled={!hasOrderChanges}
            className="rounded-lg border border-gray-300 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Reset Draft Order
          </button>
          <span className="text-sm text-gray-500">
            Save when you are happy with both the general package order and the featured package order.
          </span>
        </div>
        {orderError && (
          <div className="mt-4 rounded-lg bg-red-100 p-3 text-red-700">{orderError}</div>
        )}
        {orderSuccess && (
          <div className="mt-4 rounded-lg bg-green-100 p-3 text-green-700">{orderSuccess}</div>
        )}
      </div>

      <div className="grid gap-6">
        {packages.map((pkg) => (
          <div key={getPackageId(pkg)} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-[#0B1C3E]">{pkg.title}</h3>
                <span className="rounded-full bg-[#0B1C3E]/10 px-3 py-1 text-xs font-bold uppercase tracking-[2px] text-[#0B1C3E]">
                  Order #{pkg.displayOrder}
                </span>
                {pkg.isFeatured && (
                  <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-xs font-bold uppercase tracking-[2px] text-[#8f6b00]">
                    Featured #{pkg.featuredOrder || '-'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{pkg.destination} | {pkg.duration} | {pkg.type}</p>
              <p className="mt-1 font-bold text-[#D4AF37]">${pkg.price}</p>
              {Array.isArray(pkg.journeyStops) && pkg.journeyStops.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  Route: {pkg.journeyStops.map((stop) => stop.city).join(' -> ')}
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-3 md:mt-0">
              <button onClick={() => handleEdit(pkg)} className="text-sm font-bold text-blue-600 hover:text-blue-800">
                Edit
              </button>
              <button onClick={() => handleDelete(getPackageId(pkg))} className="text-sm font-bold text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagePackages;
