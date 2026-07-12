import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { formatAdminDate } from '../lib/staffRequestUtils.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffMetricCard,
  StaffPageShell,
} from './staff/WorkspacePrimitives.jsx';

const SUBSCRIBER_FILTERS = [
  { value: 'all', label: 'All subscribers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Unsubscribed' },
];

function buildQueryString({ currentPage, statusFilter, searchTerm }) {
  const params = new URLSearchParams();
  params.set('page', String(currentPage));
  params.set('limit', '12');

  if (statusFilter !== 'all') {
    params.set('status', statusFilter);
  }

  if (searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }

  return params.toString();
}

function getSubscriberFilterOptions(counts = {}) {
  return SUBSCRIBER_FILTERS.map((option) => {
    if (option.value === 'active') {
      return { ...option, count: counts.active || 0 };
    }

    if (option.value === 'inactive') {
      return { ...option, count: counts.inactive || 0 };
    }

    return { ...option, count: counts.total || 0 };
  });
}

const ManageNewsletter = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [actionSubscriberId, setActionSubscriberId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);

    try {
      const queryString = buildQueryString({ currentPage, statusFilter, searchTerm });
      const response = await axios.get(`/newsletter?${queryString}`);
      const data = response.data || {};

      setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
      setCounts(data.counts || {
        total: data.total || 0,
        active: 0,
        inactive: 0,
        thisMonth: 0,
      });
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setFilteredTotal(data.filteredTotal || 0);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load newsletter subscribers.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const metrics = useMemo(() => ([
    {
      label: 'Active Subscribers',
      value: counts.active || 0,
      hint: 'People still subscribed to travel updates and future offers.',
      tone: 'accent',
    },
    {
      label: 'Unsubscribed',
      value: counts.inactive || 0,
      hint: 'Contacts who opted out and should not be treated as active newsletter leads.',
      tone: 'warm',
    },
    {
      label: 'Joined This Month',
      value: counts.thisMonth || 0,
      hint: 'Fresh newsletter interest during the current month.',
      tone: 'default',
    },
    {
      label: 'Current View',
      value: filteredTotal,
      hint: 'Subscribers matching the active filter and search criteria.',
      tone: 'default',
    },
  ]), [counts.active, counts.inactive, counts.thisMonth, filteredTotal]);

  const handleStatusChange = async (subscriber, isActive) => {
    setActionSubscriberId(subscriber.id);
    setError(null);
    setMessage(null);

    try {
      await axios.put(`/newsletter/${subscriber.id}/status`, { isActive });
      await fetchSubscribers();
      setMessage({
        type: 'success',
        text: isActive
          ? 'Subscriber has been reactivated.'
          : 'Subscriber has been marked as unsubscribed.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update subscriber status.');
    } finally {
      setActionSubscriberId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const queryString = buildQueryString({ currentPage, statusFilter, searchTerm });
      const response = await axios.get(`/newsletter/export?${queryString}`, {
        responseType: 'blob',
      });

      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to export subscribers.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading newsletter subscribers...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Growth Operations"
      title="Newsletter"
      description="Track subscriber growth, export active contacts, and manage simple subscribe or unsubscribe status without building a full campaign engine."
      actions={(
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
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

      <StaffCardSection
        title="Filter and Search"
        description="Search by email or switch between active and unsubscribed contacts before exporting the list."
      >
        <div className="space-y-4">
          <StaffFilterPills
            options={getSubscriberFilterOptions(counts)}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Search by email</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search subscribers..."
              className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
            />
          </label>
        </div>
      </StaffCardSection>

      <StaffCardSection
        title="Subscriber List"
        description="This is the lightweight operational list for collection and export. Campaign sending remains out of scope for this release."
      >
        {subscribers.length === 0 ? (
          <StaffEmptyState
            title="No subscribers match this view"
            description="Try another filter or search term, or wait for new newsletter signups from the public website."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {subscribers.map((subscriber) => (
              <article key={subscriber.id} className="rounded-[1.5rem] border border-[#ebe4d3] bg-[#fcfbf8] p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">
                      Joined {formatAdminDate(subscriber.createdAt, 'Recently')}
                    </div>
                    <h3 className="mt-2 text-xl font-black text-[#101c2d]">{subscriber.email}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${subscriber.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {subscriber.isActive ? 'Active' : 'Unsubscribed'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Subscribed</div>
                    <div className="mt-2 text-sm text-[#101c2d]">{formatAdminDate(subscriber.createdAt)}</div>
                  </div>
                  <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Unsubscribed</div>
                    <div className="mt-2 text-sm text-[#101c2d]">
                      {subscriber.unsubscribedAt ? formatAdminDate(subscriber.unsubscribedAt) : 'Still active'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {subscriber.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(subscriber, false)}
                      disabled={actionSubscriberId === subscriber.id}
                      className="rounded-full border border-amber-200 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Unsubscribed
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(subscriber, true)}
                      disabled={actionSubscriberId === subscriber.id}
                      className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </StaffCardSection>

      {totalPages > 1 && (
        <StaffCardSection title="Browse More Subscribers" description="Move between pages when the list grows so the workspace stays simple to scan.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-[#67707e]">
              Page <span className="font-bold text-[#101c2d]">{currentPage}</span> of <span className="font-bold text-[#101c2d]">{totalPages}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-full bg-[#101c2d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </StaffCardSection>
      )}
    </StaffPageShell>
  );
};

export default ManageNewsletter;
