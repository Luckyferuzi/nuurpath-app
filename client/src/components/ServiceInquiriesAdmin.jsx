import React, { useCallback, useEffect, useState } from 'react';
import axios from '../lib/api';
import {
  getOperationalStatusBadgeClassName,
  getOperationalStatusLabel,
  getOperationalStatusOptions,
} from '../lib/operationalPipeline.js';
import {
  formatAdminDate,
  formatAdminDateTime,
} from '../lib/staffRequestUtils.js';
import {
  buildDirectWhatsAppUrl,
  buildServiceLeadFollowUpMessage,
} from '../lib/whatsapp.js';

function truncateText(value, maxLength = 180) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-black text-[#0B1C3E]">{value}</div>
      <p className="mt-2 text-sm text-gray-600">{hint}</p>
    </div>
  );
}

function DetailRow({ label, value, subtle = false }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className={`mt-2 text-sm ${subtle ? 'text-gray-600' : 'text-[#0B1C3E]'}`}>
        {value || 'Not provided'}
      </div>
    </div>
  );
}

function DetailSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[#0B1C3E]">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOperationalStatusBadgeClassName(status)}`}>
      {getOperationalStatusLabel(status)}
    </span>
  );
}

const ServiceInquiriesAdmin = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [formData, setFormData] = useState({
    status: 'New',
    adminNotes: '',
  });
  const [saving, setSaving] = useState(false);

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
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingInquiry(null);
    setFormData({ status: 'New', adminNotes: '' });
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
      const response = await axios.put(`/services/inquiries/${editingInquiry.id}`, formData);
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

  const filteredInquiries = inquiries.filter((inquiry) => {
    const term = searchTerm.toLowerCase();

    return (
      String(inquiry.inquiryId || inquiry.id).includes(term) ||
      String(inquiry.contactName || '').toLowerCase().includes(term) ||
      String(inquiry.contactEmail || '').toLowerCase().includes(term) ||
      String(inquiry.serviceTitle || inquiry.serviceType || '').toLowerCase().includes(term) ||
      String(inquiry.country || '').toLowerCase().includes(term)
    );
  });

  const selectedInquiry = filteredInquiries.find((inquiry) => inquiry.id === selectedInquiryId)
    || filteredInquiries[0]
    || inquiries.find((inquiry) => inquiry.id === selectedInquiryId)
    || inquiries[0]
    || null;

  const urgentCount = inquiries.filter((inquiry) => String(inquiry.priorityLabel || '').toLowerCase() === 'high').length;
  const documentFollowUpCount = inquiries.filter((inquiry) => requiresDocumentFollowUp(inquiry)).length;
  const activeFollowUpsCount = inquiries.filter((inquiry) => {
    const status = getOperationalStatusLabel(inquiry.status);
    return !['New', 'Completed', 'Cancelled', 'Lost'].includes(status);
  }).length;
  const completedCount = inquiries.filter((inquiry) => {
    const status = getOperationalStatusLabel(inquiry.status);
    return status === 'Confirmed Offline' || status === 'Completed';
  }).length;

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading service requests...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#0B1C3E]">Service Request Follow-Up</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            See urgency, document readiness, and the customer message in one place so visa and passport support requests are easier to act on.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-full border border-[#0B1C3E] px-5 py-3 text-sm font-bold text-[#0B1C3E] transition-colors hover:bg-[#0B1C3E] hover:text-white"
        >
          Export Requests
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className={`mt-6 rounded-2xl px-5 py-4 text-sm ${message.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Urgent Requests" value={urgentCount} hint="Requests that sound time-sensitive and should be answered quickly." />
        <MetricCard label="Document Chase" value={documentFollowUpCount} hint="Requests still waiting on missing, renewed, or incomplete documents." />
        <MetricCard label="Active Follow-Up" value={activeFollowUpsCount} hint="Requests that are already in conversation, documents, quote, or delivery stages." />
        <MetricCard label="Completed Work" value={completedCount} hint="Requests already confirmed offline or fully completed." />
      </div>

      {editingInquiry && (
        <div className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#0B1C3E]">
              Update Service Request #{editingInquiry.inquiryId || editingInquiry.id}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {(editingInquiry.serviceTitle || editingInquiry.serviceType)} for {editingInquiry.contactName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
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
        </div>
      )}

      <div className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-gray-700">Search requests</span>
          <input
            type="text"
            placeholder="Search by customer, email, country, service, or request ID..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
          />
        </label>
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <h3 className="text-xl font-bold text-[#0B1C3E]">No service requests match this search</h3>
          <p className="mt-2 text-sm text-gray-600">
            Try a different customer name, country, or service title. When service requests arrive, they will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => {
              const isSelected = selectedInquiry?.id === inquiry.id;

              return (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${isSelected ? 'border-[#0B1C3E] bg-[#0B1C3E] text-white shadow-lg' : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-[0.22em] ${isSelected ? 'text-white/75' : 'text-gray-500'}`}>
                        Request #{inquiry.inquiryId || inquiry.id}
                      </div>
                      <h3 className={`mt-2 text-xl font-black ${isSelected ? 'text-white' : 'text-[#0B1C3E]'}`}>
                        {inquiry.serviceTitle || inquiry.serviceType}
                      </h3>
                      <div className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                        {inquiry.requestFocus || 'Service support'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={inquiry.status} />
                      <span className={`text-xs ${isSelected ? 'text-white/75' : 'text-gray-500'}`}>
                        Received {formatAdminDate(inquiry.createdAt, 'Recently')}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 grid gap-3 md:grid-cols-2 ${isSelected ? 'text-white/90' : 'text-gray-700'}`}>
                    <div>
                      <div className="text-sm font-bold">{inquiry.contactName}</div>
                      <div className="mt-1 text-sm">{inquiry.contactEmail}</div>
                      <div className="mt-1 text-sm">{inquiry.contactPhone || 'No phone provided'}</div>
                    </div>
                    <div className="text-sm">
                      <div>Country or destination: {inquiry.country || 'Not provided'}</div>
                      <div className="mt-1">Preferred date: {formatAdminDate(inquiry.preferredDate, 'To be confirmed')}</div>
                      <div className="mt-1">Applicants: {inquiry.applicants || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : getPriorityToneClass(inquiry.priorityLabel)}`}>
                      {inquiry.priorityLabel || 'Standard'} priority
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : getDocumentToneClass(inquiry.documentReadiness || inquiry.documentStatus)}`}>
                      {inquiry.documentReadiness || inquiry.documentStatus || 'Document status not provided'}
                    </span>
                    {!inquiry.userId && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        Guest
                      </span>
                    )}
                  </div>

                  {inquiry.customerMessage && (
                    <p className={`mt-4 text-sm ${isSelected ? 'text-white/85' : 'text-gray-600'}`}>
                      {truncateText(inquiry.customerMessage)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedInquiry && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <DetailSection
                title={`Request #${selectedInquiry.inquiryId || selectedInquiry.id}`}
                description={selectedInquiry.nextActionHint || 'Review the request, continue the conversation, and keep the notes current.'}
              >
                <div className="flex flex-wrap gap-3">
                  <StatusPill status={selectedInquiry.status} />
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getPriorityToneClass(selectedInquiry.priorityLabel)}`}>
                    {selectedInquiry.priorityLabel || 'Standard'} priority
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Last contact {formatAdminDateTime(selectedInquiry.lastContactedAt, 'not recorded')}
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
                </div>
              </DetailSection>

              <DetailSection title="Customer Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Name" value={selectedInquiry.contactName} />
                  <DetailRow label="Account type" value={selectedInquiry.userId ? 'Account Holder' : 'Guest'} />
                  <DetailRow label="Email" value={selectedInquiry.contactEmail} />
                  <DetailRow label="Phone / WhatsApp" value={selectedInquiry.contactPhone} />
                </div>
              </DetailSection>

              <DetailSection title="Service Request">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Service" value={selectedInquiry.serviceTitle || selectedInquiry.serviceType} />
                  <DetailRow label="Request focus" value={selectedInquiry.requestFocus} />
                  <DetailRow label="Country or destination" value={selectedInquiry.country} />
                  <DetailRow label="Preferred date" value={formatAdminDate(selectedInquiry.preferredDate)} />
                  <DetailRow label="Applicants" value={selectedInquiry.applicants ? String(selectedInquiry.applicants) : 'Not provided'} />
                  <DetailRow label="Urgency from customer" value={selectedInquiry.urgency || selectedInquiry.priorityLabel || 'Not provided'} />
                </div>
              </DetailSection>

              <DetailSection title="Documents and Message" description="This section helps staff see whether the request is ready, blocked, or urgent.">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Document status" value={selectedInquiry.documentStatus || 'Not provided'} subtle />
                  <DetailRow label="Document readiness" value={selectedInquiry.documentReadiness || 'Not provided'} subtle />
                </div>
                <div className="mt-3">
                  <DetailRow label="Customer message" value={selectedInquiry.customerMessage || 'No customer message provided.'} subtle />
                </div>
              </DetailSection>

              <DetailSection title="Team Follow-Up">
                <div className="space-y-3">
                  <DetailRow label="Next suggested action" value={selectedInquiry.nextActionHint} subtle />
                  <DetailRow label="Internal notes" value={selectedInquiry.adminNotes || 'No internal notes yet.'} subtle />
                </div>
              </DetailSection>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceInquiriesAdmin;
