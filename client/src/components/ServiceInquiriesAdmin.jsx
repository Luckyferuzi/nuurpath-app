import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getOperationalStatusLabel, getOperationalStatusOptions } from '../lib/operationalPipeline.js';
import { formatDayAge, getAttentionToneClass, getStaffDisplayName, getStaffRoleLabel, isOwnedByCurrentStaff } from '../lib/staffOwnership.js';
import { matchesCreatedAtWindow, STAFF_TIME_WINDOW_OPTIONS } from '../lib/staffFilters.js';
import { formatAdminDate, formatAdminDateTime } from '../lib/staffRequestUtils.js';
import { buildDirectWhatsAppUrl, buildServiceLeadFollowUpMessage } from '../lib/whatsapp.js';
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
  { value: 'urgent', label: 'Urgent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'documents', label: 'Waiting for documents' },
  { value: 'follow-up', label: 'Ready for follow-up' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function truncateText(value, maxLength = 180) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getPriorityToneClass(priorityLabel) {
  const priority = String(priorityLabel || '').toLowerCase();

  if (priority === 'high') {
    return 'bg-red-100 text-red-700';
  }

  if (priority === 'medium' || priority === 'normal') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-gray-100 text-gray-700';
}

function getDocumentToneClass(documentText) {
  const value = String(documentText || '').toLowerCase();

  if (value.includes('ready') || value.includes('complete')) {
    return 'bg-green-100 text-green-700';
  }

  if (value.includes('missing') || value.includes('need') || value.includes('expired')) {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-gray-100 text-gray-700';
}

function requiresDocumentFollowUp(inquiry) {
  const status = getOperationalStatusLabel(inquiry?.status);
  const documentText = String(inquiry?.documentReadiness || inquiry?.documentStatus || '').toLowerCase();

  if (status === 'Docs Requested') {
    return true;
  }

  return documentText.includes('missing') || documentText.includes('need') || documentText.includes('expired');
}

function matchesStatusFilter(inquiry, statusFilter, currentUserId) {
  const status = getOperationalStatusLabel(inquiry?.status);

  if (statusFilter === 'all') {
    return true;
  }

  if (statusFilter === 'new') {
    return status === 'New';
  }

  if (statusFilter === 'mine') {
    return isOwnedByCurrentStaff(inquiry, currentUserId);
  }

  if (statusFilter === 'unassigned') {
    return Boolean(inquiry?.isUnassigned);
  }

  if (statusFilter === 'urgent') {
    return String(inquiry?.priorityLabel || '').toLowerCase() === 'high';
  }

  if (statusFilter === 'overdue') {
    return Boolean(inquiry?.isOverdueFollowUp);
  }

  if (statusFilter === 'documents') {
    return requiresDocumentFollowUp(inquiry);
  }

  if (statusFilter === 'follow-up') {
    return ['Contacted', 'Qualified', 'Docs Received', 'Quoted', 'WhatsApp Follow-up'].includes(status);
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

function getStatusFilterOptions(inquiries, currentUserId) {
  return STATUS_FILTERS.map((option) => ({
    ...option,
    count: inquiries.filter((inquiry) => matchesStatusFilter(inquiry, option.value, currentUserId)).length,
  }));
}

const ServiceInquiriesAdmin = () => {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('30d');
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [formData, setFormData] = useState({
    status: 'New',
    adminNotes: '',
    assignedStaffId: '',
  });
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const currentUserId = Number(user?.id || 0);

  const fetchInquiries = useCallback(async () => {
    try {
      const response = await axios.get('/services/inquiries');
      setInquiries(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load service inquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

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
    if (!inquiries.length) {
      setSelectedInquiryId(null);
      return;
    }

    const selectedExists = inquiries.some((inquiry) => inquiry.id === selectedInquiryId);
    if (!selectedExists) {
      setSelectedInquiryId(inquiries[0].id);
    }
  }, [inquiries, selectedInquiryId]);

  const handleEdit = (inquiry) => {
    setEditingInquiry(inquiry);
    setFormData({
      status: getOperationalStatusLabel(inquiry.status),
      adminNotes: inquiry.adminNotes || '',
      assignedStaffId: inquiry.assignedStaff?.id ? String(inquiry.assignedStaff.id) : '',
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingInquiry(null);
    setFormData({ status: 'New', adminNotes: '', assignedStaffId: '' });
    setSaving(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingInquiry) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
      };

      if (!isAdmin) {
        delete payload.assignedStaffId;
      }

      const response = await axios.put(`/services/inquiries/${editingInquiry.id}`, payload);
      const updatedInquiry = response.data;

      setInquiries((previous) => previous.map((inquiry) => (
        inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry
      )));
      setSelectedInquiryId(updatedInquiry.id);
      setError(null);
      setMessage({
        type: 'success',
        text: `Service request #${updatedInquiry.inquiryId || updatedInquiry.id} updated successfully.`,
      });
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update service inquiry.');
      setSaving(false);
    }
  };

  const handleAssignToMe = async (inquiry) => {
    setAssigningId(inquiry.id);
    setMessage(null);

    try {
      const response = await axios.put(`/services/inquiries/${inquiry.id}`, { assignedStaffId: currentUserId });
      const updatedInquiry = response.data;
      setInquiries((previous) => previous.map((currentInquiry) => (
        currentInquiry.id === updatedInquiry.id ? updatedInquiry : currentInquiry
      )));
      setSelectedInquiryId(updatedInquiry.id);
      setError(null);
      setMessage({
        type: 'success',
        text: `Service request #${updatedInquiry.inquiryId || updatedInquiry.id} is now assigned to you.`,
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to assign this service request.');
    } finally {
      setAssigningId(null);
    }
  };

  const openWhatsApp = (inquiry) => {
    const url = buildDirectWhatsAppUrl(
      inquiry.contactPhone,
      buildServiceLeadFollowUpMessage({
        contactName: inquiry.contactName,
        requestId: inquiry.inquiryId || inquiry.id,
        status: getOperationalStatusLabel(inquiry.status),
        serviceTitle: inquiry.serviceTitle || inquiry.serviceType,
        country: inquiry.country,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportCSV = () => {
    if (inquiries.length === 0) {
      window.alert('No service requests to export.');
      return;
    }

    const headers = [
      'ID',
      'Contact Name',
      'Email',
      'Phone',
      'Service',
      'Focus',
      'Country',
      'Preferred Date',
      'Applicants',
      'Priority',
      'Document Status',
      'Request Status',
      'Owner',
      'Last Updated By',
      'Last Action',
      'Overdue Follow-Up',
      'Customer Message',
      'Internal Notes',
      'Request Date',
    ];

    const csvContent = [
      headers.join(','),
      ...inquiries.map((inquiry) => {
        const name = String(inquiry.contactName || '').replace(/"/g, '""');
        const serviceTitle = String(inquiry.serviceTitle || inquiry.serviceType || '').replace(/"/g, '""');
        const requestFocus = String(inquiry.requestFocus || '').replace(/"/g, '""');
        const customerMessage = String(inquiry.customerMessage || '').replace(/"/g, '""');
        const adminNotes = String(inquiry.adminNotes || '').replace(/"/g, '""');
        const documentStatus = String(inquiry.documentStatus || inquiry.documentReadiness || '').replace(/"/g, '""');
        const owner = String(getStaffDisplayName(inquiry.assignedStaff, 'Unassigned')).replace(/"/g, '""');
        const lastUpdatedBy = String(getStaffDisplayName(inquiry.lastUpdatedBy, 'Not recorded')).replace(/"/g, '""');

        return [
          inquiry.inquiryId || inquiry.id,
          `"${name}"`,
          inquiry.contactEmail || '',
          inquiry.contactPhone || '',
          `"${serviceTitle}"`,
          `"${requestFocus}"`,
          `"${String(inquiry.country || '').replace(/"/g, '""')}"`,
          formatAdminDate(inquiry.preferredDate, ''),
          inquiry.applicants || '',
          inquiry.priorityLabel || '',
          `"${documentStatus}"`,
          `"${getOperationalStatusLabel(inquiry.status)}"`,
          `"${owner}"`,
          `"${lastUpdatedBy}"`,
          formatAdminDateTime(inquiry.lastActionAt, ''),
          inquiry.isOverdueFollowUp ? 'Yes' : 'No',
          `"${customerMessage}"`,
          `"${adminNotes}"`,
          formatAdminDate(inquiry.createdAt, ''),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service_requests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInquiries = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return inquiries.filter((inquiry) => (
      matchesStatusFilter(inquiry, statusFilter, currentUserId) &&
      matchesCreatedAtWindow(inquiry, timeWindow) &&
      (
        !term ||
        String(inquiry.inquiryId || inquiry.id).includes(term) ||
        String(inquiry.contactName || '').toLowerCase().includes(term) ||
        String(inquiry.contactEmail || '').toLowerCase().includes(term) ||
        String(inquiry.serviceTitle || inquiry.serviceType || '').toLowerCase().includes(term) ||
        String(inquiry.country || '').toLowerCase().includes(term)
      )
    ));
  }, [currentUserId, inquiries, searchTerm, statusFilter, timeWindow]);

  const selectedInquiry = filteredInquiries.find((inquiry) => inquiry.id === selectedInquiryId)
    || filteredInquiries[0]
    || inquiries.find((inquiry) => inquiry.id === selectedInquiryId)
    || inquiries[0]
    || null;

  const metrics = [
    {
      label: 'Urgent Requests',
      value: inquiries.filter((inquiry) => String(inquiry.priorityLabel || '').toLowerCase() === 'high').length,
      hint: 'Requests that sound time-sensitive and should be answered quickly.',
      tone: 'danger',
    },
    {
      label: 'My Queue',
      value: inquiries.filter((inquiry) => isOwnedByCurrentStaff(inquiry, currentUserId)).length,
      hint: 'Service requests currently assigned to your staff account.',
      tone: 'warm',
    },
    {
      label: 'Overdue Follow-Up',
      value: inquiries.filter((inquiry) => inquiry.isOverdueFollowUp).length,
      hint: 'Requests that need the next staff reply or document chase urgently.',
      tone: 'accent',
    },
    {
      label: 'Document Chase',
      value: inquiries.filter((inquiry) => requiresDocumentFollowUp(inquiry)).length,
      hint: 'Requests still waiting on missing, renewed, or incomplete documents.',
      tone: 'default',
    },
  ];

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading service requests...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Follow-Up Queue"
      title="Service Requests"
      description="See urgency, document readiness, and customer notes in one place so support requests are easier to act on."
      actions={(
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-full border border-[#101c2d] px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
        >
          Export Requests
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

      {editingInquiry && (
        <StaffCardSection
          title={`Update Service Request #${editingInquiry.inquiryId || editingInquiry.id}`}
          description={`${editingInquiry.serviceTitle || editingInquiry.serviceType} for ${editingInquiry.contactName}`}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder="Record what was requested, what documents are missing, or the next promise to the customer."
                  className="h-28 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Request Update'}
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

      <StaffCardSection title="Filter and Search" description="Switch between urgent, document, and follow-up queues before narrowing by time or search.">
        <div className="space-y-4">
          <StaffFilterPills
            options={getStatusFilterOptions(inquiries, currentUserId)}
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
                placeholder="Search by customer, email, country, service, or request ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
          </div>
        </div>
      </StaffCardSection>

      {filteredInquiries.length === 0 ? (
        <StaffEmptyState
          title="No service requests match this view"
          description="Try a different queue filter, widen the date range, or search with another customer or service detail."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => {
              const isSelected = selectedInquiry?.id === inquiry.id;

              return (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${isSelected ? 'border-[#101c2d] bg-[#101c2d] text-white shadow-lg' : 'border-[#ebe4d3] bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-black uppercase tracking-[0.22em] ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Request #{inquiry.inquiryId || inquiry.id}
                      </div>
                      <h3 className={`mt-2 text-xl font-black ${isSelected ? 'text-white' : 'text-[#101c2d]'}`}>
                        {inquiry.serviceTitle || inquiry.serviceType}
                      </h3>
                      <div className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-[#67707e]'}`}>
                        {inquiry.requestFocus || 'Service support'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StaffStatusPill status={inquiry.status} />
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Received {formatAdminDate(inquiry.createdAt, 'Recently')}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 grid gap-3 md:grid-cols-2 ${isSelected ? 'text-white/90' : 'text-[#4f5763]'}`}>
                    <div>
                      <div className="text-sm font-bold">{inquiry.contactName}</div>
                      <div className="mt-1 text-sm">{inquiry.contactEmail}</div>
                      <div className="mt-1 text-sm">{inquiry.contactPhone || 'No phone provided'}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em]">
                        Owner {getStaffDisplayName(inquiry.assignedStaff, 'Unassigned')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>Country or destination: {inquiry.country || 'Not provided'}</div>
                      <div className="mt-1">Preferred date: {formatAdminDate(inquiry.preferredDate, 'To be confirmed')}</div>
                      <div className="mt-1">Applicants: {inquiry.applicants || 'Not provided'}</div>
                      <div className="mt-1">Last action: {formatAdminDateTime(inquiry.lastActionAt, 'Not recorded')}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : getPriorityToneClass(inquiry.priorityLabel)}`}>
                      {inquiry.priorityLabel || 'Standard'} priority
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : getDocumentToneClass(inquiry.documentReadiness || inquiry.documentStatus)}`}>
                      {inquiry.documentReadiness || inquiry.documentStatus || 'Document status not provided'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {inquiry.isUnassigned ? 'Unassigned' : `${getStaffRoleLabel(inquiry.assignedStaff?.role)} owner`}
                    </span>
                    {!inquiry.userId && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        Guest
                      </span>
                    )}
                    {inquiry.isOverdueFollowUp && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/20 text-white' : getAttentionToneClass('high')}`}>
                        Overdue {formatDayAge(inquiry.daysSinceLastFollowUp, 'Today')}
                      </span>
                    )}
                  </div>

                  {inquiry.customerMessage && (
                    <p className={`mt-4 text-sm ${isSelected ? 'text-white/85' : 'text-[#67707e]'}`}>
                      {truncateText(inquiry.customerMessage)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedInquiry && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <StaffDetailSection
                title={`Request #${selectedInquiry.inquiryId || selectedInquiry.id}`}
                description={selectedInquiry.nextActionHint || 'Review the request, continue the conversation, and keep the notes current.'}
              >
                <div className="flex flex-wrap gap-3">
                  <StaffStatusPill status={selectedInquiry.status} />
                  <StaffInfoPill tone={selectedInquiry.isUnassigned ? 'danger' : isOwnedByCurrentStaff(selectedInquiry, currentUserId) ? 'accent' : 'info'}>
                    Owner {getStaffDisplayName(selectedInquiry.assignedStaff, 'Unassigned')}
                  </StaffInfoPill>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getPriorityToneClass(selectedInquiry.priorityLabel)}`}>
                    {selectedInquiry.priorityLabel || 'Standard'} priority
                  </span>
                  {selectedInquiry.isOverdueFollowUp && (
                    <StaffInfoPill tone="danger">
                      Overdue {formatDayAge(selectedInquiry.daysSinceLastFollowUp, 'Today')}
                    </StaffInfoPill>
                  )}
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last contact {formatAdminDateTime(selectedInquiry.lastContactedAt, 'not recorded')}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last action {formatAdminDateTime(selectedInquiry.lastActionAt, 'not recorded')}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedInquiry)}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Update Request
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(selectedInquiry)}
                    className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Continue on WhatsApp
                  </button>
                  {!isOwnedByCurrentStaff(selectedInquiry, currentUserId) && (
                    <button
                      type="button"
                      onClick={() => handleAssignToMe(selectedInquiry)}
                      disabled={assigningId === selectedInquiry.id}
                      className="rounded-full border border-[#006837] px-4 py-2 text-sm font-bold text-[#006837] transition hover:bg-[#006837] hover:text-white disabled:opacity-60"
                    >
                      {assigningId === selectedInquiry.id ? 'Assigning...' : 'Take Ownership'}
                    </button>
                  )}
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Customer Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Name" value={selectedInquiry.contactName} />
                  <StaffDetailRow label="Account type" value={selectedInquiry.userId ? 'Account Holder' : 'Guest'} />
                  <StaffDetailRow label="Email" value={selectedInquiry.contactEmail} />
                  <StaffDetailRow label="Phone / WhatsApp" value={selectedInquiry.contactPhone} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Ownership and Accountability">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow
                    label="Request owner"
                    value={`${getStaffDisplayName(selectedInquiry.assignedStaff, 'Unassigned')}${selectedInquiry.assignedStaff ? ` (${getStaffRoleLabel(selectedInquiry.assignedStaff.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Assigned on" value={formatAdminDateTime(selectedInquiry.assignedAt, 'Not assigned yet')} />
                  <StaffDetailRow
                    label="Last updated by"
                    value={`${getStaffDisplayName(selectedInquiry.lastUpdatedBy, 'Not recorded')}${selectedInquiry.lastUpdatedBy ? ` (${getStaffRoleLabel(selectedInquiry.lastUpdatedBy.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Last action time" value={formatAdminDateTime(selectedInquiry.lastActionAt, 'Not recorded')} />
                  <StaffDetailRow label="Last status change" value={formatAdminDateTime(selectedInquiry.lastStatusChangedAt, 'Not recorded')} />
                  <StaffDetailRow
                    label="Attention flags"
                    value={selectedInquiry.attentionReasons?.length ? selectedInquiry.attentionReasons.join(', ') : 'No special attention flag right now.'}
                    subtle
                  />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Service Request">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Service" value={selectedInquiry.serviceTitle || selectedInquiry.serviceType} />
                  <StaffDetailRow label="Request focus" value={selectedInquiry.requestFocus} />
                  <StaffDetailRow label="Country or destination" value={selectedInquiry.country} />
                  <StaffDetailRow label="Preferred date" value={formatAdminDate(selectedInquiry.preferredDate)} />
                  <StaffDetailRow label="Applicants" value={selectedInquiry.applicants ? String(selectedInquiry.applicants) : 'Not provided'} />
                  <StaffDetailRow label="Urgency from customer" value={selectedInquiry.urgency || selectedInquiry.priorityLabel || 'Not provided'} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Documents and Message" description="This section helps staff see whether the request is ready, blocked, or urgent.">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Document status" value={selectedInquiry.documentStatus || 'Not provided'} subtle />
                  <StaffDetailRow label="Document readiness" value={selectedInquiry.documentReadiness || 'Not provided'} subtle />
                </div>
                <div className="mt-3">
                  <StaffDetailRow label="Customer message" value={selectedInquiry.customerMessage || 'No customer message provided.'} subtle />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Team Follow-Up">
                <div className="space-y-3">
                  <StaffDetailRow label="Next suggested action" value={selectedInquiry.nextActionHint} subtle />
                  <StaffDetailRow label="Internal notes" value={selectedInquiry.adminNotes || 'No internal notes yet.'} subtle />
                </div>
              </StaffDetailSection>
            </div>
          )}
        </div>
      )}
    </StaffPageShell>
  );
};

export default ServiceInquiriesAdmin;
