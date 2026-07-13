import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../lib/api';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffMetricCard,
  StaffPageShell,
  StaffSectionTabs,
} from './staff/WorkspacePrimitives.jsx';

const SERVICE_FILTERS = [
  { value: 'all', label: 'All services' },
  { value: 'icon-ready', label: 'Icon ready' },
  { value: 'needs-icon', label: 'Needs icon' },
];

function hasIcon(service) {
  return Boolean(String(service?.icon || '').trim());
}

function matchesServiceFilter(service, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  if (filterValue === 'icon-ready') {
    return hasIcon(service);
  }

  if (filterValue === 'needs-icon') {
    return !hasIcon(service);
  }

  return true;
}

function getServiceFilterOptions(services) {
  return SERVICE_FILTERS.map((option) => ({
    ...option,
    count: services.filter((service) => matchesServiceFilter(service, option.value)).length,
  }));
}

function reorderServices(services, startIndex, endIndex) {
  const updated = [...services];
  const [movedService] = updated.splice(startIndex, 1);
  updated.splice(endIndex, 0, movedService);
  return updated;
}

const defaultFormData = {
  title: '',
  description: '',
  icon: '',
};

const ManageServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [reorderingId, setReorderingId] = useState(null);
  const [activePanel, setActivePanel] = useState('overview');

  const fetchServices = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get('/services');
      setServices(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return services.filter((service) => {
      if (!matchesServiceFilter(service, serviceFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(service.title || '').toLowerCase().includes(term) ||
        String(service.description || '').toLowerCase().includes(term) ||
        String(service.icon || '').toLowerCase().includes(term)
      );
    });
  }, [searchTerm, serviceFilter, services]);

  const metrics = [
    {
      label: 'Total Services',
      value: services.length,
      hint: 'These power the public service cards and related request forms.',
      tone: 'default',
    },
    {
      label: 'Icon Ready',
      value: services.filter((service) => hasIcon(service)).length,
      hint: 'Services that already have an icon label and feel more complete in the public UI.',
      tone: 'accent',
    },
    {
      label: 'Needs Icon Polish',
      value: services.filter((service) => !hasIcon(service)).length,
      hint: 'Service cards without icon naming are easier to miss during quick browsing.',
      tone: 'warm',
    },
    {
      label: 'Public Order',
      value: services.length ? `1-${services.length}` : '0',
      hint: 'The order shown below is the same order customers see on the public website.',
      tone: 'default',
    },
  ];

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingServiceId(null);
    setShowForm(false);
    setSubmitting(false);
  };

  const openCreatePanel = () => {
    setFormData(defaultFormData);
    setEditingServiceId(null);
    setShowForm(true);
    setActivePanel('edit');
    setError(null);
    setMessage(null);
  };

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingServiceId) {
        await axios.put(`/services/${editingServiceId}`, formData);
        setMessage({ type: 'success', text: 'Service updated successfully.' });
      } else {
        await axios.post('/services', formData);
        setMessage({ type: 'success', text: 'Service created successfully.' });
      }

      await fetchServices();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save service.');
      setSubmitting(false);
    }
  };

  const handleEdit = (service) => {
    setFormData({
      title: service.title || '',
      description: service.description || '',
      icon: service.icon || '',
    });
    setEditingServiceId(service.id);
    setShowForm(true);
    setActivePanel('edit');
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      await axios.delete(`/services/${serviceId}`);
      setServices((currentServices) => currentServices.filter((service) => service.id !== serviceId));
      setMessage({ type: 'success', text: 'Service deleted successfully.' });
      setError(null);

      if (editingServiceId === serviceId) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete service.');
    }
  };

  const handleMove = async (serviceId, direction) => {
    const currentIndex = services.findIndex((service) => service.id === serviceId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= services.length) {
      return;
    }

    const reorderedServices = reorderServices(services, currentIndex, targetIndex);
    const orderedIds = reorderedServices.map((service) => service.id);

    setReorderingId(serviceId);
    setServices(reorderedServices);
    setError(null);

    try {
      await axios.put('/services/reorder', { orderedIds });
      setMessage({ type: 'success', text: 'Service order updated.' });
    } catch (err) {
      setServices(services);
      setError(err.response?.data?.msg || err.message || 'Failed to reorder services.');
    } finally {
      setReorderingId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading services...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Content"
      title="Services"
      description="Manage public service cards in smaller work areas so writing, order, and review do not compete on one long page."
      actions={(
        <>
          <Link
            to="/admin/service-inquiries"
            className="rounded-full border border-[#101c2d] px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
          >
            Open Service Requests
          </Link>
          <button
            type="button"
            onClick={openCreatePanel}
            className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
          >
            {editingServiceId ? 'Start New Service' : 'Add Service'}
          </button>
        </>
      )}
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className={`rounded-2xl px-5 py-4 text-sm ${message.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <StaffSectionTabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'edit', label: editingServiceId ? 'Edit Service' : 'Add Service' },
          { value: 'catalog', label: 'Catalog', count: services.length },
        ]}
        value={activePanel}
        onChange={setActivePanel}
      />

      {activePanel === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
            ))}
          </div>

          <StaffCardSection
            title="Service workspace"
            description="Keep service writing, public order, and request follow-up in separate steps so the page stays cleaner."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Writing</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Create or edit</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Refine title, description, and icon wording without mixing that work into catalog browsing.
                </p>
                <button
                  type="button"
                  onClick={openCreatePanel}
                  className="mt-5 rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                >
                  Open Service Form
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Catalog</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Review public order</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Search the live catalog, then move services earlier or later only when business priorities change.
                </p>
                <button
                  type="button"
                  onClick={() => setActivePanel('catalog')}
                  className="mt-5 rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Catalog
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Follow-up</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Related requests</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Open the service request queue when customers need visa, passport, or document help linked to these services.
                </p>
                <Link
                  to="/admin/service-inquiries"
                  className="mt-5 inline-flex rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Requests
                </Link>
              </article>
            </div>
          </StaffCardSection>
        </>
      )}

      {activePanel === 'edit' && showForm && (
        <StaffCardSection
          title={editingServiceId ? 'Edit Service' : 'Create Service'}
          description={editingServiceId
            ? 'Refine the public service wording or icon naming without disturbing the rest of the workspace.'
            : 'Create the service cards customers can browse before submitting a request.'}
        >
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Service title</span>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Visa Assistance"
                required
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Icon label</span>
              <input
                type="text"
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                placeholder="Passport, Plane, Shield"
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Explain what help the customer will receive and why it matters."
                required
                className="h-32 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>

            <div className="lg:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving...' : editingServiceId ? 'Save Service Changes' : 'Create Service'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActivePanel('overview');
                }}
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </StaffCardSection>
      )}

      {activePanel === 'edit' && !showForm && (
        <StaffEmptyState
          title="No service form open"
          description="Start a new service or select one from the catalog when you want to edit it."
          action={(
            <button
              type="button"
              onClick={openCreatePanel}
              className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
            >
              Add Service
            </button>
          )}
        />
      )}

      {activePanel === 'catalog' && (
        <>
          <StaffCardSection
            title="Filter and Search"
            description="Use quick filters to spot services that still need icon polish or to find a service quickly before editing."
          >
            <div className="space-y-4">
              <StaffFilterPills
                options={getServiceFilterOptions(services)}
                value={serviceFilter}
                onChange={setServiceFilter}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Search services</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by service title, description, or icon..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Service Catalog"
            description="The order shown here is the public order customers see. Move services earlier or later when business priorities change."
          >
            {filteredServices.length === 0 ? (
              <StaffEmptyState
                title="No services match this view"
                description="Try another filter or search term, or add the first service to start filling the public catalog."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredServices.map((service) => {
                  const serviceIndex = services.findIndex((entry) => entry.id === service.id);
                  const isFirst = serviceIndex === 0;
                  const isLast = serviceIndex === services.length - 1;

                  return (
                    <article key={service.id} className="rounded-[1.5rem] border border-[#ebe4d3] bg-[#fcfbf8] p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7443]">
                            Order #{serviceIndex + 1}
                          </div>
                          <h3 className="mt-2 text-xl font-black text-[#101c2d]">{service.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${hasIcon(service) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {hasIcon(service) ? `Icon: ${service.icon}` : 'Icon still needed'}
                          </span>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[#5b6472]">
                        {service.description}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(service)}
                          className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service.id)}
                          className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(service.id, 'up')}
                          disabled={isFirst || reorderingId === service.id}
                          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Move Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(service.id, 'down')}
                          disabled={isLast || reorderingId === service.id}
                          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Move Down
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

export default ManageServices;
