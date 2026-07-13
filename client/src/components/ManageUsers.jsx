import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatAdminDate } from '../lib/staffRequestUtils.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffMetricCard,
  StaffPageShell,
  StaffSectionTabs,
} from './staff/WorkspacePrimitives.jsx';

const ACCOUNT_FILTERS = [
  { value: 'all', label: 'All accounts' },
  { value: 'staff', label: 'Staff' },
  { value: 'customers', label: 'Customers' },
  { value: 'manager', label: 'Managers' },
  { value: 'admin', label: 'Admins' },
];

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return value || 'user';
}

function getRoleLabel(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'admin') {
    return 'Admin';
  }

  if (normalizedRole === 'manager') {
    return 'Manager';
  }

  return 'Customer';
}

function getRoleBadgeClassName(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'admin') {
    return 'bg-[#101c2d] text-white';
  }

  if (normalizedRole === 'manager') {
    return 'bg-[#d8c79a] text-[#101c2d]';
  }

  return 'bg-gray-100 text-gray-700';
}

function matchesAccountFilter(user, filterValue) {
  const role = normalizeRole(user?.role);

  if (filterValue === 'all') {
    return true;
  }

  if (filterValue === 'staff') {
    return role === 'admin' || role === 'manager';
  }

  if (filterValue === 'customers') {
    return role === 'user';
  }

  return role === filterValue;
}

function getAccountFilterOptions(users) {
  return ACCOUNT_FILTERS.map((option) => ({
    ...option,
    count: users.filter((user) => matchesAccountFilter(user, option.value)).length,
  }));
}

function roleOptionsForForm(editingId) {
  if (editingId) {
    return [
      { value: 'user', label: 'Customer' },
      { value: 'manager', label: 'Manager' },
      { value: 'admin', label: 'Admin' },
    ];
  }

  return [
    { value: 'user', label: 'Customer' },
    { value: 'manager', label: 'Manager' },
  ];
}

function AccountCard({
  account,
  isCurrentUser,
  canDelete,
  onEdit,
  onDelete,
}) {
  const joinedDate = formatAdminDate(account.createdAt, 'Not recorded');

  return (
    <article className="rounded-[1.5rem] border border-[#ebe4d3] bg-[#fcfbf8] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#101c2d]">{account.name || 'Unnamed account'}</h3>
          <p className="mt-2 text-sm text-[#67707e]">{account.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${getRoleBadgeClassName(account.role)}`}>
            {getRoleLabel(account.role)}
          </span>
          {isCurrentUser && (
            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-green-700">
              Current session
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#efe8d8] bg-white px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Portal</div>
          <div className="mt-2 text-sm text-[#101c2d]">
            {normalizeRole(account.role) === 'user' ? 'Customer account dashboard' : 'Staff login at /staff/login'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#efe8d8] bg-white px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Joined</div>
          <div className="mt-2 text-sm text-[#101c2d]">{joinedDate}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onEdit(account)}
          className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
        >
          Edit Account
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(account.id)}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
          >
            Delete
          </button>
        ) : (
          <span className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500">
            Self-delete is blocked
          </span>
        )}
      </div>
    </article>
  );
}

const ManageUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState('overview');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get(`/users?page=${currentPage}`);
      const data = response.data;

      if (data?.users) {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.currentPage || 1);
      } else {
        setUsers(Array.isArray(data) ? data : []);
        setTotalPages(1);
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((account) => {
      if (!matchesAccountFilter(account, roleFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(account.name || '').toLowerCase().includes(term) ||
        String(account.email || '').toLowerCase().includes(term) ||
        String(getRoleLabel(account.role)).toLowerCase().includes(term)
      );
    });
  }, [roleFilter, searchTerm, users]);

  const staffAccounts = filteredUsers.filter((account) => ['admin', 'manager'].includes(normalizeRole(account.role)));
  const customerAccounts = filteredUsers.filter((account) => normalizeRole(account.role) === 'user');

  const metrics = [
    {
      label: 'Accounts on This Page',
      value: users.length,
      hint: 'The backend keeps user management paginated so the workspace stays fast and readable.',
      tone: 'default',
    },
    {
      label: 'Staff Accounts',
      value: users.filter((account) => ['admin', 'manager'].includes(normalizeRole(account.role))).length,
      hint: 'Admins and managers are separated from customer accounts in the workspace views below.',
      tone: 'accent',
    },
    {
      label: 'Customer Accounts',
      value: users.filter((account) => normalizeRole(account.role) === 'user').length,
      hint: 'These are customer-facing accounts that sign in through the public website.',
      tone: 'warm',
    },
    {
      label: 'Current Page',
      value: `${currentPage}/${totalPages}`,
      hint: 'Move between pages to review older accounts without crowding one screen.',
      tone: 'default',
    },
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
    });
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
  };

  const openCreatePanel = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
    });
    setEditingId(null);
    setShowForm(true);
    setActivePanel('access');
    setMessage(null);
    setError(null);
  };

  const handleEdit = (account) => {
    setFormData({
      name: account.name || '',
      email: account.email || '',
      password: '',
      role: normalizeRole(account.role),
    });
    setEditingId(account.id);
    setShowForm(true);
    setActivePanel('access');
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (userId) => {
    const currentUserId = String(currentUser?._id || currentUser?.id || '');
    if (String(userId) === currentUserId) {
      setError('You cannot delete your own account.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      await axios.delete(`/users/${userId}`);
      setMessage({ type: 'success', text: 'Account deleted successfully.' });
      setError(null);

      if (users.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        fetchUsers();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete user.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingId) {
        await axios.put(`/users/${editingId}`, payload);
        setMessage({ type: 'success', text: 'Account updated successfully.' });
        await fetchUsers();
      } else {
        await axios.post('/users', payload);
        setMessage({ type: 'success', text: 'Account created successfully.' });

        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          await fetchUsers();
        }
      }

      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save user.');
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading user accounts...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Access"
      title="Accounts"
      description="Keep customer accounts, managers, and admins in cleaner work areas so access control stays easier to follow."
      actions={(
        <button
          type="button"
          onClick={openCreatePanel}
          className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
        >
          {editingId ? 'Start New Account' : 'Add Customer or Manager'}
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

      <StaffSectionTabs
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'access', label: editingId ? 'Edit Account' : 'Add Account' },
          { value: 'directory', label: 'Directory', count: users.length },
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
            title="Account workspace"
            description="Separate account creation, access rules, and list browsing so staff management feels more controlled."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Create access</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Customer or manager</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Create customer and manager accounts here without mixing this work into the public website experience.
                </p>
                <button
                  type="button"
                  onClick={openCreatePanel}
                  className="mt-5 rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                >
                  Open Account Form
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Staff roles</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Managers and admins</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Review staff accounts separately so operational access stays visible without customer accounts crowding the view.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('staff');
                    setActivePanel('directory');
                  }}
                  className="mt-5 rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Staff Directory
                </button>
              </article>

              <article className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Customer accounts</div>
                <h3 className="mt-3 text-xl font-black text-[#101c2d]">Public users</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6472]">
                  Review customer accounts on their own so support work is not buried under manager and admin access tasks.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter('customers');
                    setActivePanel('directory');
                  }}
                  className="mt-5 rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white"
                >
                  Open Customer Directory
                </button>
              </article>
            </div>
          </StaffCardSection>
        </>
      )}

      {activePanel === 'access' && showForm && (
        <StaffCardSection
          title={editingId ? 'Edit Account' : 'Create Customer or Manager'}
          description={editingId
            ? 'Update the account details, role, or password without mixing this work into the customer-facing experience.'
            : 'New accounts created here can be customers or managers. First-time admin registration remains locked to the one-time setup flow.'}
        >
          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-4">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7443]">Manager access</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6472]">
                Managers do not register on the public website. Create them here, then they sign in through <span className="font-semibold text-[#101c2d]">/staff/login</span>.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] p-4">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7443]">Admin protection</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6472]">
                The one-time admin registration page at <span className="font-semibold text-[#101c2d]">/staff/setup</span> stays closed after first use, so admin signup never appears in the customer UI.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Full name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Email</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Password {editingId ? '(leave blank to keep current)' : ''}
              </span>
              <input
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                required={!editingId}
                minLength={6}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Role</span>
              <select
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
              >
                {roleOptionsForForm(editingId).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="lg:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? 'Saving...' : editingId ? 'Save Account Changes' : 'Create Account'}
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

      {activePanel === 'access' && !showForm && (
        <StaffEmptyState
          title="No account form open"
          description="Start a new customer or manager account, or choose an existing account from the directory when you want to edit it."
          action={(
            <button
              type="button"
              onClick={openCreatePanel}
              className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
            >
              Add Account
            </button>
          )}
        />
      )}

      {activePanel === 'directory' && (
        <>
          <StaffCardSection
            title="Filter and Search"
            description="These filters organize the currently loaded account page so staff and customer records do not feel mixed together."
          >
            <div className="space-y-4">
              <StaffFilterPills
                options={getAccountFilterOptions(users)}
                value={roleFilter}
                onChange={setRoleFilter}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Search by name, email, or role</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search accounts on this page..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>
          </StaffCardSection>

          <div className="grid gap-6 xl:grid-cols-2">
            <StaffCardSection
              title="Staff Accounts"
              description="Admins and managers are grouped here so operational access is easy to inspect."
            >
              {staffAccounts.length === 0 ? (
                <StaffEmptyState
                  title="No staff accounts in this view"
                  description="Try another filter or move to another page if you are looking for older staff records."
                />
              ) : (
                <div className="space-y-4">
                  {staffAccounts.map((account) => {
                    const accountId = String(account.id);
                    const currentUserId = String(currentUser?._id || currentUser?.id || '');

                    return (
                      <AccountCard
                        key={account.id}
                        account={account}
                        isCurrentUser={accountId === currentUserId}
                        canDelete={accountId !== currentUserId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              )}
            </StaffCardSection>

            <StaffCardSection
              title="Customer Accounts"
              description="Public website users are shown separately so customer support does not get buried inside staff management."
            >
              {customerAccounts.length === 0 ? (
                <StaffEmptyState
                  title="No customer accounts in this view"
                  description="Try another filter or move to another page if you are looking for older customer records."
                />
              ) : (
                <div className="space-y-4">
                  {customerAccounts.map((account) => {
                    const accountId = String(account.id);
                    const currentUserId = String(currentUser?._id || currentUser?.id || '');

                    return (
                      <AccountCard
                        key={account.id}
                        account={account}
                        isCurrentUser={accountId === currentUserId}
                        canDelete={accountId !== currentUserId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              )}
            </StaffCardSection>
          </div>

          {totalPages > 1 && (
            <StaffCardSection title="Browse More Accounts" description="Move between pages to review older records without overloading one screen.">
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
        </>
      )}
    </StaffPageShell>
  );
};

export default ManageUsers;
