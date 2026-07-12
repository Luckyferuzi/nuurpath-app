export const STAFF_WORKSPACE_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        to: '/admin',
        label: 'Dashboard',
        description: 'See the big picture and active queues.',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    id: 'follow-up',
    label: 'Request Follow-Up',
    items: [
      {
        to: '/admin/package-bookings',
        label: 'Package Requests',
        description: 'Travel package leads and passport details.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/flight-bookings',
        label: 'Flight Requests',
        description: 'Routes, quotes, and travel follow-up.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/service-inquiries',
        label: 'Service Requests',
        description: 'Visa, passport, and document support.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/consultations',
        label: 'Consultations',
        description: 'Private consultation bookings and notes.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/chat',
        label: 'Customer Chat',
        description: 'Live staff-to-customer conversations.',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    id: 'content',
    label: 'Content and Trust',
    items: [
      {
        to: '/admin/packages',
        label: 'Packages',
        description: 'Manage offers, journey routes, and order.',
        roles: ['admin'],
      },
      {
        to: '/admin/services',
        label: 'Services',
        description: 'Keep support services clear and current.',
        roles: ['admin'],
      },
      {
        to: '/admin/reviews',
        label: 'Reviews',
        description: 'Approve social proof and testimonials.',
        roles: ['admin', 'manager'],
      },
      {
        to: '/admin/media-posts',
        label: 'Travel Evidence',
        description: 'Publish trusted journey proof and story posts.',
        roles: ['admin'],
      },
      {
        to: '/admin/newsletter',
        label: 'Newsletter',
        description: 'Review subscribers and export active contacts.',
        roles: ['admin'],
      },
    ],
  },
  {
    id: 'team',
    label: 'People',
    items: [
      {
        to: '/admin/users',
        label: 'Users and Staff',
        description: 'Separate customers, managers, and admins.',
        roles: ['admin'],
      },
    ],
  },
];

export const STAFF_PAGE_META = {
  '/admin': {
    title: 'Operations Dashboard',
    description: 'Track request volume, follow-up queues, and where the team should focus next.',
  },
  '/admin/package-bookings': {
    title: 'Package Requests',
    description: 'Review customer travel requests, passport details, and package follow-up from one place.',
  },
  '/admin/flight-bookings': {
    title: 'Flight Requests',
    description: 'Keep flight inquiries organized with clear status, route details, and next-step follow-up.',
  },
  '/admin/service-inquiries': {
    title: 'Service Requests',
    description: 'Handle visa, passport, and document-support requests with less clutter and clearer urgency.',
  },
  '/admin/consultations': {
    title: 'Consultations',
    description: 'See scheduled consultation requests, customer details, and internal follow-up notes quickly.',
  },
  '/admin/chat': {
    title: 'Customer Chat',
    description: 'Stay close to live customer conversations and respond without losing request context.',
  },
  '/admin/packages': {
    title: 'Packages',
    description: 'Manage package content, route structure, and public ordering without overwhelming forms.',
  },
  '/admin/services': {
    title: 'Services',
    description: 'Maintain service offerings while keeping related inquiries easy to reach.',
  },
  '/admin/reviews': {
    title: 'Reviews',
    description: 'Moderate testimonials and trust content that customers see publicly.',
  },
  '/admin/media-posts': {
    title: 'Travel Evidence',
    description: 'Manage public proof posts, journey stories, and destination evidence in one place.',
  },
  '/admin/newsletter': {
    title: 'Newsletter',
    description: 'Track subscribers, export contacts, and keep newsletter collection operationally simple.',
  },
  '/admin/users': {
    title: 'Users and Staff',
    description: 'Keep customer accounts, managers, and admins clearly separated and easier to manage.',
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
