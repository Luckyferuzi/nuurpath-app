export const STAFF_WORKSPACE_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        description: 'Requests, workload, and daily focus.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/notifications',
        label: 'Notifications',
        description: 'Unread alerts and recent inbox activity.',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    id: 'follow-up',
    label: 'Requests',
    items: [
      {
        to: '/admin/package-bookings',
        label: 'Package Requests',
        description: 'Package leads and passport details.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/flight-bookings',
        label: 'Flight Requests',
        description: 'Routes, dates, and quote follow-up.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/service-inquiries',
        label: 'Service Requests',
        description: 'Visa, passport, and document help.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/consultations',
        label: 'Consultations',
        description: 'Booked sessions and notes.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/chat',
        label: 'Customer Chat',
        description: 'Live customer conversations.',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      {
        to: '/admin/packages',
        label: 'Packages',
        description: 'Offers, routes, and public order.',
        roles: ['admin'],
      },
      {
        to: '/admin/services',
        label: 'Services',
        description: 'Public service cards and wording.',
        roles: ['admin'],
      },
      {
        to: '/admin/reviews',
        label: 'Reviews',
        description: 'Testimonials waiting for approval.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/media-posts',
        label: 'Travel Stories',
        description: 'Journey proof and story posts.',
        roles: ['admin'],
      },
      {
        to: '/admin/newsletter',
        label: 'Newsletter',
        description: 'Draft campaigns and subscribers.',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'team',
    label: 'Access',
    items: [
      {
        to: '/admin/users',
        label: 'Accounts',
        description: 'Customers, managers, and admin access.',
        roles: ['admin'],
      },
    ],
  },
];

export const STAFF_PAGE_META = {
  '/admin': {
    title: 'Operations Dashboard',
    description: 'Track queue pressure, workload, and where the team should focus next.',
  },
  '/admin/package-bookings': {
    title: 'Package Requests',
    description: 'Review package requests, passport details, and next-step follow-up in one place.',
  },
  '/admin/notifications': {
    title: 'Notifications',
    description: 'Review every staff alert in one clean inbox and open the right queue quickly.',
  },
  '/admin/flight-bookings': {
    title: 'Flight Requests',
    description: 'Keep flight inquiries organized with clear status, route details, and follow-up.',
  },
  '/admin/service-inquiries': {
    title: 'Service Requests',
    description: 'Handle visa, passport, and document support requests with clearer urgency.',
  },
  '/admin/consultations': {
    title: 'Consultations',
    description: 'See consultation bookings, customer details, and follow-up notes quickly.',
  },
  '/admin/chat': {
    title: 'Customer Chat',
    description: 'Respond to live customer conversations without losing request context.',
  },
  '/admin/packages': {
    title: 'Packages',
    description: 'Create, reorder, and review package content without one long page.',
  },
  '/admin/services': {
    title: 'Services',
    description: 'Maintain public services and keep related inquiries easy to reach.',
  },
  '/admin/reviews': {
    title: 'Reviews',
    description: 'Moderate testimonials and trust content shown publicly.',
  },
  '/admin/media-posts': {
    title: 'Travel Stories',
    description: 'Manage proof posts, journey stories, and destination evidence in one place.',
  },
  '/admin/newsletter': {
    title: 'Newsletter',
    description: 'Shape campaign drafts, send polished communication, and keep subscriber records well organized.',
  },
  '/admin/users': {
    title: 'Accounts',
    description: 'Keep customers, managers, and admins clearly separated and easier to manage.',
  },
};

export function getStaffWorkspaceSections(role) {
  const normalizedRole = String(role || '').toLowerCase();

  return STAFF_WORKSPACE_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(normalizedRole)),
    }))
    .filter((section) => section.items.length > 0);
}

export function isStaffWorkspaceItemActive(pathname, itemPath) {
  const normalizedPath = String(pathname || '');
  const normalizedItemPath = String(itemPath || '');

  if (!normalizedPath || !normalizedItemPath) {
    return false;
  }

  if (normalizedItemPath === '/admin') {
    return normalizedPath === '/admin';
  }

  return normalizedPath === normalizedItemPath || normalizedPath.startsWith(`${normalizedItemPath}/`);
}

export function getStaffPageMeta(pathname) {
  const normalizedPath = String(pathname || '');

  if (STAFF_PAGE_META[normalizedPath]) {
    return STAFF_PAGE_META[normalizedPath];
  }

  const partialMatch = Object.keys(STAFF_PAGE_META)
    .filter((routePath) => routePath !== '/admin' && normalizedPath.startsWith(`${routePath}/`))
    .sort((firstPath, secondPath) => secondPath.length - firstPath.length)[0];

  return partialMatch ? STAFF_PAGE_META[partialMatch] : STAFF_PAGE_META['/admin'];
}
