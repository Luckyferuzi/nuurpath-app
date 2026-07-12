import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { StaffCardSection, StaffMetricCard, StaffPageShell } from './staff/WorkspacePrimitives.jsx';
import { getStaffWorkspaceSections } from '../lib/staffWorkspace.js';

const CHART_COLORS = ['#006837', '#D4AF37', '#0B1C3E', '#5c7cfa'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pipelineValue: 0,
    newRequests: 0,
    activeFollowUps: 0,
    completedRequests: 0,
    lostOrCancelled: 0,
    totalPackageRequests: 0,
    totalFlightRequests: 0,
    totalConsultations: 0,
    totalServiceInquiries: 0,
    publishedMediaPosts: 0,
    activeNewsletterSubscribers: 0,
    trends: [],
    requestDistribution: [],
  });
  const [loading, setLoading] = useState(true);

  const role = String(user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navigationSections = useMemo(() => (
    getStaffWorkspaceSections(role)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.to !== '/admin'),
      }))
      .filter((section) => section.items.length > 0)
  ), [role]);

  const topMetrics = [
    {
      label: 'Request Value',
      value: loading ? '...' : `$${(stats.pipelineValue || 0).toLocaleString()}`,
      hint: 'Estimated open package-request value that is still in motion.',
      tone: 'accent',
    },
    {
      label: 'New Requests',
      value: loading ? '...' : stats.newRequests,
      hint: 'Fresh requests that still need the first team response.',
      tone: 'default',
    },
    {
      label: 'Ready Follow-Up',
      value: loading ? '...' : stats.activeFollowUps,
      hint: 'Requests already moving through contact, documents, or quotation.',
      tone: 'warm',
    },
    {
      label: 'Confirmed or Done',
      value: loading ? '...' : stats.completedRequests,
      hint: 'Requests already confirmed offline or fully completed.',
      tone: 'default',
    },
  ];

  const queueMetrics = [
    { label: 'Package Requests', value: loading ? '...' : stats.totalPackageRequests, hint: 'Package leads in the system.', tone: 'accent' },
    { label: 'Flight Requests', value: loading ? '...' : stats.totalFlightRequests, hint: 'Flight inquiries waiting or in follow-up.', tone: 'warm' },
    { label: 'Consultations', value: loading ? '...' : stats.totalConsultations, hint: 'Private consultation bookings to review.', tone: 'default' },
    { label: 'Service Requests', value: loading ? '...' : stats.totalServiceInquiries, hint: 'Visa and passport support requests.', tone: 'default' },
    { label: 'Customers', value: loading ? '...' : stats.totalUsers, hint: 'Customer accounts in the platform.', tone: 'default' },
    { label: 'Closed Requests', value: loading ? '...' : stats.lostOrCancelled, hint: 'Cancelled or lost requests for review.', tone: 'danger' },
    ...(isAdmin ? [
      { label: 'Published Stories', value: loading ? '...' : stats.publishedMediaPosts, hint: 'Travel evidence posts already live on the homepage.', tone: 'accent' },
      { label: 'Active Subscribers', value: loading ? '...' : stats.activeNewsletterSubscribers, hint: 'Newsletter contacts still subscribed to future updates.', tone: 'warm' },
    ] : []),
  ];

  const quickQueues = [
    {
      title: 'Requests needing quick attention',
      items: [
        `New requests: ${loading ? '...' : stats.newRequests}`,
        `Active follow-up: ${loading ? '...' : stats.activeFollowUps}`,
        `Closed or lost: ${loading ? '...' : stats.lostOrCancelled}`,
      ],
    },
    {
      title: 'What this workspace supports',
      items: [
        'Clear follow-up lists for packages, flights, consultations, and services.',
        'Separate admin-only areas for content, services, and people management.',
        'Cleaner mobile and tablet navigation for urgent follow-up situations.',
      ],
    },
  ];

  return (
    <StaffPageShell
      eyebrow={isAdmin ? 'Admin Overview' : 'Manager Overview'}
      title={isAdmin ? 'Operations Dashboard' : 'Lead Follow-Up Dashboard'}
      description="Use this space to understand the current request volume, jump into the right queue fast, and keep the team workspace easier to read from desktop down to mobile."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topMetrics.map((metric) => (
          <StaffMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {queueMetrics.map((metric) => (
          <StaffMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <StaffCardSection title="Request Trends" description="Monthly movement across package, flight, consultation, and service requests.">
          <div className="h-[320px]">
            <ResponsiveContainer>
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d2" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Packages" stroke="#006837" strokeWidth={2} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Flights" stroke="#D4AF37" strokeWidth={2} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Consultations" stroke="#0B1C3E" strokeWidth={2} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Services" stroke="#5c7cfa" strokeWidth={2} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </StaffCardSection>

        <div className="space-y-6">
          <StaffCardSection title="Request Mix" description="See which request type is taking the largest share right now.">
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats.requestDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={4}
                    dataKey="value"
                    label
                  >
                    {(stats.requestDistribution || []).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </StaffCardSection>

          <StaffCardSection title="Daily Focus" description="A short view of what usually matters most when the team starts work.">
            <div className="space-y-4">
              {quickQueues.map((queue) => (
                <div key={queue.title} className="rounded-2xl border border-[#efe8d8] bg-[#fbfaf7] p-4">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#101c2d]">{queue.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#67707e]">
                    {queue.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </StaffCardSection>
        </div>
      </div>

      <StaffCardSection title="Workspace Areas" description="These grouped links help staff move through the workspace without hunting across unrelated pages.">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {navigationSections.map((section) => (
            <div key={section.id} className="rounded-[1.5rem] border border-[#efe8d8] bg-[#fbfaf7] p-5">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7443]">{section.label}</div>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block rounded-2xl border border-white bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="text-base font-bold text-[#101c2d]">{item.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[#67707e]">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </StaffCardSection>
    </StaffPageShell>
  );
};

export default AdminDashboard;
