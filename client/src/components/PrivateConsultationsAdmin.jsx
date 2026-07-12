import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getOperationalStatusLabel, getOperationalStatusOptions } from '../lib/operationalPipeline.js';
import { formatDayAge, getAttentionToneClass, getStaffDisplayName, getStaffRoleLabel, isOwnedByCurrentStaff } from '../lib/staffOwnership.js';
import { matchesCreatedAtWindow, STAFF_TIME_WINDOW_OPTIONS } from '../lib/staffFilters.js';
import { formatAdminDate, formatAdminDateTime } from '../lib/staffRequestUtils.js';
import { buildConsultationLeadFollowUpMessage, buildDirectWhatsAppUrl } from '../lib/whatsapp.js';
import {
  StaffCardSection,
  StaffDetailRow,
  StaffDetailSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffInfoPill,
  StaffMetricCard,
  StaffPageShell,
  StaffStatusPill,
} from './staff/WorkspacePrimitives.jsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All requests' },
  { value: 'new', label: 'New requests' },
  { value: 'mine', label: 'My queue' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'follow-up', label: 'Ready for follow-up' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function buildConsultationNextAction(consultation) {
  const status = getOperationalStatusLabel(consultation?.status);

  if (status === 'Cancelled' || status === 'Lost') {
    return 'No more follow-up is needed unless the customer asks to book again.';
  }

  if (status === 'Completed') {
    return 'The consultation is complete. Only after-service or rebooking follow-up remains.';
  }

  if (status === 'Confirmed Offline') {
    return 'Make sure the customer has the confirmed slot details and any preparation notes.';
  }

  if (status === 'WhatsApp Follow-up' || status === 'Contacted') {
    return 'Continue the coordination on WhatsApp and confirm the final date or time if it changed.';
  }

  if (status === 'Qualified') {
    return 'Confirm the customer need, the preferred slot, and who should handle the consultation.';
  }

  return 'Review the request details, contact the customer, and confirm the consultation slot clearly.';
}

function matchesStatusFilter(consultation, statusFilter, currentUserId) {
  const status = getOperationalStatusLabel(consultation?.status);

  if (statusFilter === 'all') {
    return true;
  }

  if (statusFilter === 'new') {
    return status === 'New';
  }

  if (statusFilter === 'mine') {
    return isOwnedByCurrentStaff(consultation, currentUserId);
  }

  if (statusFilter === 'unassigned') {
    return Boolean(consultation?.isUnassigned);
  }

  if (statusFilter === 'overdue') {
    return Boolean(consultation?.isOverdueFollowUp);
  }

  if (statusFilter === 'follow-up') {
    return ['Contacted', 'Qualified', 'WhatsApp Follow-up', 'Docs Received'].includes(status);
  }

  if (statusFilter === 'confirmed') {
    return status === 'Confirmed Offline';
  }

  if (statusFilter === 'completed') {
    return status === 'Completed';
  }

  if (statusFilter === 'closed') {
    return ['Cancelled', 'Lost'].includes(status);
  }

  return true;
}

function getStatusFilterOptions(consultations, currentUserId) {
  return STATUS_FILTERS.map((option) => ({
    ...option,
    count: consultations.filter((consultation) => matchesStatusFilter(consultation, option.value, currentUserId)).length,
  }));
}

const EMPTY_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  date: '',
  time: '',
  description: '',
  status: 'New',
  adminNotes: '',
  assignedStaffId: '',
};

const PrivateConsultationsAdmin = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('30d');
  const [selectedConsultationId, setSelectedConsultationId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const currentUserId = Number(user?.id || 0);

  const fetchConsultations = useCallback(async () => {
    try {
      const response = await axios.get('/appointments/private');
      setConsultations(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load consultation requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  useEffect(() => {
    if (!isAdmin) {
      setStaffDirectory([]);
      return;
    }

    const fetchStaffDirectory = async () => {
      try {
        const response = await axios.get('/admin/staff-directory');
        setStaffDirectory(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to load staff directory', err);
      }
    };

    fetchStaffDirectory();
  }, [isAdmin]);

  useEffect(() => {
    if (!consultations.length) {
      setSelectedConsultationId(null);
      return;
    }

    const selectedExists = consultations.some((consultation) => consultation.id === selectedConsultationId);
    if (!selectedExists) {
      setSelectedConsultationId(consultations[0].id);
    }
  }, [consultations, selectedConsultationId]);

  const resetForm = () => {
    setFormData(EMPTY_FORM_DATA);
    setEditingId(null);
    setShowForm(false);
    setSubmitting(false);
  };

  const handleEdit = (consultation) => {
    setFormData({
      name: consultation.name || '',
      email: consultation.email || '',
      phone: consultation.phone || '',
      date: consultation.date || '',
      time: consultation.time || '',
      description: consultation.description || '',
      status: getOperationalStatusLabel(consultation.status),
      adminNotes: consultation.adminNotes || '',
      assignedStaffId: consultation.assignedStaff?.id ? String(consultation.assignedStaff.id) : '',
    });
    setEditingId(consultation.id);
    setShowForm(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingId) {
        const updatePayload = {
          ...formData,
        };

        if (!isAdmin) {
          delete updatePayload.assignedStaffId;
        }

        await axios.put(`/appointments/private/${editingId}`, updatePayload);
        setMessage({ type: 'success', text: 'Consultation request updated successfully.' });
      } else {
        const createPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          time: formData.time,
          description: formData.description,
          status: formData.status,
        };
        if (isAdmin) {
          createPayload.assignedStaffId = formData.assignedStaffId;
        }
        const createResponse = await axios.post('/appointments/private', createPayload);
        const createdConsultationId = createResponse.data?.id;

        if (createdConsultationId && (formData.adminNotes.trim() || getOperationalStatusLabel(formData.status) !== 'New' || (isAdmin && formData.assignedStaffId !== ''))) {
          const followUpPayload = {
            status: formData.status,
            adminNotes: formData.adminNotes,
          };
          if (isAdmin) {
            followUpPayload.assignedStaffId = formData.assignedStaffId;
          }
          await axios.put(`/appointments/private/${createdConsultationId}`, {
            ...followUpPayload,
          });
        }

        setMessage({ type: 'success', text: 'Consultation request created successfully.' });
      }

      setError(null);
      await fetchConsultations();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save consultation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignToMe = async (consultation) => {
    setAssigningId(consultation.id);
    setMessage(null);

    try {
      await axios.put(`/appointments/private/${consultation.id}`, { assignedStaffId: currentUserId });
      setError(null);
      setMessage({
        type: 'success',
        text: `Consultation request #${consultation.requestId || consultation.id} is now assigned to you.`,
      });
      await fetchConsultations();
      setSelectedConsultationId(consultation.id);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to assign this consultation request.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this consultation request?')) {
      return;
    }

    try {
      await axios.delete(`/appointments/private/${id}`);
      setMessage({ type: 'success', text: 'Consultation request deleted successfully.' });
      setError(null);
      await fetchConsultations();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete consultation request.');
    }
  };

  const openWhatsApp = (consultation) => {
    const url = buildDirectWhatsAppUrl(
      consultation.phone,
      buildConsultationLeadFollowUpMessage({
        contactName: consultation.name,
        requestId: consultation.requestId || consultation.id,
        status: getOperationalStatusLabel(consultation.status),
        date: consultation.date,
        time: consultation.time,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredConsultations = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return consultations.filter((consultation) => (
      matchesStatusFilter(consultation, statusFilter, currentUserId) &&
      matchesCreatedAtWindow(consultation, timeWindow) &&
      (
        !term ||
        String(consultation.requestId || consultation.id).includes(term) ||
        String(consultation.name || '').toLowerCase().includes(term) ||
        String(consultation.email || '').toLowerCase().includes(term) ||
        String(consultation.phone || '').toLowerCase().includes(term)
      )
    ));
  }, [consultations, currentUserId, searchTerm, statusFilter, timeWindow]);

  const selectedConsultation = filteredConsultations.find((consultation) => consultation.id === selectedConsultationId)
    || filteredConsultations[0]
    || consultations.find((consultation) => consultation.id === selectedConsultationId)
    || consultations[0]
    || null;

  const metrics = [
    {
      label: 'New Requests',
      value: consultations.filter((consultation) => getOperationalStatusLabel(consultation.status) === 'New').length,
      hint: 'Consultations that still need the first confirmation response.',
      tone: 'default',
    },
    {
      label: 'My Queue',
      value: consultations.filter((consultation) => isOwnedByCurrentStaff(consultation, currentUserId)).length,
      hint: 'Consultation requests currently assigned to your staff account.',
      tone: 'warm',
    },
    {
      label: 'Overdue Follow-Up',
      value: consultations.filter((consultation) => consultation.isOverdueFollowUp).length,
      hint: 'Requests that need another team touch soonest.',
      tone: 'danger',
    },
    {
      label: 'Unassigned',
      value: consultations.filter((consultation) => consultation.isUnassigned).length,
      hint: 'Open consultations that still need a clear owner.',
      tone: 'accent',
    },
  ];

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading consultation requests...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Follow-Up Queue"
      title="Consultations"
      description="Manage private consultation requests with clearer slot details, fewer table-heavy screens, and faster access to the next action."
      actions={(
        <button
          type="button"
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
              return;
            }

            setShowForm(true);
            setEditingId(null);
            setFormData(EMPTY_FORM_DATA);
            setMessage(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="rounded-full bg-[#006837] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#00512b]"
        >
          {showForm && !editingId ? 'Close Form' : 'Add Consultation'}
        </button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      </div>

      {showForm && (
        <StaffCardSection
          title={editingId ? `Update Consultation Request #${editingId}` : 'Create Consultation Request'}
          description="Keep the form focused on what staff actually need. Optional internal follow-up notes stay separate from the customer booking details."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Customer name</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Customer email</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Phone / WhatsApp</span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Preferred date</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Preferred time</span>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(event) => setFormData({ ...formData, time: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Consultation summary</span>
              <textarea
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                required
                placeholder="What kind of help does the customer want from the consultation?"
                className="h-28 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>

            <div className={`grid gap-4 ${isAdmin ? 'xl:grid-cols-[220px_220px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Request status</span>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                >
                  {getOperationalStatusOptions(formData.status).map((statusOption) => (
                    <option key={statusOption} value={statusOption}>{statusOption}</option>
                  ))}
                </select>
              </label>
              {isAdmin && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Request owner</span>
                  <select
                    value={formData.assignedStaffId}
                    onChange={(event) => setFormData({ ...formData, assignedStaffId: event.target.value })}
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  >
                    <option value="">Keep unassigned</option>
                    {staffDirectory.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.name || staffMember.email} ({getStaffRoleLabel(staffMember.role)})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Team notes</span>
                <textarea
                  value={formData.adminNotes}
                  onChange={(event) => setFormData({ ...formData, adminNotes: event.target.value })}
                  placeholder="Internal notes for follow-up, reassignment, or special preparation."
                  className="h-28 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving...' : editingId ? 'Save Request Update' : 'Create Request'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </StaffCardSection>
      )}

      <StaffCardSection title="Filter and Search" description="Switch between quick queues first, then narrow by age or customer detail.">
        <div className="space-y-4">
          <StaffFilterPills
            options={getStatusFilterOptions(consultations, currentUserId)}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Request age</span>
              <select
                value={timeWindow}
                onChange={(event) => setTimeWindow(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              >
                {STAFF_TIME_WINDOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Search</span>
              <input
                type="text"
                placeholder="Search by customer, email, phone, or request ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
          </div>
        </div>
      </StaffCardSection>

      {filteredConsultations.length === 0 ? (
        <StaffEmptyState
          title="No consultation requests match this view"
          description="Try another queue filter, widen the date range, or search with a different customer detail."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-4">
            {filteredConsultations.map((consultation) => {
              const isSelected = selectedConsultation?.id === consultation.id;

              return (
                <button
                  key={consultation.id}
                  type="button"
                  onClick={() => setSelectedConsultationId(consultation.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${isSelected ? 'border-[#101c2d] bg-[#101c2d] text-white shadow-lg' : 'border-[#ebe4d3] bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-black uppercase tracking-[0.22em] ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Request #{consultation.requestId || consultation.id}
                      </div>
                      <h3 className={`mt-2 text-xl font-black ${isSelected ? 'text-white' : 'text-[#101c2d]'}`}>
                        {consultation.name}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StaffStatusPill status={consultation.status} />
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Received {formatAdminDate(consultation.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 grid gap-3 md:grid-cols-2 ${isSelected ? 'text-white/90' : 'text-[#4f5763]'}`}>
                    <div>
                      <div className="text-sm font-bold">{consultation.email}</div>
                      <div className="mt-1 text-sm">{consultation.phone}</div>
                      {!consultation.userId && <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em]">Guest request</div>}
                      <div className="mt-2 text-xs uppercase tracking-[0.18em]">
                        Owner {getStaffDisplayName(consultation.assignedStaff, 'Unassigned')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>Date: {consultation.date || 'TBD'}</div>
                      <div className="mt-1">Time: {consultation.time || 'TBD'}</div>
                      <div className="mt-1">Last action: {formatAdminDateTime(consultation.lastActionAt, 'Not recorded')}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {consultation.isUnassigned ? 'Unassigned' : `${getStaffRoleLabel(consultation.assignedStaff?.role)} owner`}
                    </span>
                    {consultation.isOverdueFollowUp && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/20 text-white' : getAttentionToneClass('high')}`}>
                        Overdue {formatDayAge(consultation.daysSinceLastFollowUp, 'Today')}
                      </span>
                    )}
                  </div>

                  {consultation.description && (
                    <p className={`mt-4 text-sm ${isSelected ? 'text-white/85' : 'text-[#67707e]'}`}>
                      {consultation.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedConsultation && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <StaffDetailSection
                title={`Request #${selectedConsultation.requestId || selectedConsultation.id}`}
                description={buildConsultationNextAction(selectedConsultation)}
              >
                <div className="flex flex-wrap gap-3">
                  <StaffStatusPill status={selectedConsultation.status} />
                  <StaffInfoPill tone={selectedConsultation.isUnassigned ? 'danger' : isOwnedByCurrentStaff(selectedConsultation, currentUserId) ? 'accent' : 'info'}>
                    Owner {getStaffDisplayName(selectedConsultation.assignedStaff, 'Unassigned')}
                  </StaffInfoPill>
                  {selectedConsultation.isOverdueFollowUp && (
                    <StaffInfoPill tone="danger">
                      Overdue {formatDayAge(selectedConsultation.daysSinceLastFollowUp, 'Today')}
                    </StaffInfoPill>
                  )}
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Received {formatAdminDate(selectedConsultation.createdAt)}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last contact {formatAdminDateTime(selectedConsultation.lastContactedAt, 'not recorded')}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last action {formatAdminDateTime(selectedConsultation.lastActionAt, 'not recorded')}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedConsultation)}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Update Request
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(selectedConsultation)}
                    className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Continue on WhatsApp
                  </button>
                  {!isOwnedByCurrentStaff(selectedConsultation, currentUserId) && (
                    <button
                      type="button"
                      onClick={() => handleAssignToMe(selectedConsultation)}
                      disabled={assigningId === selectedConsultation.id}
                      className="rounded-full border border-[#006837] px-4 py-2 text-sm font-bold text-[#006837] transition hover:bg-[#006837] hover:text-white disabled:opacity-60"
                    >
                      {assigningId === selectedConsultation.id ? 'Assigning...' : 'Take Ownership'}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedConsultation.id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Delete Request
                    </button>
                  )}
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Customer Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Name" value={selectedConsultation.name} />
                  <StaffDetailRow label="Account type" value={selectedConsultation.userId ? 'Account Holder' : 'Guest'} />
                  <StaffDetailRow label="Email" value={selectedConsultation.email} />
                  <StaffDetailRow label="Phone / WhatsApp" value={selectedConsultation.phone} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Ownership and Accountability">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow
                    label="Request owner"
                    value={`${getStaffDisplayName(selectedConsultation.assignedStaff, 'Unassigned')}${selectedConsultation.assignedStaff ? ` (${getStaffRoleLabel(selectedConsultation.assignedStaff.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Assigned on" value={formatAdminDateTime(selectedConsultation.assignedAt, 'Not assigned yet')} />
                  <StaffDetailRow
                    label="Last updated by"
                    value={`${getStaffDisplayName(selectedConsultation.lastUpdatedBy, 'Not recorded')}${selectedConsultation.lastUpdatedBy ? ` (${getStaffRoleLabel(selectedConsultation.lastUpdatedBy.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Last action time" value={formatAdminDateTime(selectedConsultation.lastActionAt, 'Not recorded')} />
                  <StaffDetailRow label="Last status change" value={formatAdminDateTime(selectedConsultation.lastStatusChangedAt, 'Not recorded')} />
                  <StaffDetailRow
                    label="Attention flags"
                    value={selectedConsultation.attentionReasons?.length ? selectedConsultation.attentionReasons.join(', ') : 'No special attention flag right now.'}
                    subtle
                  />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Preferred Slot">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Preferred date" value={selectedConsultation.date || 'TBD'} />
                  <StaffDetailRow label="Preferred time" value={selectedConsultation.time || 'TBD'} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Consultation Summary">
                <div className="space-y-3">
                  <StaffDetailRow label="Customer request" value={selectedConsultation.description || 'No description provided.'} subtle />
                  <StaffDetailRow label="Internal notes" value={selectedConsultation.adminNotes || 'No internal notes yet.'} subtle />
                </div>
              </StaffDetailSection>
            </div>
          )}
        </div>
      )}
    </StaffPageShell>
  );
};

export default PrivateConsultationsAdmin;
