import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios, { resolveBackendUrl } from '../lib/api';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffMetricCard,
  StaffPageShell,
  StaffSectionTabs,
} from './staff/WorkspacePrimitives.jsx';

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

const PACKAGE_FORM_SECTIONS = [
  { value: 'summary', label: 'Summary' },
  { value: 'route', label: 'Route' },
  { value: 'itinerary', label: 'Itinerary' },
  { value: 'visibility', label: 'Visibility' },
];

const PACKAGE_CATALOG_FILTERS = [
  { value: 'all', label: 'All packages' },
  { value: 'featured', label: 'Featured' },
  { value: 'multi-stop', label: 'Multi-city' },
  { value: 'single-stop', label: 'Single stop' },
];

function getPackageId(pkg) {
  return pkg?._id || pkg?.id;
}

function getPackageImageUrl(pkg) {
  return Array.isArray(pkg?.images) && pkg.images.length > 0 ? resolveBackendUrl(pkg.images[0]) : '';
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

function isMultiStopPackage(pkg) {
  return Array.isArray(pkg?.journeyStops) && pkg.journeyStops.length > 1;
}

function getPackageRouteSummary(pkg) {
  if (Array.isArray(pkg?.journeyStops) && pkg.journeyStops.length > 0) {
    return pkg.journeyStops.map((stop) => stop.city).filter(Boolean).join(' -> ');
  }

  return pkg?.destination || 'Route not provided';
}

function matchesPackageCatalogFilter(pkg, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  if (filterValue === 'featured') {
    return Boolean(pkg?.isFeatured);
  }

  if (filterValue === 'multi-stop') {
    return isMultiStopPackage(pkg);
  }

  if (filterValue === 'single-stop') {
    return !isMultiStopPackage(pkg);
  }

  return true;
}

function getPackageCatalogFilterOptions(packages) {
  return PACKAGE_CATALOG_FILTERS.map((option) => ({
    ...option,
    count: packages.filter((pkg) => matchesPackageCatalogFilter(pkg, option.value)).length,
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
  const [activePanel, setActivePanel] = useState('overview');
  const [activeFormSection, setActiveFormSection] = useState('summary');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all');

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
    setActiveFormSection('summary');
  };

  const baselineFeaturedPackages = useMemo(
    () => sortFeaturedPackages(packages),
    [packages]
  );
  const filteredCatalogPackages = useMemo(() => {
    const term = catalogSearchTerm.trim().toLowerCase();

    return packages.filter((pkg) => {
      if (!matchesPackageCatalogFilter(pkg, catalogFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(pkg?.title || '').toLowerCase().includes(term) ||
        String(pkg?.destination || '').toLowerCase().includes(term) ||
        String(pkg?.type || '').toLowerCase().includes(term) ||
        getPackageRouteSummary(pkg).toLowerCase().includes(term)
      );
    });
  }, [catalogFilter, catalogSearchTerm, packages]);
  const hasPackageOrderChanges = packageOrderDraft.map(getPackageId).join(',') !== packages.map(getPackageId).join(',');
  const hasFeaturedOrderChanges = featuredOrderDraft.map(getPackageId).join(',') !== baselineFeaturedPackages.map(getPackageId).join(',');
  const hasOrderChanges = hasPackageOrderChanges || hasFeaturedOrderChanges;
  const packageMetrics = useMemo(() => ([
    {
      label: 'Total Packages',
      value: packages.length,
      hint: 'All public travel packages currently in the catalog.',
      tone: 'default',
    },
    {
      label: 'Featured Packages',
      value: packages.filter((pkg) => pkg.isFeatured).length,
      hint: 'Packages currently highlighted in the homepage featured area.',
      tone: 'accent',
    },
    {
      label: 'Multi-city Routes',
      value: packages.filter((pkg) => isMultiStopPackage(pkg)).length,
      hint: 'Packages already using structured route stops for more complex journeys.',
      tone: 'warm',
    },
    {
      label: 'Order Draft Changes',
      value: hasOrderChanges ? 'Pending' : 'Saved',
      hint: hasOrderChanges
        ? 'There are unsaved ordering changes waiting in the reorder panel.'
        : 'General and featured order are currently in sync.',
      tone: hasOrderChanges ? 'warm' : 'default',
    },
  ]), [hasOrderChanges, packages]);

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

    if (
      !String(formData.title || '').trim() ||
      !String(formData.description || '').trim() ||
      !String(formData.price || '').trim() ||
      !String(formData.destination || '').trim() ||
      !String(formData.duration || '').trim() ||
      !String(formData.type || '').trim()
    ) {
      setFormError('Complete the summary fields before saving the package.');
      setActivePanel('create');
      setActiveFormSection('summary');
      setIsSubmitting(false);
      return;
    }

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
    setActivePanel('create');
    setActiveFormSection('summary');
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

  const currentFormStepIndex = PACKAGE_FORM_SECTIONS.findIndex((section) => section.value === activeFormSection);

  const moveFormSection = (direction) => {
    const targetIndex = currentFormStepIndex + direction;

    if (targetIndex < 0 || targetIndex >= PACKAGE_FORM_SECTIONS.length) {
      return;
    }

    setActiveFormSection(PACKAGE_FORM_SECTIONS[targetIndex].value);
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
    return <div className="p-10 text-center text-sm text-gray-500">Loading packages...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Content"
      title="Packages"
      description="Create, reorder, and review travel packages in separate steps so the workspace stays easier to scan on both desktop and mobile."
      actions={(
        <>
          <Link
            to="/admin/package-bookings"
            className="rounded-full border border-[#101c2d] px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
          >
            Open Package Requests
          </Link>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormSuccess('');
              setActivePanel('create');
            }}
            className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
          >
            {editingId ? 'Start New Package' : 'Create Package'}
          </button>
        </>
      )}
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}
      {formError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{formError}</div>
      )}
      {formSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{formSuccess}</div>
      )}
      {orderError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{orderError}</div>
      )}
      {orderSuccess && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">{orderSuccess}</div>
      )}

      <StaffSectionTabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'create', label: editingId ? 'Edit Package' : 'Create Package' },
          { value: 'reorder', label: 'Reorder' },
          { value: 'catalog', label: 'Catalog', count: packages.length },
        ]}
        value={activePanel}
        onChange={setActivePanel}
      />

      {activePanel === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {packageMetrics.map((metric) => (
              <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
            ))}
          </div>

          <StaffCardSection
            title="Package workspace"
            description="Open only the part of package management you need right now instead of working through one very long page."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Create or edit</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Package details</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Work through summary, route, itinerary, and visibility in smaller steps instead of one long form.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingId) {
                      resetForm();
                    }
                    setActivePanel('create');
                  }}
                  className="mt-5 rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                >
                  Open Package Form
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Public order</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Homepage and catalog order</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Adjust general package order separately from featured order, then save both together only once.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePanel('reorder')}
                  className="mt-5 rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Reorder Panel
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Live catalog</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Review package cards</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Search existing packages, open one for editing, or remove one without hunting through the form area.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePanel('catalog')}
                  className="mt-5 rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Catalog
                </button>
              </article>
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Current public order"
            description="This quick preview shows the packages nearest the top of the public catalog right now."
          >
            {packageOrderDraft.length === 0 ? (
              <StaffEmptyState
                title="No packages yet"
                description="Create the first package to start shaping the public catalog."
                action={(
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActivePanel('create');
                    }}
                    className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Create First Package
                  </button>
                )}
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {packageOrderDraft.slice(0, 4).map((pkg) => (
                  <article key={getPackageId(pkg)} className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#101c2d] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                        Order #{pkg.displayOrder}
                      </span>
                      {pkg.isFeatured && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                          Featured #{pkg.featuredOrder || '-'}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-black text-[#101c2d]">{pkg.title}</h3>
                    <p className="mt-2 text-sm text-[#67707e]">{pkg.destination} | {pkg.duration} | {pkg.type}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5b6472]">Route: {getPackageRouteSummary(pkg)}</p>
                  </article>
                ))}
              </div>
            )}
          </StaffCardSection>
        </>
      )}

      {activePanel === 'create' && (
        <StaffCardSection
          title={editingId ? 'Edit Package' : 'Create Package'}
          description={editingId
            ? 'Update one part of the package at a time so edits stay easier to follow.'
            : 'Build the package in smaller sections so route details, itinerary, and visibility do not pile into one long screen.'}
        >
          <StaffSectionTabs
            tabs={PACKAGE_FORM_SECTIONS}
            value={activeFormSection}
            onChange={setActiveFormSection}
          />

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {activeFormSection === 'summary' && (
              <>
                <section className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                  <h4 className="text-lg font-black text-[#101c2d]">Basic information</h4>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Keep the public package title and description clear so the team and the customer both understand the offer quickly.
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Package title</span>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Premium Umrah Package - December 2026"
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
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
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
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
                      className="h-32 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                      required
                    />
                  </label>
                </section>

                <section className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                  <h4 className="text-lg font-black text-[#101c2d]">Pricing and public summary</h4>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Use a short destination and duration for the public cards, then attach the main image customers will recognize first.
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Price</span>
                      <input
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="1500"
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
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
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
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
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Main image</span>
                      <input
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d]"
                      />
                    </label>
                  </div>

                  {existingImageUrl && (
                    <div className="mt-5 flex items-center gap-4 rounded-[1.25rem] border border-[#ece4d2] bg-white p-4">
                      <img src={existingImageUrl} alt="Current package" className="h-24 w-32 rounded-xl border border-gray-200 object-cover" />
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Current image</div>
                        <p className="mt-2 text-sm text-[#67707e]">Upload a new image only if this package needs a different lead photo.</p>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}

            {activeFormSection === 'route' && (
              <section className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black text-[#101c2d]">Journey route</h4>
                    <p className="mt-2 text-sm leading-6 text-[#67707e]">
                      Add route stops when the journey moves through more than one city, such as Makkah, Madinah, Jeddah, or transit stages.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addJourneyStop}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Add Stop
                  </button>
                </div>

                {journeyStops.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {journeyStops.map((stop, index) => (
                      <div key={stop.id} className="rounded-[1.25rem] border border-[#e5dcc9] bg-white p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <h5 className="text-base font-black text-[#101c2d]">Stop {index + 1}</h5>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => moveJourneyStop(index, -1)}
                              disabled={index === 0}
                              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                            >
                              Move Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveJourneyStop(index, 1)}
                              disabled={index === journeyStops.length - 1}
                              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                            >
                              Move Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeJourneyStop(index)}
                              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            placeholder="City"
                            className="rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                            value={stop.city}
                            onChange={(event) => updateJourneyStop(index, 'city', event.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Stay label, for example 4 Nights"
                            className="rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                            value={stop.stayLabel}
                            onChange={(event) => updateJourneyStop(index, 'stayLabel', event.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Accommodation or hotel"
                            className="rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] md:col-span-2"
                            value={stop.accommodation}
                            onChange={(event) => updateJourneyStop(index, 'accommodation', event.target.value)}
                          />
                          <textarea
                            placeholder="Notes for this stop"
                            className="h-28 rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] md:col-span-2"
                            value={stop.notes}
                            onChange={(event) => updateJourneyStop(index, 'notes', event.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-[#d8cdb7] bg-white p-6 text-sm leading-6 text-[#67707e]">
                    No structured route stops yet. Add stops here when the package includes more than one city or stage.
                  </div>
                )}
              </section>
            )}

            {activeFormSection === 'itinerary' && (
              <section className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black text-[#101c2d]">Day-by-day itinerary</h4>
                    <p className="mt-2 text-sm leading-6 text-[#67707e]">
                      Use structured days for detailed journeys. If you only need one short overview, keep the simple itinerary text instead.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItineraryDay}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Add Day
                  </button>
                </div>

                {itineraryItems.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {itineraryItems.map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleItineraryDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleItineraryDrop(index)}
                        className={`flex items-start gap-3 rounded-[1.25rem] border border-[#e5dcc9] bg-white p-4 ${
                          draggedItineraryIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''
                        }`}
                      >
                        <div className="cursor-move pt-2 text-gray-400" title="Drag to reorder">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <div className="w-full space-y-3">
                          <div className="font-black text-[#101c2d]">Day {item.day}</div>
                          <input
                            type="text"
                            placeholder="Title"
                            className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                            value={item.title}
                            onChange={(event) => updateItineraryDay(index, 'title', event.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Location"
                            className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                            value={item.location}
                            onChange={(event) => updateItineraryDay(index, 'location', event.target.value)}
                          />
                          <textarea
                            placeholder="Activities or description"
                            className="h-28 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                            value={item.description}
                            onChange={(event) => updateItineraryDay(index, 'description', event.target.value)}
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Day image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleItineraryImageUpload(index, event)}
                              className="text-sm"
                              disabled={uploadingItineraryIndex === index}
                            />
                            {uploadingItineraryIndex === index && (
                              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[#101c2d]"></div>
                            )}
                            {item.image && uploadingItineraryIndex !== index && (
                              <img src={resolveBackendUrl(item.image)} alt="Itinerary preview" className="h-10 w-10 rounded-xl border border-gray-200 object-cover" />
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItineraryDay(index)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Remove
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
                    className="mt-5 h-32 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                  />
                )}
              </section>
            )}

            {activeFormSection === 'visibility' && (
              <section className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <h4 className="text-lg font-black text-[#101c2d]">Visibility and homepage promotion</h4>
                <p className="mt-2 text-sm leading-6 text-[#67707e]">
                  Choose whether this package appears in the featured homepage area. Featured order can still be fine-tuned in the reorder panel.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-[1.25rem] border border-[#e5dcc9] bg-white p-4">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <span className="block font-semibold text-[#101c2d]">Show this package in the featured section</span>
                      <span className="mt-1 block text-sm text-[#67707e]">
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
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d]"
                      disabled={!formData.isFeatured}
                    />
                    <span className="mt-2 block text-xs text-gray-500">
                      You can also fine-tune featured order in the reorder panel.
                    </span>
                  </label>
                </div>
              </section>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => moveFormSection(-1)}
                disabled={currentFormStepIndex === 0}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => moveFormSection(1)}
                disabled={currentFormStepIndex === PACKAGE_FORM_SECTIONS.length - 1}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#006837] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#00502a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>}
                {editingId ? 'Save Package' : 'Create Package'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setFormSuccess('');
                  setActivePanel('overview');
                }}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {editingId ? 'Cancel Editing' : 'Close Form'}
              </button>
            </div>
          </form>
        </StaffCardSection>
      )}

      {activePanel === 'reorder' && (
        <StaffCardSection
          title="Public package order"
          description="Move the full package catalog and the homepage featured sequence separately, then save both together once you are happy with the result."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
              <h3 className="text-lg font-black text-[#101c2d]">General package order</h3>
              <p className="mt-2 text-sm leading-6 text-[#67707e]">
                Drag packages to control the order customers see by default. New packages are placed at the end unless you move them.
              </p>
              <div className="mt-5 space-y-3">
                {packageOrderDraft.map((pkg, index) => (
                  <div
                    key={getPackageId(pkg)}
                    draggable
                    onDragStart={() => handlePackageDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handlePackageDrop(index)}
                    className={`flex items-center gap-4 rounded-[1.25rem] border border-[#e5dcc9] bg-white p-4 ${
                      draggedPackageIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''
                    }`}
                  >
                    <div className="cursor-move text-gray-400" title="Drag to reorder">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101c2d] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[#101c2d]">{pkg.title}</p>
                      <p className="text-sm text-[#67707e]">{pkg.destination} | {pkg.duration}</p>
                    </div>
                    {pkg.isFeatured && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                        Featured
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
              <h3 className="text-lg font-black text-[#101c2d]">Featured package order</h3>
              <p className="mt-2 text-sm leading-6 text-[#67707e]">
                Drag only the homepage featured packages here to control their separate sequence.
              </p>
              {featuredOrderDraft.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {featuredOrderDraft.map((pkg, index) => (
                    <div
                      key={getPackageId(pkg)}
                      draggable
                      onDragStart={() => handleFeaturedDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleFeaturedDrop(index)}
                      className={`flex items-center gap-4 rounded-[1.25rem] border border-[#e5dcc9] bg-white p-4 ${
                        draggedFeaturedIndex === index ? 'border-dashed border-gray-400 opacity-50' : ''
                      }`}
                    >
                      <div className="cursor-move text-gray-400" title="Drag to reorder">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8c79a] text-sm font-bold text-[#101c2d]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#101c2d]">{pkg.title}</p>
                        <p className="text-sm text-[#67707e]">General order #{pkg.displayOrder}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.25rem] border border-dashed border-[#d8cdb7] bg-white p-6 text-sm leading-6 text-[#67707e]">
                  No featured packages yet. Mark a package as featured in the form and it will appear here.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={savePackageOrder}
              disabled={isSavingOrder || !hasOrderChanges}
              className="rounded-full bg-[#101c2d] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingOrder ? 'Saving Order...' : 'Save Package Order'}
            </button>
            <button
              type="button"
              onClick={resetOrderDrafts}
              disabled={!hasOrderChanges}
              className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Draft Order
            </button>
            <span className="text-sm text-[#67707e]">
              Save when you are happy with both the general package order and the featured order.
            </span>
          </div>
        </StaffCardSection>
      )}

      {activePanel === 'catalog' && (
        <>
          <StaffCardSection
            title="Find a package"
            description="Search by package title, destination, type, or route and narrow the view before editing."
          >
            <div className="space-y-4">
              <StaffFilterPills
                options={getPackageCatalogFilterOptions(packages)}
                value={catalogFilter}
                onChange={setCatalogFilter}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Search packages</span>
                <input
                  type="text"
                  value={catalogSearchTerm}
                  onChange={(event) => setCatalogSearchTerm(event.target.value)}
                  placeholder="Search by title, destination, type, or route..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Package catalog"
            description="Review the live package summaries here, then jump into editing only when you need to change something."
          >
            {filteredCatalogPackages.length === 0 ? (
              <StaffEmptyState
                title="No packages match this view"
                description="Try another filter or search term, or create the first package to start building the catalog."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {filteredCatalogPackages.map((pkg) => {
                  const imageUrl = getPackageImageUrl(pkg);

                  return (
                    <article key={getPackageId(pkg)} className="overflow-hidden rounded-[1.75rem] border border-[#ebe4d3] bg-white shadow-sm">
                      <div className="flex flex-col gap-5 p-5 sm:flex-row">
                        {imageUrl ? (
                          <div className="overflow-hidden rounded-[1.25rem] border border-[#ece4d2] bg-[#fbfaf7] sm:w-[180px]">
                            <img src={imageUrl} alt={pkg.title} className="h-44 w-full object-cover sm:h-full" />
                          </div>
                        ) : (
                          <div className="flex h-44 items-center justify-center rounded-[1.25rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] text-sm font-semibold text-[#8a7443] sm:w-[180px]">
                            No image yet
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#101c2d]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#101c2d]">
                              Order #{pkg.displayOrder}
                            </span>
                            {pkg.isFeatured && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                                Featured #{pkg.featuredOrder || '-'}
                              </span>
                            )}
                            <span className="rounded-full bg-[#f3efe5] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#7f6a3d]">
                              {pkg.type}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-black text-[#101c2d]">{pkg.title}</h3>
                          <p className="mt-2 text-sm text-[#67707e]">{pkg.destination} | {pkg.duration}</p>
                          <p className="mt-3 text-sm leading-6 text-[#5b6472]">Route: {getPackageRouteSummary(pkg)}</p>
                          <p className="mt-3 text-base font-black text-[#8a7443]">${pkg.price}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 border-t border-[#efe8d8] px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleEdit(pkg)}
                          className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                        >
                          Edit Package
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(getPackageId(pkg))}
                          className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </StaffCardSection>
        </>
      )}
    </StaffPageShell>
  );
};

export default ManagePackages;
