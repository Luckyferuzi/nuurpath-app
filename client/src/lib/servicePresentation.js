function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toLowerText(value) {
  return toText(value).toLowerCase();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function summarize(text, maxLength = 168) {
  const normalized = toText(text);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function getServiceId(service) {
  return service?._id || service?.id || '';
}

export function getServiceIntent(service) {
  const combinedText = `${toLowerText(service?.title)} ${toLowerText(service?.description)}`.trim();

  if (includesAny(combinedText, ['flight', 'ticket', 'airfare'])) {
    return 'flight';
  }

  if (includesAny(combinedText, ['consult', 'advice session', 'appointment'])) {
    return 'consultation';
  }

  if (includesAny(combinedText, ['visa'])) {
    return 'visa';
  }

  if (includesAny(combinedText, ['passport'])) {
    return 'passport';
  }

  if (includesAny(combinedText, ['document'])) {
    return 'document';
  }

  if (includesAny(combinedText, ['hotel', 'accommodation'])) {
    return 'hotel';
  }

  if (includesAny(combinedText, ['package', 'holiday', 'umrah', 'hajj'])) {
    return 'package';
  }

  return 'general';
}

export function getServiceCtaLabel(service) {
  switch (getServiceIntent(service)) {
    case 'flight':
      return 'Ask About Flights';
    case 'consultation':
      return 'Request Consultation';
    case 'passport':
      return 'Start Passport Support';
    case 'visa':
      return 'Start Visa Guidance';
    case 'document':
      return 'Get Document Guidance';
    case 'package':
      return 'Start Service Request';
    case 'hotel':
      return 'Request Travel Support';
    default:
      return 'Start Request';
  }
}

export function getServiceEntryPath(service) {
  const intent = getServiceIntent(service);
  const serviceId = getServiceId(service);

  if (intent === 'flight') {
    return '/book-flight';
  }

  if (intent === 'consultation') {
    return '/book-consultation';
  }

  if (!serviceId) {
    return '/contact';
  }

  return `/services/${serviceId}/request`;
}

export function getServiceRequestMeta(service) {
  const intent = getServiceIntent(service);
  const title = toText(service?.title) || 'Travel service support';
  const description = toText(service?.description);
  const serviceSummary = summarize(description, 220);
  const sharedPaymentNote = 'No online payment is collected on the website. If payment is needed, NuurPath confirms the next step with you after reviewing the request.';
  const sharedResponseNote = 'Our team reviews what you submit here first, then continues with you on WhatsApp using the phone number in this request.';
  const sharedReviewItems = [
    'The travel timing or service timeline you shared',
    'Any document-readiness details you provided',
    'The clearest next step before confirmation or payment',
  ];

  if (intent === 'visa') {
    return {
      intent,
      eyebrow: 'Visa support',
      heading: `Start ${title}`,
      intro: 'Use this page to explain the visa help you need before WhatsApp continuation. Share the destination, timing, and how ready your documents are so the team can guide you properly.',
      cardDescription: serviceSummary || 'Share the visa country, your travel purpose, and your document readiness so NuurPath can guide the next step before WhatsApp continuation.',
      helper: 'Visa approval is decided by the relevant authorities. NuurPath first reviews your destination, travel purpose, and document readiness before advising the next action.',
      submitLabel: 'Send Visa Request',
      summaryTitle: 'Visa request summary',
      countryLabel: 'Visa country or destination',
      countryPlaceholder: 'Example: China, Saudi Arabia, UAE',
      preferredDateLabel: 'Target travel date',
      applicantsLabel: 'Applicants',
      messageLabel: 'What visa help do you need?',
      messagePlaceholder: 'Example: I need China visa guidance for business travel in September. My passport is valid, but I need help with the document checklist and the first steps.',
      checklistTitle: 'Helpful before you submit',
      checklist: [
        'Destination country and the type of travel or visa you need',
        'Expected travel month or target date',
        'Whether your passport and key documents are already ready',
      ],
      responseNote: sharedResponseNote,
      paymentNote: sharedPaymentNote,
      whatWeReview: sharedReviewItems,
    };
  }

  if (intent === 'passport') {
    return {
      intent,
      eyebrow: 'Passport support',
      heading: `Start ${title}`,
      intro: 'Share where you are in the passport process so the team can prepare the right guidance before moving the conversation to WhatsApp.',
      cardDescription: serviceSummary || 'Explain whether you are applying, renewing, correcting, or replacing a passport so the team can guide the right first step.',
      helper: 'NuurPath helps you understand the process, likely requirements, and what should happen next before direct follow-up begins.',
      submitLabel: 'Send Passport Request',
      summaryTitle: 'Passport request summary',
      countryLabel: 'Issuing country or office',
      countryPlaceholder: 'Example: Tanzania passport renewal',
      preferredDateLabel: 'Preferred support date',
      applicantsLabel: 'Applicants',
      messageLabel: 'What passport support do you need?',
      messagePlaceholder: 'Example: I need help renewing a Tanzanian passport. I want to understand the checklist, timing, and whether my current document details are enough.',
      checklistTitle: 'Helpful before you submit',
      checklist: [
        'Whether this is a new passport, renewal, correction, or replacement',
        'Any timeline you are working against',
        'Whether key identity documents are already available',
      ],
      responseNote: sharedResponseNote,
      paymentNote: sharedPaymentNote,
      whatWeReview: sharedReviewItems,
    };
  }

  if (intent === 'document') {
    return {
      intent,
      eyebrow: 'Document support',
      heading: `Start ${title}`,
      intro: 'Tell us which travel documents you need help understanding so NuurPath can prepare the right guidance before direct follow-up.',
      cardDescription: serviceSummary || 'Explain the document gap, the destination, and your timeline so the team can guide the right requirement path before WhatsApp continuation.',
      helper: 'This request helps the team understand what is missing, what is already prepared, and which guidance should come first.',
      submitLabel: 'Send Document Request',
      summaryTitle: 'Document request summary',
      countryLabel: 'Destination country or document area',
      countryPlaceholder: 'Example: Saudi travel documents',
      preferredDateLabel: 'Preferred support date',
      applicantsLabel: 'Applicants',
      messageLabel: 'What document support do you need?',
      messagePlaceholder: 'Example: I need help understanding the travel document requirements for Umrah and which documents I should prepare first.',
      checklistTitle: 'Helpful before you submit',
      checklist: [
        'The destination or travel purpose you are preparing for',
        'Which documents you already have and which are missing',
        'Any deadlines, appointments, or travel windows already known',
      ],
      responseNote: sharedResponseNote,
      paymentNote: sharedPaymentNote,
      whatWeReview: sharedReviewItems,
    };
  }

  if (intent === 'package') {
    return {
      intent,
      eyebrow: 'Travel support',
      heading: `Start ${title}`,
      intro: 'Use this page for package-related support that needs more guidance before you choose or confirm a package. The team will review your needs before WhatsApp continuation.',
      cardDescription: serviceSummary || 'Explain the kind of package support you need, the destination, and the travel timing so NuurPath can guide the best next step.',
      helper: 'This request is useful when you need guidance, comparison, or clarification before choosing the final package direction.',
      submitLabel: 'Send Service Request',
      summaryTitle: 'Travel request summary',
      countryLabel: 'Destination or route',
      countryPlaceholder: 'Example: Makkah and Madinah',
      preferredDateLabel: 'Preferred travel date',
      applicantsLabel: 'Travelers',
      messageLabel: 'What kind of package support do you need?',
      messagePlaceholder: 'Example: I need guidance choosing between two Umrah periods and want to understand which option suits a family group better.',
      checklistTitle: 'Helpful before you submit',
      checklist: [
        'Destination or route you are considering',
        'Travel month, family size, or group size',
        'Any important comfort, budget, or schedule preference',
      ],
      responseNote: sharedResponseNote,
      paymentNote: sharedPaymentNote,
      whatWeReview: sharedReviewItems,
    };
  }

  if (intent === 'hotel') {
    return {
      intent,
      eyebrow: 'Travel support',
      heading: `Start ${title}`,
      intro: 'Share the stay details you already know so the team can advise the next step before the conversation continues on WhatsApp.',
      cardDescription: serviceSummary || 'Explain the destination, dates, and accommodation needs so NuurPath can guide the best next action.',
      helper: 'NuurPath reviews the timing, destination, and accommodation needs you share here before continuing with you directly.',
      submitLabel: 'Send Travel Request',
      summaryTitle: 'Accommodation request summary',
      countryLabel: 'Destination',
      countryPlaceholder: 'Example: Madinah',
      preferredDateLabel: 'Check-in or target date',
      applicantsLabel: 'Guests',
      messageLabel: 'What accommodation help do you need?',
      messagePlaceholder: 'Example: I need family accommodation close to the Haram and want guidance on the best options for our dates.',
      checklistTitle: 'Helpful before you submit',
      checklist: [
        'Destination and expected stay period',
        'Number of guests and room needs',
        'Any location, comfort, or budget preference',
      ],
      responseNote: sharedResponseNote,
      paymentNote: sharedPaymentNote,
      whatWeReview: sharedReviewItems,
    };
  }

  return {
    intent,
    eyebrow: 'Service request',
    heading: `Start ${title}`,
    intro: 'Share the main details of your request so NuurPath can review the first serious step on the website before WhatsApp continuation.',
    cardDescription: serviceSummary || 'Need support with a travel service? Share what you need, the timing, and any important details so the team can guide the next step.',
    helper: 'The website captures the first important details. The team then reviews the request and continues with you directly.',
    submitLabel: 'Send Request',
    summaryTitle: 'Service request summary',
    countryLabel: 'Destination or service focus',
    countryPlaceholder: 'Example: Saudi Arabia, family travel support',
    preferredDateLabel: 'Preferred support date',
    applicantsLabel: 'Applicants',
    messageLabel: 'How can NuurPath help?',
    messagePlaceholder: 'Tell us what you need, the destination or travel plan involved, and anything important our team should review first.',
    checklistTitle: 'Helpful before you submit',
    checklist: [
      'The destination, route, or service type you need help with',
      'Any dates or timing that matter',
      'The main question or decision you want guidance on',
    ],
    responseNote: sharedResponseNote,
    paymentNote: sharedPaymentNote,
    whatWeReview: sharedReviewItems,
  };
}

export function getServicePublicDescription(service) {
  return getServiceRequestMeta(service).cardDescription;
}
