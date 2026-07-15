export const CAMPAIGN_AUDIENCE_OPTIONS = [
  {
    value: 'USERS',
    label: 'Users Only',
    description: 'Registered customer accounts still open to future offer emails.',
  },
  {
    value: 'SUBSCRIBERS',
    label: 'Subscribers Only',
    description: 'Active newsletter contacts who joined specifically for updates and offers.',
  },
  {
    value: 'BOTH',
    label: 'Both Audiences',
    description: 'Merge users and subscribers, then remove duplicate email addresses automatically.',
  },
];

export const CAMPAIGN_MESSAGE_TYPES = [
  {
    value: 'PROFESSIONAL_UPDATE',
    label: 'Professional Update',
    eyebrow: 'Operational clarity',
    description: 'For thoughtful travel guidance, service changes, and polished operational updates.',
    bestFor: [
      'Practical travel guidance and timing updates',
      'Polished service communication for customers',
      'Clear next-step notes that should stay professional',
    ],
    defaults: {
      internalName: 'Travel Update Draft',
      subject: 'A calm update from NuurPath',
      title: 'A clear update from the NuurPath team',
      preheader: 'A short and professional note prepared for your selected audience.',
      body: 'We are sharing a clear update from the NuurPath team.\n\nUse this space for practical guidance, timing updates, or next-step communication that should feel professional and direct.',
      highlightTitle: '',
      highlightBody: '',
      ctaLabel: '',
      ctaUrl: '',
      signature: 'NuurPath International\nTravel Support Team',
    },
  },
  {
    value: 'CAMPAIGN',
    label: 'Campaign',
    eyebrow: 'Structured announcement',
    description: 'For planned communication that needs a stronger headline and a guided next step.',
    bestFor: [
      'Announcements that need one strong message',
      'Service launches or wider audience communication',
      'Campaign notes with a guided call to action',
    ],
    defaults: {
      internalName: 'Campaign Draft',
      subject: 'A new update from NuurPath',
      title: 'A focused message for your selected audience',
      preheader: 'A short campaign note that introduces the update clearly before the reader opens the full message.',
      body: 'Use this campaign format when you want to present a new direction, highlight a service path, or gather attention around one important message.',
      highlightTitle: 'Why this matters',
      highlightBody: 'Add a short focused explanation here so the most important point stands out without turning the message into a long announcement.',
      ctaLabel: '',
      ctaUrl: '',
      signature: 'NuurPath International\nTravel Support Team',
    },
  },
  {
    value: 'OFFER',
    label: 'Offer',
    eyebrow: 'Offer spotlight',
    description: 'For package offers, limited highlights, and campaign-style invitation emails.',
    bestFor: [
      'Package promotions and selected offers',
      'Limited highlights that need gentle urgency',
      'Invitation-style emails with a clear opportunity',
    ],
    defaults: {
      internalName: 'Offer Draft',
      subject: 'A special NuurPath offer for {firstName}',
      title: 'A selected offer from NuurPath',
      preheader: 'Use this space to introduce the offer clearly before the full message is opened.',
      body: 'We wanted to share a selected offer from the NuurPath team.\n\nKeep the message calm, direct, and useful so the offer feels professional rather than noisy.',
      highlightTitle: 'Offer highlight',
      highlightBody: 'Summarize the strongest part of the offer here, such as destination, timing, price direction, or a limited availability note.',
      ctaLabel: '',
      ctaUrl: '',
      signature: 'NuurPath International\nTravel Support Team',
    },
  },
  {
    value: 'PILGRIMAGE_GUIDANCE',
    label: 'Pilgrimage Guidance',
    eyebrow: 'Sacred journey note',
    description: 'For Umrah, Hajj, and spiritually respectful preparation messages that should feel calm, helpful, and well guided.',
    bestFor: [
      'Umrah or Hajj preparation reminders',
      'Departure, document, and readiness guidance',
      'Spiritually respectful communication for sacred travel',
    ],
    defaults: {
      internalName: 'Pilgrimage Guidance Draft',
      subject: 'A preparation note for your upcoming journey',
      title: 'A calm guidance note for your sacred journey',
      preheader: 'Use this template for respectful preparation, readiness reminders, and meaningful travel guidance.',
      body: 'We are sharing a thoughtful preparation note from the NuurPath team.\n\nUse this space for journey reminders, document readiness, departure guidance, or spiritually respectful advice that helps the traveler feel calm and prepared.',
      highlightTitle: 'Preparation focus',
      highlightBody: 'Add the most important readiness point here, such as document timing, meeting guidance, departure preparation, or a respectful spiritual reminder for the journey ahead.',
      ctaLabel: '',
      ctaUrl: '',
      signature: 'NuurPath International\nTravel Support Team',
    },
  },
];

export const CAMPAIGN_GREETING_STYLES = [
  {
    value: 'DEAR',
    label: 'Dear',
    description: 'A formal and respectful opening for polished travel communication.',
  },
  {
    value: 'HELLO',
    label: 'Hello',
    description: 'A lighter but still professional opening for general updates and campaigns.',
  },
  {
    value: 'WARM',
    label: 'Warm Greeting',
    description: 'A softer tone that still feels professional for hospitality-style communication.',
  },
];

export const CAMPAIGN_TOKENS = [
  { value: '{firstName}', label: 'First name' },
  { value: '{fullName}', label: 'Full name' },
  { value: '{email}', label: 'Email' },
];

export const EMPTY_CAMPAIGN_FORM = {
  internalName: '',
  subject: '',
  audienceType: 'BOTH',
  messageType: 'PROFESSIONAL_UPDATE',
  greetingStyle: 'DEAR',
  title: '',
  preheader: '',
  body: '',
  highlightTitle: '',
  highlightBody: '',
  ctaLabel: '',
  ctaUrl: '',
  signature: 'NuurPath International\nTravel Support Team',
};

export function getMessageTypeDefinition(messageType) {
  return CAMPAIGN_MESSAGE_TYPES.find((type) => type.value === messageType) || CAMPAIGN_MESSAGE_TYPES[0];
}

export function applyCampaignTemplate(currentForm, messageType) {
  const definition = getMessageTypeDefinition(messageType);
  const nextForm = { ...currentForm, messageType };

  Object.entries(definition.defaults || {}).forEach(([key, value]) => {
    if (!String(nextForm[key] || '').trim()) {
      nextForm[key] = value;
    }
  });

  return nextForm;
}

export function getAudienceCountForSelection(audienceType, audienceReadiness = {}) {
  if (audienceType === 'USERS') {
    return audienceReadiness.usersReachable || 0;
  }

  if (audienceType === 'SUBSCRIBERS') {
    return audienceReadiness.subscribersReachable || 0;
  }

  return audienceReadiness.combinedReachable || 0;
}

export function isCampaignReadyForPreview(formData) {
  return Boolean(
    String(formData.internalName || '').trim()
    && String(formData.subject || '').trim()
    && String(formData.title || '').trim()
    && String(formData.body || '').trim()
    && String(formData.signature || '').trim()
  );
}
