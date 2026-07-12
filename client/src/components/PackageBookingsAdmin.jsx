import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getOperationalStatusLabel, getOperationalStatusOptions } from '../lib/operationalPipeline.js';
import { formatDayAge, getAttentionToneClass, getStaffDisplayName, getStaffRoleLabel, isOwnedByCurrentStaff } from '../lib/staffOwnership.js';
import { matchesCreatedAtWindow, STAFF_TIME_WINDOW_OPTIONS } from '../lib/staffFilters.js';
import {
  formatAdminDate,
  formatAdminDateTime,
  openProtectedStaffFile,
} from '../lib/staffRequestUtils.js';
import { buildDirectWhatsAppUrl, buildPackageLeadFollowUpMessage } from '../lib/whatsapp.js';
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

const EMPTY_FORM_DATA = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  packageId: '',
  travelDate: '',
  passengers: 1,
  status: 'New',
  adminNotes: '',
  assignedStaffId: '',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All requests' },
  { value: 'new', label: 'New requests' },
  { value: 'mine', label: 'My queue' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'documents', label: 'Waiting for documents' },
  { value: 'follow-up', label: 'Ready for follow-up' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function truncateText(value, maxLength = 140) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getMissingInformation(booking) {
  if (Array.isArray(booking?.missingInformation) && booking.missingInformation.length > 0) {
    return booking.missingInformation;
  }

  const missing = [];

  if (!booking?.locationFrom) {
    missing.push('departure city');
  }

  if (!booking?.travelDate) {
    missing.push('preferred travel date');
  }

  if (!booking?.passportNumber) {
    missing.push('passport number');
  }

  if (!booking?.passportExpiryDate) {
    missing.push('passport expiry date');
  }

  if (!booking?.dateOfBirth) {
    missing.push('date of birth');
  }

  if (!booking?.nationality) {
    missing.push('nationality');
  }

  if (!booking?.passportCopyAvailable && !booking?.passportCopyUrl && !booking?.passportCopy) {
    missing.push('passport copy');
  }

  return missing;
}

function matchesStatusFilter(booking, statusFilter, currentUserId) {
  const status = getOperationalStatusLabel(booking?.status);

  if (statusFilter === 'all') {
    return true;
  }

  if (statusFilter === 'new') {
    return status === 'New';
  }

  if (statusFilter === 'mine') {
    return isOwnedByCurrentStaff(booking, currentUserId);
  }

  if (statusFilter === 'unassigned') {
    return Boolean(booking?.isUnassigned);
  }

  if (statusFilter === 'overdue') {
    return Boolean(booking?.isOverdueFollowUp);
  }

  if (statusFilter === 'documents') {
    return Boolean(booking?.isWaitingForDocuments) || status === 'Docs Requested' || getMissingInformation(booking).length > 0;
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

function getStatusFilterOptions(bookings, currentUserId) {
  return STATUS_FILTERS.map((option) => ({
    ...option,
    count: bookings.filter((booking) => matchesStatusFilter(booking, option.value, currentUserId)).length,
  }));
}

const PackageBookingsAdmin = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [documentActionId, setDocumentActionId] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const currentUserId = Number(user?.id || 0);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get(`/package-bookings?page=${currentPage}`);

      if (response.data?.bookings) {
        setBookings(Array.isArray(response.data.bookings) ? response.data.bookings : []);
        setTotalPages(response.data.totalPages || 1);
        setCurrentPage(response.data.currentPage || 1);
      } else {
        setBookings(Array.isArray(response.data) ? response.data : []);
        setTotalPages(1);
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load package requests.');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await axios.get('/packages');
        setPackages(Array.isArray(response.data) ? response.data : response.data?.packages || []);
      } catch (err) {
        console.error('Failed to fetch packages', err);
      }
    };

    fetchPackages();
  }, []);

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
    if (!bookings.length) {
      setSelectedBookingId(null);
      return;
    }

    const selectedExists = bookings.some((booking) => booking.id === selectedBookingId);
    if (!selectedExists) {
      setSelectedBookingId(bookings[0].id);
    }
  }, [bookings, selectedBookingId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
      };

      if (!isAdmin) {
        delete payload.assignedStaffId;
      }

      const response = editingId
        ? await axios.put(`/package-bookings/${editingId}`, payload)
        : await axios.post('/package-bookings', payload);

      const savedBookingId = response.data?.id || response.data?.requestId || editingId;

      setError(null);
      setMessage({
        type: 'success',
        text: editingId
          ? `Package request #${savedBookingId} updated successfully.`
          : `Package request #${savedBookingId} created successfully.`,
      });

      await fetchBookings();
      if (savedBookingId) {
        setSelectedBookingId(savedBookingId);
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save package request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package request?')) {
      return;
    }

    try {
      await axios.delete(`/package-bookings/${id}`);
      setError(null);
      setMessage({ type: 'success', text: 'Package request deleted successfully.' });
      await fetchBookings();

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete package request.');
    }
  };

  const handleEdit = (booking) => {
    setFormData({
      contactName: booking.contactName || booking.user?.name || '',
      contactEmail: booking.contactEmail || booking.user?.email || '',
      contactPhone: booking.contactPhone || '',
      packageId: booking.packageId || '',
      travelDate: booking.travelDate ? new Date(booking.travelDate).toISOString().split('T')[0] : '',
      passengers: booking.passengers || 1,
      status: getOperationalStatusLabel(booking.status),
      adminNotes: booking.adminNotes || '',
      assignedStaffId: booking.assignedStaff?.id ? String(booking.assignedStaff.id) : '',
    });
    setEditingId(booking.id);
    setShowForm(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM_DATA);
    setEditingId(null);
    setShowForm(false);
  };

  const handleAssignToMe = async (booking) => {
    setAssigningId(booking.id);
    setMessage(null);

    try {
      await axios.put(`/package-bookings/${booking.id}`, { assignedStaffId: currentUserId });
      setError(null);
      setMessage({
        type: 'success',
        text: `Request #${booking.requestId || booking.id} is now assigned to you.`,
      });
      await fetchBookings();
      setSelectedBookingId(booking.id);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to assign this request.');
    } finally {
      setAssigningId(null);
    }
  };

  const openWhatsApp = (booking) => {
    const url = buildDirectWhatsAppUrl(
      booking.contactPhone,
      buildPackageLeadFollowUpMessage({
        contactName: booking.contactName || booking.user?.name,
        requestId: booking.requestId || booking.id,
        packageTitle: booking.packageTitle || booking.package?.title,
        status: getOperationalStatusLabel(booking.status),
        travelDate: booking.travelDate,
        passengers: booking.passengers,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePassportDocument = async (booking, mode = 'preview') => {
    const reference = booking.passportCopyUrl || booking.passportCopy;

    if (!reference) {
      setError('No passport document is attached to this request yet.');
      return;
    }

    const actionKey = `${booking.id}-${mode}`;
    setDocumentActionId(actionKey);
    setError(null);

    try {
      await openProtectedStaffFile(axios, reference, {
        mode,
        fallbackName: `passport-request-${booking.requestId || booking.id}`,
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to open the passport document.');
    } finally {
      setDocumentActionId('');
    }
  };

  const exportCSV = () => {
    if (bookings.length === 0) {
      window.alert('No package requests to export.');
      return;
    }

    const headers = [
      'ID',
      'Contact Name',
      'Email',
      'Phone',
      'Package',
      'Preferred Travel Date',
      'Travelers',
      'Departure City',
      'Passport Number',
      'Passport Expiry',
      'Nationality',
      'Date of Birth',
      'Passport Copy Attached',
      'Request Status',
      'Owner',
      'Last Updated By',
      'Last Action',
      'Overdue Follow-Up',
      'Customer Notes',
      'Internal Notes',
      'Request Date',
    ];

    const csvContent = [
      headers.join(','),
      ...bookings.map((booking) => {
        const packageTitle = String(booking.packageTitle || booking.package?.title || 'N/A').replace(/"/g, '""');
        const customerName = String(booking.contactName || booking.user?.name || 'Guest').replace(/"/g, '""');
        const customerNotes = String(booking.customerNotes || '').replace(/"/g, '""');
        const adminNotes = String(booking.adminNotes || '').replace(/"/g, '""');
        const owner = String(getStaffDisplayName(booking.assignedStaff, 'Unassigned')).replace(/"/g, '""');
        const lastUpdatedBy = String(getStaffDisplayName(booking.lastUpdatedBy, 'Not recorded')).replace(/"/g, '""');

        return [
          booking.requestId || booking.id,
          `"${customerName}"`,
          booking.contactEmail || booking.user?.email || '',
          booking.contactPhone || '',
          `"${packageTitle}"`,
          formatAdminDate(booking.travelDate, 'TBD'),
          booking.passengers || '',
          `"${String(booking.departureCity || booking.locationFrom || '').replace(/"/g, '""')}"`,
          `"${String(booking.passportNumber || '').replace(/"/g, '""')}"`,
          formatAdminDate(booking.passportExpiryDate, ''),
          `"${String(booking.nationality || '').replace(/"/g, '""')}"`,
          formatAdminDate(booking.dateOfBirth, ''),
          booking.passportCopyAvailable || booking.passportCopy ? 'Yes' : 'No',
          `"${getOperationalStatusLabel(booking.status)}"`,
          `"${owner}"`,
          `"${lastUpdatedBy}"`,
          formatAdminDateTime(booking.lastActionAt, ''),
          booking.isOverdueFollowUp ? 'Yes' : 'No',
          `"${customerNotes}"`,
          `"${adminNotes}"`,
          formatAdminDate(booking.createdAt, ''),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `package_requests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return bookings.filter((booking) => {
      const customerName = String(booking.contactName || booking.user?.name || '').toLowerCase();
      const customerEmail = String(booking.contactEmail || booking.user?.email || '').toLowerCase();
      const packageTitle = String(booking.packageTitle || booking.package?.title || '').toLowerCase();
      const departureCity = String(booking.departureCity || booking.locationFrom || '').toLowerCase();

      return (
        matchesStatusFilter(booking, statusFilter, currentUserId) &&
        matchesCreatedAtWindow(booking, timeWindow) &&
        (
          !term ||
          customerName.includes(term) ||
          customerEmail.includes(term) ||
          packageTitle.includes(term) ||
          departureCity.includes(term) ||
          String(booking.requestId || booking.id).includes(term)
        )
      );
    });
  }, [bookings, currentUserId, searchTerm, statusFilter, timeWindow]);

  const selectedBooking = filteredBookings.find((booking) => booking.id === selectedBookingId)
    || filteredBookings[0]
    || bookings.find((booking) => booking.id === selectedBookingId)
    || bookings[0]
    || null;

  const metrics = [
    {
      label: 'New Requests',
      value: bookings.filter((booking) => getOperationalStatusLabel(booking.status) === 'New').length,
      hint: 'Fresh package requests that still need the first team response.',
      tone: 'default',
    },
    {
      label: 'My Queue',
      value: bookings.filter((booking) => isOwnedByCurrentStaff(booking, currentUserId)).length,
      hint: 'Requests currently assigned to your staff account.',
      tone: 'warm',
    },
    {
      label: 'Overdue Follow-Up',
      value: bookings.filter((booking) => booking.isOverdueFollowUp).length,
      hint: 'Requests that have gone too long without the next team follow-up.',
      tone: 'danger',
    },
    {
      label: 'Waiting Documents',
      value: bookings.filter((booking) => booking.isWaitingForDocuments || getMissingInformation(booking).length > 0).length,
      hint: 'Requests still blocked by missing passport or travel details.',
      tone: 'accent',
    },
  ];

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading package requests...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Follow-Up Queue"
      title="Package Requests"
      description="Keep package leads, passport details, and next-step coordination in a calmer layout with quicker queue switching."
      actions={(
        <>
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
            {showForm && !editingId ? 'Close Form' : 'Add Manual Request'}
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="rounded-full border border-[#101c2d] px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
          >
            Export Requests
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      </div>

      {showForm && (
        <StaffCardSection
          title={editingId ? `Update Request #${editingId}` : 'Create a Manual Package Request'}
          description="Use this form when staff need to add or update a package request directly. Customer-submitted passport details stay visible in the request detail panel below."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Customer name</span>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(event) => setFormData({ ...formData, contactName: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Customer email</span>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(event) => setFormData({ ...formData, contactEmail: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Phone or WhatsApp</span>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(event) => setFormData({ ...formData, contactPhone: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Package</span>
                <select
                  value={formData.packageId}
                  onChange={(event) => setFormData({ ...formData, packageId: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  required
                >
                  <option value="">Select package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Preferred travel date</span>
                <input
                  type="date"
                  value={formData.travelDate}
                  onChange={(event) => setFormData({ ...formData, travelDate: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Travelers</span>
                <input
                  type="number"
                  min="1"
                  value={formData.passengers}
                  onChange={(event) => setFormData({ ...formData, passengers: Number(event.target.value) || 1 })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  required
                />
              </label>
            </div>

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
                  placeholder="Record what was discussed, what is missing, or the next promise to the customer."
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

      <StaffCardSection title="Filter and Search" description="Jump between queue states first, then narrow by age or search details.">
        <div className="space-y-4">
          <StaffFilterPills
            options={getStatusFilterOptions(bookings, currentUserId)}
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
                placeholder="Search by customer, email, package, departure city, or request ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
          </div>
        </div>
      </StaffCardSection>

      {filteredBookings.length === 0 ? (
        <StaffEmptyState
          title="No package requests match this view"
          description="Try another queue filter, widen the date range, or search with a different customer or package detail."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const isSelected = selectedBooking?.id === booking.id;
              const missingInformation = getMissingInformation(booking);

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBookingId(booking.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${isSelected ? 'border-[#101c2d] bg-[#101c2d] text-white shadow-lg' : 'border-[#ebe4d3] bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-black uppercase tracking-[0.22em] ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Request #{booking.requestId || booking.id}
                      </div>
                      <h3 className={`mt-2 text-xl font-black ${isSelected ? 'text-white' : 'text-[#101c2d]'}`}>
                        {booking.packageTitle || booking.package?.title || 'Unknown package'}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StaffStatusPill status={booking.status} />
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Received {formatAdminDate(booking.createdAt, 'Recently')}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 grid gap-3 md:grid-cols-2 ${isSelected ? 'text-white/90' : 'text-[#4f5763]'}`}>
                    <div>
                      <div className="text-sm font-bold">{booking.contactName || booking.user?.name || 'Guest traveler'}</div>
                      <div className="mt-1 text-sm">{booking.contactEmail || booking.user?.email || 'No email provided'}</div>
                      <div className="mt-1 text-sm">{booking.contactPhone || 'No phone provided'}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em]">
                        Owner {getStaffDisplayName(booking.assignedStaff, 'Unassigned')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div>Travelers: {booking.passengers || 1}</div>
                      <div className="mt-1">Preferred date: {formatAdminDate(booking.travelDate, 'To be confirmed')}</div>
                      <div className="mt-1">Departure city: {booking.departureCity || booking.locationFrom || 'Not provided'}</div>
                      <div className="mt-1">Last action: {formatAdminDateTime(booking.lastActionAt, 'Not recorded')}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.customerType || (booking.userId ? 'Account Holder' : 'Guest')}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      Passport copy {booking.passportCopyAvailable || booking.passportCopy ? 'attached' : 'missing'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.isUnassigned ? 'Unassigned' : `${getStaffRoleLabel(booking.assignedStaff?.role)} owner`}
                    </span>
                    {booking.nationality && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {booking.nationality}
                      </span>
                    )}
                    {booking.isOverdueFollowUp && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/20 text-white' : getAttentionToneClass('high')}`}>
                        Overdue {formatDayAge(booking.daysSinceLastFollowUp, 'Today')}
                      </span>
                    )}
                  </div>

                  {booking.customerNotes && (
                    <p className={`mt-4 text-sm ${isSelected ? 'text-white/85' : 'text-[#67707e]'}`}>
                      {truncateText(booking.customerNotes)}
                    </p>
                  )}

                  <div className={`mt-4 text-sm ${isSelected ? 'text-white/75' : 'text-[#7a828f]'}`}>
                    {missingInformation.length > 0
                      ? `Still needed: ${missingInformation.join(', ')}`
                      : 'Main passport and travel details are already available.'}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBooking && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <StaffDetailSection
                title={`Request #${selectedBooking.requestId || selectedBooking.id}`}
                description={selectedBooking.nextActionHint || 'Open the request details, continue the conversation, and keep the notes up to date.'}
              >
                <div className="flex flex-wrap gap-3">
                  <StaffStatusPill status={selectedBooking.status} />
                  <StaffInfoPill tone={selectedBooking.isUnassigned ? 'danger' : isOwnedByCurrentStaff(selectedBooking, currentUserId) ? 'accent' : 'info'}>
                    Owner {getStaffDisplayName(selectedBooking.assignedStaff, 'Unassigned')}
                  </StaffInfoPill>
                  {selectedBooking.isOverdueFollowUp && (
                    <StaffInfoPill tone="danger">
                      Overdue {formatDayAge(selectedBooking.daysSinceLastFollowUp, 'Today')}
                    </StaffInfoPill>
                  )}
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Received {formatAdminDate(selectedBooking.createdAt, 'Recently')}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last contact {formatAdminDateTime(selectedBooking.lastContactedAt, 'not recorded')}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last action {formatAdminDateTime(selectedBooking.lastActionAt, 'not recorded')}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedBooking)}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                  >
                    Update Request
                  </button>
                  <button
                    type="button"
                    onClick={() => openWhatsApp(selectedBooking)}
                    className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    Continue on WhatsApp
                  </button>
                  {!isOwnedByCurrentStaff(selectedBooking, currentUserId) && (
                    <button
                      type="button"
                      onClick={() => handleAssignToMe(selectedBooking)}
                      disabled={assigningId === selectedBooking.id}
                      className="rounded-full border border-[#006837] px-4 py-2 text-sm font-bold text-[#006837] transition hover:bg-[#006837] hover:text-white disabled:opacity-60"
                    >
                      {assigningId === selectedBooking.id ? 'Assigning...' : 'Take Ownership'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePassportDocument(selectedBooking, 'preview')}
                    disabled={documentActionId === `${selectedBooking.id}-preview`}
                    className="rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white disabled:opacity-60"
                  >
                    {documentActionId === `${selectedBooking.id}-preview` ? 'Opening...' : 'View Passport Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePassportDocument(selectedBooking, 'download')}
                    disabled={documentActionId === `${selectedBooking.id}-download`}
                    className="rounded-full border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    {documentActionId === `${selectedBooking.id}-download` ? 'Preparing...' : 'Download Copy'}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedBooking.id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Delete Request
                    </button>
                  )}
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Customer Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Name" value={selectedBooking.contactName || selectedBooking.user?.name} />
                  <StaffDetailRow label="Account type" value={selectedBooking.customerType || (selectedBooking.userId ? 'Account Holder' : 'Guest')} />
                  <StaffDetailRow label="Email" value={selectedBooking.contactEmail || selectedBooking.user?.email} />
                  <StaffDetailRow label="Phone / WhatsApp" value={selectedBooking.contactPhone} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Ownership and Accountability">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow
                    label="Request owner"
                    value={`${getStaffDisplayName(selectedBooking.assignedStaff, 'Unassigned')}${selectedBooking.assignedStaff ? ` (${getStaffRoleLabel(selectedBooking.assignedStaff.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Assigned on" value={formatAdminDateTime(selectedBooking.assignedAt, 'Not assigned yet')} />
                  <StaffDetailRow
                    label="Last updated by"
                    value={`${getStaffDisplayName(selectedBooking.lastUpdatedBy, 'Not recorded')}${selectedBooking.lastUpdatedBy ? ` (${getStaffRoleLabel(selectedBooking.lastUpdatedBy.role)})` : ''}`}
                  />
                  <StaffDetailRow label="Last action time" value={formatAdminDateTime(selectedBooking.lastActionAt, 'Not recorded')} />
                  <StaffDetailRow label="Last status change" value={formatAdminDateTime(selectedBooking.lastStatusChangedAt, 'Not recorded')} />
                  <StaffDetailRow
                    label="Attention flags"
                    value={selectedBooking.attentionReasons?.length ? selectedBooking.attentionReasons.join(', ') : 'No special attention flag right now.'}
                    subtle
                  />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Travel Request">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Package" value={selectedBooking.packageTitle || selectedBooking.package?.title} />
                  <StaffDetailRow label="Travelers" value={String(selectedBooking.passengers || 1)} />
                  <StaffDetailRow label="Preferred travel date" value={formatAdminDate(selectedBooking.travelDate)} />
                  <StaffDetailRow label="Departure city" value={selectedBooking.departureCity || selectedBooking.locationFrom} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Passport and Traveler Details" description="These are the customer-submitted fields staff need for document follow-up and review.">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Passport number" value={selectedBooking.passportNumber} />
                  <StaffDetailRow label="Passport expiry date" value={formatAdminDate(selectedBooking.passportExpiryDate)} />
                  <StaffDetailRow label="Date of birth" value={formatAdminDate(selectedBooking.dateOfBirth)} />
                  <StaffDetailRow label="Nationality" value={selectedBooking.nationality} />
                  <StaffDetailRow
                    label="Passport copy"
                    value={selectedBooking.passportCopyAvailable || selectedBooking.passportCopy ? 'Attached and staff-only' : 'Not attached'}
                    subtle
                  />
                  <StaffDetailRow
                    label="Missing items"
                    value={getMissingInformation(selectedBooking).length > 0 ? getMissingInformation(selectedBooking).join(', ') : 'Nothing important is missing'}
                    subtle
                  />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Customer Notes">
                <div className="space-y-3">
                  <StaffDetailRow label="Special request or message" value={selectedBooking.customerNotes || selectedBooking.specialRequests} subtle />
                  <StaffDetailRow label="Extra note captured from form" value={selectedBooking.notes} subtle />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Team Follow-Up">
                <div className="space-y-3">
                  <StaffDetailRow label="Next suggested action" value={selectedBooking.nextActionHint} subtle />
                  <StaffDetailRow label="Internal notes" value={selectedBooking.adminNotes || 'No internal notes yet.'} subtle />
                </div>
              </StaffDetailSection>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </StaffPageShell>
  );
};

export default PackageBookingsAdmin;
