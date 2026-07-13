const fs = require('fs/promises');
const path = require('path');

const SITE_URL = normalizeOrigin(process.env.REACT_APP_SITE_URL || process.env.SITE_URL || 'https://nuurpath.com');
const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/packages', changefreq: 'daily', priority: '0.9' },
  { path: '/stories', changefreq: 'daily', priority: '0.8' },
  { path: '/book-flight', changefreq: 'weekly', priority: '0.8' },
  { path: '/contact', changefreq: 'weekly', priority: '0.7' },
  { path: '/team', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
];

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeApiBaseUrl(value) {
  const normalizedValue = String(value || '').trim().replace(/\/+$/, '');

  if (!normalizedValue) {
    return 'http://localhost:5000/api';
  }

  if (normalizedValue.endsWith('/api')) {
    return normalizedValue;
  }

  if (normalizedValue.endsWith('/api/')) {
    return normalizedValue.slice(0, -1);
  }

  return `${normalizedValue}/api`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeLastModified(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

async function fetchJson(endpoint) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function toUrlEntry(route) {
  const entry = {
    loc: `${SITE_URL}${route.path}`,
    changefreq: route.changefreq || null,
    priority: route.priority || null,
    lastmod: normalizeLastModified(route.lastmod),
  };

  return entry;
}

function dedupeEntries(entries) {
  const entryMap = new Map();

  entries.forEach((entry) => {
    if (!entry?.loc) {
      return;
    }

    const existingEntry = entryMap.get(entry.loc);

    if (!existingEntry) {
      entryMap.set(entry.loc, entry);
      return;
    }

    entryMap.set(entry.loc, {
      ...existingEntry,
      ...entry,
      lastmod: entry.lastmod || existingEntry.lastmod,
      changefreq: entry.changefreq || existingEntry.changefreq,
      priority: entry.priority || existingEntry.priority,
    });
  });

  return Array.from(entryMap.values()).sort((firstEntry, secondEntry) => (
    firstEntry.loc.localeCompare(secondEntry.loc)
  ));
}

function buildSitemapXml(entries) {
  const body = entries.map((entry) => {
    const lines = ['  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`];

    if (entry.lastmod) {
      lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }

    if (entry.changefreq) {
      lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    }

    if (entry.priority) {
      lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
    }

    lines.push('  </url>');
    return lines.join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n');
}

async function getDynamicEntries() {
  try {
    const [packages, stories, services] = await Promise.all([
      fetchJson('/packages').catch((error) => {
        console.warn(`[sitemap] Unable to fetch packages from ${API_BASE_URL}/packages: ${error.message}`);
        return [];
      }),
      fetchJson('/media-posts').catch((error) => {
        console.warn(`[sitemap] Unable to fetch stories from ${API_BASE_URL}/media-posts: ${error.message}`);
        return [];
      }),
      fetchJson('/services').catch((error) => {
        console.warn(`[sitemap] Unable to fetch services from ${API_BASE_URL}/services: ${error.message}`);
        return [];
      }),
    ]);

    const packageEntries = (Array.isArray(packages) ? packages : []).map((pkg) => toUrlEntry({
      path: `/packages/${pkg.id || pkg._id}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: pkg.updatedAt || pkg.createdAt,
    }));

    const storyEntries = (Array.isArray(stories) ? stories : []).map((story) => toUrlEntry({
      path: `/stories/${story.id}`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: story.updatedAt || story.eventDate || story.createdAt,
    }));

    const serviceEntries = (Array.isArray(services) ? services : []).map((service) => toUrlEntry({
      path: `/services/${service.id}/request`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: service.updatedAt || service.createdAt,
    }));

    return [...packageEntries, ...storyEntries, ...serviceEntries];
  } catch (error) {
    console.warn(`[sitemap] Falling back to static-only sitemap: ${error.message}`);
    return [];
  }
}

async function main() {
  const staticEntries = STATIC_ROUTES.map(toUrlEntry);
  const dynamicEntries = await getDynamicEntries();
  const entries = dedupeEntries([...staticEntries, ...dynamicEntries]);
  const sitemapXml = buildSitemapXml(entries);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(SITEMAP_PATH, sitemapXml, 'utf8');

  console.log(`[sitemap] Generated ${entries.length} URLs at ${SITEMAP_PATH}`);
}

main().catch((error) => {
  console.error('[sitemap] Generation failed:', error);
  process.exitCode = 1;
});
