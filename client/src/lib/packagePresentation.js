function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getPackageId(pkg) {
  return pkg?._id || pkg?.id || '';
}

export function getPackageTypeLabel(type) {
  const normalized = toText(type);

  if (!normalized) {
    return 'Travel package';
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPackageJourneyStops(pkg) {
  if (!Array.isArray(pkg?.journeyStops)) {
    return [];
  }

  return pkg.journeyStops.filter((stop) => toText(stop?.city));
}

export function getPackageRouteSummary(pkg) {
  const stops = getPackageJourneyStops(pkg).map((stop) => toText(stop.city)).filter(Boolean);

  if (stops.length > 1) {
    return stops.join(' to ');
  }

  if (stops.length === 1) {
    return stops[0];
  }

  return toText(pkg?.destination);
}

export function getPackageShortDescription(description, maxLength = 150) {
  const normalized = toText(description);

  if (!normalized) {
    return 'Guided package planning with staff follow-up after your request.';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function getPackageJourneyLabel(pkg) {
  const route = getPackageRouteSummary(pkg);
  const duration = toText(pkg?.duration);
  const typeLabel = getPackageTypeLabel(pkg?.type).toLowerCase();

  if (route && duration) {
    return `${duration} ${typeLabel} through ${route}`.trim();
  }

  if (route) {
    return `${typeLabel} through ${route}`.trim();
  }

  if (duration) {
    return `${duration} ${typeLabel}`.trim();
  }

  return typeLabel;
}

export function getPackageSupportLine(pkg) {
  const stopCount = getPackageJourneyStops(pkg).length;

  if (stopCount > 1) {
    return `Structured route planning across ${stopCount} journey stops.`;
  }

  return 'NuurPath reviews availability, guidance, and next steps after your request.';
}

export function getPackageHighlights(pkg) {
  const highlights = [];
  const route = getPackageRouteSummary(pkg);
  const duration = toText(pkg?.duration);
  const typeLabel = getPackageTypeLabel(pkg?.type);

  if (route) {
    highlights.push(route);
  }

  if (duration) {
    highlights.push(duration);
  }

  if (typeLabel) {
    highlights.push(typeLabel);
  }

  return highlights.slice(0, 3);
}

export function formatPackagePrice(price, currency = 'USD', rate = 1) {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    return price || 'Price on request';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price * rate);
}
