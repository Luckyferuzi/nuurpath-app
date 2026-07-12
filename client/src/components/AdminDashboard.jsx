import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { StaffCardSection, StaffInfoPill, StaffMetricCard, StaffPageShell } from './staff/WorkspacePrimitives.jsx';
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
    overdueFollowUps: 0,
    waitingForDocuments: 0,
    unassignedOpenRequests: 0,
    totalPackageRequests: 0,
    totalFlightRequests: 0,
    totalConsultations: 0,
    totalServiceInquiries: 0,
    publishedMediaPosts: 0,
    activeNewsletterSubscribers: 0,
    conversionSummary: {
      wonCount: 0,
      lostCount: 0,
      conversionRate: 0,
    },
    attentionSummary: [],
    openRequestBreakdown: [],
    teamWorkload: [],
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
      label: 'Overdue Follow-Up',
      value: loading ? '...' : stats.overdueFollowUps,
      hint: 'Requests that have gone too long without the next team touch.',
      tone: 'danger',
    },
    {
      label: 'Unassigned Open',
      value: loading ? '...' : stats.unassignedOpenRequests,
      hint: 'Open requests that still need a clear owner.',
      tone: 'warm',
    },
    {
      label: 'Waiting Documents',
      value: loading ? '...' : stats.waitingForDocuments,
      hint: 'Open work currently blocked by missing customer documents or details.',
      tone: 'default',
    },
  ];

  const queueMetrics = [
    { label: 'New Requests', value: loading ? '...' : stats.newRequests, hint: 'Fresh requests that still need the first response.', tone: 'default' },
    { label: 'Ready Follow-Up', value: loading ? '...' : stats.activeFollowUps, hint: 'Requests already moving through contact, documents, or quotation.', tone: 'warm' },
    { label: 'Confirmed or Done', value: loading ? '...' : stats.completedRequests, hint: 'Requests already confirmed offline or fully completed.', tone: 'accent' },
    { label: 'Conversion Rate', value: loading ? '...' : `${stats.conversionSummary?.conversionRate || 0}%`, hint: 'Won versus lost outcomes among handled requests.', tone: 'accent' },
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
        `Overdue follow-up: ${loading ? '...' : stats.overdueFollowUps}`,
        `Waiting for documents: ${loading ? '...' : stats.waitingForDocuments}`,
        `Unassigned open work: ${loading ? '...' : stats.unassignedOpenRequests}`,
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
                    data={(stats.openRequestBreakdown && stats.openRequestBreakdown.length > 0) ? stats.openRequestBreakdown : stats.requestDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={4}
                    dataKey="value"
                    label
                  >
                    {((stats.openRequestBreakdown && stats.openRequestBreakdown.length > 0) ? stats.openRequestBreakdown : stats.requestDistribution || []).map((entry, index) => (
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <StaffCardSection title="Open Queue Pressure" description="These counts help the team see where the operational pressure is building right now.">
          <div className="grid gap-4 md:grid-cols-2">
            {(stats.attentionSummary || []).map((item) => (
              <div key={item.name} className="rounded-[1.5rem] border border-[#efe8d8] bg-[#fbfaf7] p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7443]">{item.name}</div>
                <div className="mt-4 text-3xl font-black text-[#101c2d]">{loading ? '...' : item.value}</div>
              </div>
            ))}
          </div>
        </StaffCardSection>

        <StaffCardSection title="Team Ownership" description="See who is carrying active work, where follow-up is aging, and where support may be needed.">
          <div className="space-y-4">
            {(stats.teamWorkload || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d8cdb7] bg-[#fbfaf7] px-5 py-6 text-sm text-[#67707e]">
                No assigned staff workload is available yet.
              </div>
            ) : (
              (stats.teamWorkload || []).map((member) => (
                <div key={member.id} className="rounded-[1.5rem] border border-[#efe8d8] bg-[#fbfaf7] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-[#101c2d]">{member.name || member.email}</h3>
                      <p className="mt-1 text-sm text-[#67707e]">{member.email}</p>
                    </div>
                    <StaffInfoPill tone={String(member.role || '').toLowerCase() === 'admin' ? 'dark' : 'info'}>
                      {String(member.role || '').toLowerCase() === 'admin' ? 'Admin' : 'Manager'}
                    </StaffInfoPill>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Open queue</div>
                      <div className="mt-2 text-2xl font-black text-[#101c2d]">{loading ? '...' : member.openRequests}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Overdue</div>
                      <div className="mt-2 text-2xl font-black text-[#b42318]">{loading ? '...' : member.overdueFollowUps}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Waiting docs</div>
                      <div className="mt-2 text-2xl font-black text-[#8a7443]">{loading ? '...' : member.waitingForDocuments}</div>
                    </div>
                    <div className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Won or done</div>
                      <div className="mt-2 text-2xl font-black text-[#006837]">{loading ? '...' : member.wonRequests}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </StaffCardSection>
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
