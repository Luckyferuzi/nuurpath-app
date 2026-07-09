import { CONFIG } from '../config';

function formatTravelDate(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString();
}

export function getWhatsAppNumber() {
  return String(CONFIG.WHATSAPP || '').replace(/\D/g, '');
}

export function normalizeWhatsAppPhoneNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

export function buildWhatsAppUrl(message = '') {
  const number = getWhatsAppNumber();
  const baseUrl = `https://wa.me/${number}`;
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  return trimmedMessage ? `${baseUrl}?text=${encodeURIComponent(trimmedMessage)}` : baseUrl;
}

export function buildDirectWhatsAppUrl(phoneNumber, message = '') {
  const normalizedNumber = normalizeWhatsAppPhoneNumber(phoneNumber);
  if (!normalizedNumber) {
    return '';
  }

  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  const baseUrl = `https://wa.me/${normalizedNumber}`;

  return trimmedMessage ? `${baseUrl}?text=${encodeURIComponent(trimmedMessage)}` : baseUrl;
}

export function buildPackageRequestWhatsAppMessage({
  packageTitle,
  requestId,
  contactName,
  travelDate,
  passengers,
  locationFrom,
}) {
  const lines = [
    'Hello NuurPath team,',
    `I just submitted a package request${requestId ? ` (#${requestId})` : ''}.`,
    packageTitle ? `Package: ${packageTitle}` : '',
    contactName ? `Name: ${contactName}` : '',
    travelDate ? `Preferred travel date: ${formatTravelDate(travelDate)}` : '',
    passengers ? `Travelers: ${passengers}` : '',
    locationFrom ? `Departure city: ${locationFrom}` : '',
    'Please continue with me here on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildPackageRequestWhatsAppUrl(details) {
  return buildWhatsAppUrl(buildPackageRequestWhatsAppMessage(details));
}

export function buildFlightRequestWhatsAppMessage({
  requestId,
  contactName,
  from,
  to,
  departureDate,
  returnDate,
  passengers,
  tripType,
}) {
  const normalizedTripType = tripType || (returnDate ? 'Round Trip' : 'One Way');
  const lines = [
    'Hello NuurPath team,',
    `I submitted a flight request${requestId ? ` (#${requestId})` : ''} on the website.`,
    contactName ? `Name: ${contactName}` : '',
    from && to ? `Route: ${from} to ${to}` : '',
    departureDate ? `Departure date: ${formatTravelDate(departureDate)}` : '',
    returnDate ? `Return date: ${formatTravelDate(returnDate)}` : '',
    passengers ? `Passengers: ${passengers}` : '',
    normalizedTripType ? `Trip type: ${normalizedTripType}` : '',
    'Please continue with me here on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildFlightRequestWhatsAppUrl(details) {
  return buildWhatsAppUrl(buildFlightRequestWhatsAppMessage(details));
}

export function buildServiceInquiryWhatsAppMessage({
  inquiryId,
  contactName,
  serviceTitle,
  country,
  preferredDate,
  message,
}) {
  const lines = [
    'Hello NuurPath team,',
    `I submitted a service request${inquiryId ? ` (#${inquiryId})` : ''} on the website.`,
    serviceTitle ? `Service: ${serviceTitle}` : '',
    contactName ? `Name: ${contactName}` : '',
    country ? `Country or destination: ${country}` : '',
    preferredDate ? `Preferred date: ${formatTravelDate(preferredDate)}` : '',
    message ? `My request: ${message}` : '',
    'Please continue with me here on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildServiceInquiryWhatsAppUrl(details) {
  return buildWhatsAppUrl(buildServiceInquiryWhatsAppMessage(details));
}

export function buildConsultationRequestWhatsAppMessage({
  requestId,
  contactName,
  date,
  time,
  description,
}) {
  const lines = [
    'Hello NuurPath team,',
    `I submitted a private consultation request${requestId ? ` (#${requestId})` : ''} on the website.`,
    contactName ? `Name: ${contactName}` : '',
    date ? `Preferred date: ${date}` : '',
    time ? `Preferred time: ${time}` : '',
    description ? `Details: ${description}` : '',
    'Please continue with me here on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildConsultationRequestWhatsAppUrl(details) {
  return buildWhatsAppUrl(buildConsultationRequestWhatsAppMessage(details));
}

export function buildPackageLeadFollowUpMessage({
  contactName,
  requestId,
  packageTitle,
  status,
  travelDate,
  passengers,
}) {
  const lines = [
    `Hello ${contactName || 'there'}, this is NuurPath.`,
    `We received your package request${requestId ? ` (#${requestId})` : ''}${packageTitle ? ` for ${packageTitle}` : ''}.`,
    status ? `Current step: ${status}.` : '',
    travelDate ? `Preferred travel date: ${formatTravelDate(travelDate)}.` : '',
    passengers ? `Travelers: ${passengers}.` : '',
    'We would like to continue with the next steps on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildFlightLeadFollowUpMessage({
  contactName,
  requestId,
  status,
  from,
  to,
  departureDate,
  returnDate,
}) {
  const lines = [
    `Hello ${contactName || 'there'}, this is NuurPath.`,
    `We received your flight request${requestId ? ` (#${requestId})` : ''}.`,
    from && to ? `Route: ${from} to ${to}.` : '',
    departureDate ? `Departure date: ${formatTravelDate(departureDate)}.` : '',
    returnDate ? `Return date: ${formatTravelDate(returnDate)}.` : '',
    status ? `Current step: ${status}.` : '',
    'We would like to continue with the next steps on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildConsultationLeadFollowUpMessage({
  contactName,
  requestId,
  status,
  date,
  time,
}) {
  const lines = [
    `Hello ${contactName || 'there'}, this is NuurPath.`,
    `We received your private consultation request${requestId ? ` (#${requestId})` : ''}.`,
    date ? `Preferred date: ${date}.` : '',
    time ? `Preferred time: ${time}.` : '',
    status ? `Current step: ${status}.` : '',
    'We would like to continue with the next steps on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildServiceLeadFollowUpMessage({
  contactName,
  requestId,
  status,
  serviceTitle,
  country,
}) {
  const lines = [
    `Hello ${contactName || 'there'}, this is NuurPath.`,
    `We received your service request${requestId ? ` (#${requestId})` : ''}${serviceTitle ? ` for ${serviceTitle}` : ''}.`,
    country ? `Country or destination: ${country}.` : '',
    status ? `Current step: ${status}.` : '',
    'We would like to continue with the next steps on WhatsApp.',
  ].filter(Boolean);

  return lines.join('\n');
}
