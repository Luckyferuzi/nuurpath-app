import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getOperationalStatusLabel, getOperationalStatusOptions } from '../lib/operationalPipeline.js';
import { formatDayAge, getAttentionToneClass, getStaffDisplayName, getStaffRoleLabel, isOwnedByCurrentStaff } from '../lib/staffOwnership.js';
import { matchesCreatedAtWindow, STAFF_TIME_WINDOW_OPTIONS } from '../lib/staffFilters.js';
import { formatAdminDate, formatAdminDateTime } from '../lib/staffRequestUtils.js';
import { buildDirectWhatsAppUrl, buildFlightLeadFollowUpMessage } from '../lib/whatsapp.js';
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
  { value: 'quoted', label: 'Quoted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

function buildFlightNextAction(booking) {
  const status = getOperationalStatusLabel(booking?.status);

  if (status === 'Cancelled' || status === 'Lost') {
    return 'No further follow-up is needed unless the traveler asks to reopen the request.';
  }

  if (status === 'Completed') {
    return 'Travel is complete. Only after-service support or future upsell follow-up remains.';
  }

  if (status === 'Confirmed Offline') {
    return 'Confirm ticketing, payment status, and any last travel details before departure.';
  }

  if (status === 'Quoted') {
    return 'Follow up on the fare quotation and confirm whether the traveler is ready to proceed.';
  }

  if (status === 'WhatsApp Follow-up' || status === 'Contacted') {
    return 'Continue the conversation on WhatsApp and note the next promised update for the traveler.';
  }

  if (status === 'Qualified') {
    return 'Confirm route, dates, traveler count, and travel class before moving to quotation.';
  }

  return 'Review the route details, greet the traveler, and move the request into active follow-up.';
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

  if (statusFilter === 'follow-up') {
    return ['Contacted', 'Qualified', 'WhatsApp Follow-up', 'Docs Received'].includes(status);
  }

  if (statusFilter === 'quoted') {
    return status === 'Quoted';
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

const FlightBookingsAdmin = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('30d');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [formData, setFormData] = useState({
    status: 'New',
    adminNotes: '',
    assignedStaffId: '',
  });

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const currentUserId = Number(user?.id || 0);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get('/flights');
      setBookings(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load flight requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

  const resetForm = () => {
    setEditingBooking(null);
    setFormData({
      status: 'New',
      adminNotes: '',
      assignedStaffId: '',
    });
    setSaving(false);
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      status: getOperationalStatusLabel(booking.status),
      adminNotes: booking.adminNotes || '',
      assignedStaffId: booking.assignedStaff?.id ? String(booking.assignedStaff.id) : '',
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingBooking) {
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

      const response = await axios.put(`/flights/${editingBooking.id}`, payload);
      const updatedBooking = response.data;

      setBookings((previous) => previous.map((booking) => (
        booking.id === updatedBooking.id ? updatedBooking : booking
      )));
      setSelectedBookingId(updatedBooking.id);
      setError(null);
      setMessage({ type: 'success', text: `Flight request #${updatedBooking.requestId || updatedBooking.id} updated successfully.` });
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update flight request.');
      setSaving(false);
    }
  };

  const handleAssignToMe = async (booking) => {
    setAssigningId(booking.id);
    setMessage(null);

    try {
      const response = await axios.put(`/flights/${booking.id}`, { assignedStaffId: currentUserId });
      const updatedBooking = response.data;
      setBookings((previous) => previous.map((currentBooking) => (
        currentBooking.id === updatedBooking.id ? updatedBooking : currentBooking
      )));
      setSelectedBookingId(updatedBooking.id);
      setError(null);
      setMessage({ type: 'success', text: `Flight request #${updatedBooking.requestId || updatedBooking.id} is now assigned to you.` });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to assign this flight request.');
    } finally {
      setAssigningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this flight request?')) {
      return;
    }

    try {
      await axios.delete(`/flights/${id}`);
      setBookings((previous) => previous.filter((booking) => booking.id !== id));
      setMessage({ type: 'success', text: 'Flight request deleted successfully.' });
      setError(null);

      if (editingBooking?.id === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete flight request.');
    }
  };

  const openWhatsApp = (booking) => {
    const url = buildDirectWhatsAppUrl(
      booking.contactPhone,
      buildFlightLeadFollowUpMessage({
        contactName: booking.contactName || booking.user?.name,
        requestId: booking.requestId || booking.id,
        status: getOperationalStatusLabel(booking.status),
        from: booking.from,
        to: booking.to,
        departureDate: booking.departureDate,
        returnDate: booking.returnDate,
      })
    );

    if (!url) {
      setError('A valid WhatsApp phone number is not available for this request.');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const exportCSV = () => {
    if (bookings.length === 0) {
      window.alert('No flight requests to export.');
      return;
    }

    const headers = ['ID', 'Contact Name', 'Email', 'Phone', 'From', 'To', 'Departure', 'Return', 'Passengers', 'Class', 'Request Status', 'Owner', 'Last Updated By', 'Last Action', 'Overdue Follow-Up', 'Internal Notes', 'Request Date'];
    const csvContent = [
      headers.join(','),
      ...bookings.map((booking) => {
        const name = String(booking.contactName || booking.user?.name || 'Guest').replace(/"/g, '""');
        const notes = String(booking.adminNotes || '').replace(/"/g, '""');
        const owner = String(getStaffDisplayName(booking.assignedStaff, 'Unassigned')).replace(/"/g, '""');
        const lastUpdatedBy = String(getStaffDisplayName(booking.lastUpdatedBy, 'Not recorded')).replace(/"/g, '""');

        return [
          booking.requestId || booking.id,
          `"${name}"`,
          booking.contactEmail || booking.user?.email || '',
          booking.contactPhone || '',
          `"${String(booking.from || '').replace(/"/g, '""')}"`,
          `"${String(booking.to || '').replace(/"/g, '""')}"`,
          formatAdminDate(booking.departureDate, 'TBD'),
          formatAdminDate(booking.returnDate, 'One Way'),
          booking.passengers || 1,
          booking.travelClass || '',
          `"${getOperationalStatusLabel(booking.status)}"`,
          `"${owner}"`,
          `"${lastUpdatedBy}"`,
          formatAdminDateTime(booking.lastActionAt, ''),
          booking.isOverdueFollowUp ? 'Yes' : 'No',
          `"${notes}"`,
          formatAdminDate(booking.createdAt),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flight_requests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBookings = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return bookings.filter((booking) => {
      const name = String(booking.contactName || booking.user?.name || '').toLowerCase();
      const email = String(booking.contactEmail || booking.user?.email || '').toLowerCase();
      const route = `${booking.from || ''} ${booking.to || ''}`.toLowerCase();

      return (
        matchesStatusFilter(booking, statusFilter, currentUserId) &&
        matchesCreatedAtWindow(booking, timeWindow) &&
        (
          !term ||
          name.includes(term) ||
          email.includes(term) ||
          route.includes(term) ||
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
      hint: 'Flight requests that still need the first staff response.',
      tone: 'default',
    },
    {
      label: 'My Queue',
      value: bookings.filter((booking) => isOwnedByCurrentStaff(booking, currentUserId)).length,
      hint: 'Flight requests currently assigned to your staff account.',
      tone: 'warm',
    },
    {
      label: 'Overdue Follow-Up',
      value: bookings.filter((booking) => booking.isOverdueFollowUp).length,
      hint: 'Requests that have gone too long without the next reply or update.',
      tone: 'danger',
    },
    {
      label: 'Unassigned',
      value: bookings.filter((booking) => booking.isUnassigned).length,
      hint: 'Open requests that still do not have a clear owner.',
      tone: 'accent',
    },
  ];

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading flight requests...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Follow-Up Queue"
      title="Flight Requests"
      description="Keep route requests, quotations, and traveler follow-up in a layout that works better across laptop, tablet, and urgent mobile checks."
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

      {editingBooking && (
        <StaffCardSection
          title={`Update Flight Request #${editingBooking.requestId || editingBooking.id}`}
          description={`${editingBooking.contactName || editingBooking.user?.name || 'Guest traveler'} - ${editingBooking.from} to ${editingBooking.to}`}
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
                  placeholder="Record the quote, traveler confirmation, or the next promised update."
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

      <StaffCardSection title="Filter and Search" description="Use quick queue filters first, then narrow further by date range or customer search.">
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
                placeholder="Search by customer, email, route, or request ID..."
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
          title="No flight requests match this view"
          description="Try another queue filter, widen the date range, or search with a different route or customer detail."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const isSelected = selectedBooking?.id === booking.id;
              const status = getOperationalStatusLabel(booking.status);

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
                        {booking.from} to {booking.to}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StaffStatusPill status={status} />
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Received {formatAdminDate(booking.createdAt)}
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
                      <div>{booking.tripType || (booking.returnDate ? 'Round Trip' : 'One Way')}</div>
                      <div className="mt-1">Departure: {formatAdminDate(booking.departureDate, 'To be confirmed')}</div>
                      <div className="mt-1">Travelers: {booking.passengers || 1} ({booking.travelClass || 'Class not set'})</div>
                      <div className="mt-1">Last action: {formatAdminDateTime(booking.lastActionAt, 'Not recorded')}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {booking.isUnassigned ? 'Unassigned' : `${getStaffRoleLabel(booking.assignedStaff?.role)} owner`}
                    </span>
                    {booking.isOverdueFollowUp && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/20 text-white' : getAttentionToneClass('high')}`}>
                        Overdue {formatDayAge(booking.daysSinceLastFollowUp, 'Today')}
                      </span>
                    )}
                  </div>

                  {booking.adminNotes && (
                    <p className={`mt-4 text-sm ${isSelected ? 'text-white/85' : 'text-[#67707e]'}`}>
                      {booking.adminNotes}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedBooking && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <StaffDetailSection
                title={`Request #${selectedBooking.requestId || selectedBooking.id}`}
                description={buildFlightNextAction(selectedBooking)}
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
                    Received {formatAdminDate(selectedBooking.createdAt)}
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

              <StaffDetailSection title="Traveler Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Name" value={selectedBooking.contactName || selectedBooking.user?.name} />
                  <StaffDetailRow label="Account type" value={selectedBooking.userId ? 'Account Holder' : 'Guest'} />
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

              <StaffDetailSection title="Route and Travel Plan">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Origin" value={selectedBooking.from} />
                  <StaffDetailRow label="Destination" value={selectedBooking.to} />
                  <StaffDetailRow label="Departure date" value={formatAdminDate(selectedBooking.departureDate)} />
                  <StaffDetailRow label="Return date" value={formatAdminDate(selectedBooking.returnDate, 'One Way')} />
                  <StaffDetailRow label="Trip type" value={selectedBooking.tripType || (selectedBooking.returnDate ? 'Round Trip' : 'One Way')} />
                  <StaffDetailRow label="Travel class" value={selectedBooking.travelClass || 'Not provided'} />
                  <StaffDetailRow label="Passengers" value={String(selectedBooking.passengers || 1)} />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Team Follow-Up">
                <div className="space-y-3">
                  <StaffDetailRow label="Next suggested action" value={buildFlightNextAction(selectedBooking)} subtle />
                  <StaffDetailRow label="Internal notes" value={selectedBooking.adminNotes || 'No internal notes yet.'} subtle />
                </div>
              </StaffDetailSection>
            </div>
          )}
        </div>
      )}
    </StaffPageShell>
  );
};

export default FlightBookingsAdmin;
