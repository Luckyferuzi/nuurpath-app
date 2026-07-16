import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { formatAdminDate } from '../lib/staffRequestUtils.js';
import {
  applyCampaignTemplate,
  CAMPAIGN_AUDIENCE_OPTIONS,
  CAMPAIGN_GREETING_STYLES,
  CAMPAIGN_MESSAGE_TYPES,
  CAMPAIGN_TOKENS,
  EMPTY_CAMPAIGN_FORM,
  getAudienceCountForSelection,
  isCampaignReadyForPreview,
} from '../lib/newsletterCampaigns.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffInfoPill,
  StaffPageShell,
  StaffSectionTabs,
} from './staff/WorkspacePrimitives.jsx';
import NewsletterCampaignPreview from './newsletter/NewsletterCampaignPreview.jsx';
import NewsletterCampaignDraftCard from './newsletter/NewsletterCampaignDraftCard.jsx';
import NewsletterCampaignHistoryCard from './newsletter/NewsletterCampaignHistoryCard.jsx';

const SUBSCRIBER_FILTERS = [
  { value: 'all', label: 'All subscribers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Unsubscribed' },
];

const NEWSLETTER_WORKSPACE_TABS = [
  { value: 'compose', label: 'Compose' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'history', label: 'History' },
  { value: 'subscribers', label: 'Subscribers' },
];

const DEFAULT_PREVIEW_RECIPIENT = {
  id: 'neutral-preview',
  name: 'Valued Traveler',
  email: 'traveler@example.com',
  sourceLabel: 'Neutral preview',
};

const INITIAL_CAMPAIGN_FORM = { ...EMPTY_CAMPAIGN_FORM };

function normalizeComposerText(value) {
  return String(value || '').trim();
}

function buildCampaignSubmissionPayload(formData = {}) {
  const normalizedSubject = normalizeComposerText(formData.subject);
  const normalizedTitle = normalizeComposerText(formData.title) || normalizedSubject || 'Message from NuurPath';
  const normalizedInternalName = normalizeComposerText(formData.internalName) || normalizedSubject || normalizedTitle || 'Newsletter Draft';
  const normalizedSignature = normalizeComposerText(formData.signature) || INITIAL_CAMPAIGN_FORM.signature;

  return {
    ...formData,
    internalName: normalizedInternalName,
    title: normalizedTitle,
    signature: normalizedSignature,
  };
}

function shouldOpenAdvancedComposer(formData = {}) {
  const normalizedSubject = normalizeComposerText(formData.subject);
  const normalizedSignature = normalizeComposerText(formData.signature);

  return Boolean(
    (normalizeComposerText(formData.internalName) && normalizeComposerText(formData.internalName) !== normalizedSubject)
    || (normalizeComposerText(formData.title) && normalizeComposerText(formData.title) !== normalizedSubject)
    || normalizeComposerText(formData.preheader)
    || normalizeComposerText(formData.highlightTitle)
    || normalizeComposerText(formData.highlightBody)
    || normalizeComposerText(formData.ctaLabel)
    || normalizeComposerText(formData.ctaUrl)
    || formData.greetingStyle === 'HELLO'
    || formData.greetingStyle === 'WARM'
    || (normalizedSignature && normalizedSignature !== normalizeComposerText(INITIAL_CAMPAIGN_FORM.signature))
  );
}

function buildQueryString({ currentPage, statusFilter, searchTerm }) {
  const params = new URLSearchParams();
  params.set('page', String(currentPage));
  params.set('limit', '12');

  if (statusFilter !== 'all') {
    params.set('status', statusFilter);
  }

  if (searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }

  return params.toString();
}

function getSubscriberFilterOptions(counts = {}) {
  return SUBSCRIBER_FILTERS.map((option) => {
    if (option.value === 'active') {
      return { ...option, count: counts.active || 0 };
    }

    if (option.value === 'inactive') {
      return { ...option, count: counts.inactive || 0 };
    }

    return { ...option, count: counts.total || 0 };
  });
}

function normalizeCampaignFormData(campaign = {}) {
  return {
    internalName: campaign.internalName || '',
    subject: campaign.subject || '',
    audienceType: campaign.audienceType || 'BOTH',
    messageType: campaign.messageType || 'PROFESSIONAL_UPDATE',
    greetingStyle: campaign.greetingStyle || 'DEAR',
    title: campaign.title || '',
    preheader: campaign.preheader || '',
    body: campaign.body || '',
    highlightTitle: campaign.highlightTitle || '',
    highlightBody: campaign.highlightBody || '',
    ctaLabel: campaign.ctaLabel || '',
    ctaUrl: campaign.ctaUrl || '',
    signature: campaign.signature || INITIAL_CAMPAIGN_FORM.signature,
  };
}

function getCampaignTabOptions(draftsCount, historyCount, subscribersCount) {
  return NEWSLETTER_WORKSPACE_TABS.map((tab) => {
    if (tab.value === 'drafts') {
      return { ...tab, count: draftsCount };
    }

    if (tab.value === 'history') {
      return { ...tab, count: historyCount };
    }

    if (tab.value === 'subscribers') {
      return { ...tab, count: subscribersCount };
    }

    return tab;
  });
}

const ManageNewsletter = () => {
  const [activePanel, setActivePanel] = useState('compose');
  const [subscribers, setSubscribers] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    thisMonth: 0,
  });
  const [audienceReadiness, setAudienceReadiness] = useState({
    subscribersReachable: 0,
    usersReachable: 0,
    combinedReachable: 0,
    suppressed: 0,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [previewRecipients, setPreviewRecipients] = useState([DEFAULT_PREVIEW_RECIPIENT]);
  const [campaignForm, setCampaignForm] = useState(INITIAL_CAMPAIGN_FORM);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedPreviewRecipientId, setSelectedPreviewRecipientId] = useState(DEFAULT_PREVIEW_RECIPIENT.id);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);
  const [testingCampaignId, setTestingCampaignId] = useState(null);
  const [sendingCampaignId, setSendingCampaignId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [actionSubscriberId, setActionSubscriberId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAdvancedComposer, setShowAdvancedComposer] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  const fetchSubscribers = useCallback(async ({ withLoading = true } = {}) => {
    if (withLoading) {
      setLoading(true);
    }

    try {
      const queryString = buildQueryString({ currentPage, statusFilter, searchTerm });
      const response = await axios.get(`/newsletter?${queryString}`);
      const data = response.data || {};

      setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
      setCounts(data.counts || {
        total: data.total || 0,
        active: 0,
        inactive: 0,
        thisMonth: 0,
      });
      setAudienceReadiness(data.audienceReadiness || {
        subscribersReachable: 0,
        usersReachable: 0,
        combinedReachable: 0,
        suppressed: 0,
      });
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setFilteredTotal(data.filteredTotal || 0);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.msg || err.message || 'Failed to load newsletter subscribers.');
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  }, [currentPage, searchTerm, statusFilter]);

  const fetchCampaignWorkspace = useCallback(async () => {
    setCampaignsLoading(true);

    try {
      const [campaignsResponse, recipientsResponse] = await Promise.all([
        axios.get('/newsletter/campaigns'),
        axios.get('/newsletter/preview-recipients'),
      ]);

      const nextCampaigns = Array.isArray(campaignsResponse.data?.campaigns) ? campaignsResponse.data.campaigns : [];
      const nextRecipients = [
        DEFAULT_PREVIEW_RECIPIENT,
        ...(Array.isArray(recipientsResponse.data?.recipients) ? recipientsResponse.data.recipients : []),
      ];

      setCampaigns(nextCampaigns);
      setPreviewRecipients(nextRecipients);
      setSelectedPreviewRecipientId((currentId) => (
        nextRecipients.some((recipient) => recipient.id === currentId)
          ? currentId
          : nextRecipients[0]?.id || DEFAULT_PREVIEW_RECIPIENT.id
      ));
      return nextCampaigns;
    } catch (err) {
      throw new Error(err.response?.data?.msg || err.message || 'Failed to load campaigns.');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSubscribers = async () => {
      try {
        await fetchSubscribers();
        if (isMounted) {
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      }
    };

    loadSubscribers();

    return () => {
      isMounted = false;
    };
  }, [fetchSubscribers]);

  useEffect(() => {
    let isMounted = true;

    const loadCampaignWorkspace = async () => {
      try {
        await fetchCampaignWorkspace();
        if (isMounted) {
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      }
    };

    loadCampaignWorkspace();

    return () => {
      isMounted = false;
    };
  }, [fetchCampaignWorkspace]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const selectedPreviewRecipient = useMemo(() => (
    previewRecipients.find((recipient) => recipient.id === selectedPreviewRecipientId) || DEFAULT_PREVIEW_RECIPIENT
  ), [previewRecipients, selectedPreviewRecipientId]);

  const draftCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === 'Draft'),
    [campaigns]
  );

  const historyCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status !== 'Draft'),
    [campaigns]
  );

  const selectedDraftCampaign = useMemo(() => (
    draftCampaigns.find((campaign) => campaign.id === selectedCampaignId) || null
  ), [draftCampaigns, selectedCampaignId]);

  const preparedCampaignForm = useMemo(
    () => buildCampaignSubmissionPayload(campaignForm),
    [campaignForm]
  );

  const campaignReadyForPreview = useMemo(
    () => isCampaignReadyForPreview(preparedCampaignForm),
    [preparedCampaignForm]
  );

  useEffect(() => {
    if (!showPreviewPanel || !campaignReadyForPreview) {
      setPreviewData(null);
      setPreviewError(null);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const response = await axios.post('/newsletter/campaigns/preview', {
          ...preparedCampaignForm,
          previewRecipient: selectedPreviewRecipient,
        });
        setPreviewData(response.data || null);
      } catch (err) {
        setPreviewError(err.response?.data?.msg || err.message || 'Preview is unavailable right now.');
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [campaignReadyForPreview, preparedCampaignForm, selectedPreviewRecipient, showPreviewPanel]);

  const audienceCards = useMemo(() => ([
    {
      label: 'Subscribers Only',
      value: audienceReadiness.subscribersReachable || 0,
      description: 'Active subscriber emails currently reachable for future campaign delivery.',
    },
    {
      label: 'Users Only',
      value: audienceReadiness.usersReachable || 0,
      description: 'Registered customer accounts still open to future offer emails.',
    },
    {
      label: 'Both Together',
      value: audienceReadiness.combinedReachable || 0,
      description: 'Unique reachable emails after removing duplicates across users and subscribers.',
    },
    {
      label: 'Suppressed',
      value: audienceReadiness.suppressed || 0,
      description: 'Emails blocked from future campaign-style delivery after opt-out handling.',
    },
  ]), [audienceReadiness]);

  const workspaceTabs = useMemo(
    () => getCampaignTabOptions(draftCampaigns.length, historyCampaigns.length, counts.total || 0),
    [counts.total, draftCampaigns.length, historyCampaigns.length]
  );

  const selectedMessageType = useMemo(
    () => CAMPAIGN_MESSAGE_TYPES.find((type) => type.value === campaignForm.messageType) || CAMPAIGN_MESSAGE_TYPES[0],
    [campaignForm.messageType]
  );

  const selectedAudienceOption = useMemo(
    () => CAMPAIGN_AUDIENCE_OPTIONS.find((option) => option.value === campaignForm.audienceType) || CAMPAIGN_AUDIENCE_OPTIONS[0],
    [campaignForm.audienceType]
  );

  const selectedAudienceCount = useMemo(
    () => getAudienceCountForSelection(campaignForm.audienceType, audienceReadiness),
    [audienceReadiness, campaignForm.audienceType]
  );

  const hasCoreMessage = useMemo(
    () => Boolean(
      normalizeComposerText(preparedCampaignForm.subject)
      && normalizeComposerText(preparedCampaignForm.body)
    ),
    [preparedCampaignForm.body, preparedCampaignForm.subject]
  );

  const canDeliverToAudience = campaignReadyForPreview && selectedAudienceCount > 0;

  const handleStatusChange = async (subscriber, isActive) => {
    setActionSubscriberId(subscriber.id);
    setError(null);
    setMessage(null);

    try {
      await axios.put(`/newsletter/${subscriber.id}/status`, { isActive });
      await Promise.all([
        fetchSubscribers({ withLoading: false }),
        fetchCampaignWorkspace(),
      ]);
      setMessage({
        type: 'success',
        text: isActive
          ? 'Subscriber has been reactivated.'
          : 'Subscriber has been marked as unsubscribed.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update subscriber status.');
    } finally {
      setActionSubscriberId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const queryString = buildQueryString({ currentPage, statusFilter, searchTerm });
      const response = await axios.get(`/newsletter/export?${queryString}`, {
        responseType: 'blob',
      });

      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to export subscribers.');
    } finally {
      setExporting(false);
    }
  };

  const clearComposer = useCallback(() => {
    setSelectedCampaignId(null);
    setCampaignForm(INITIAL_CAMPAIGN_FORM);
    setPreviewError(null);
    setPreviewData(null);
    setShowTemplatePicker(false);
    setShowAdvancedComposer(false);
    setShowPreviewPanel(false);
  }, []);

  const resetComposer = useCallback(() => {
    clearComposer();
    setActivePanel('compose');
  }, [clearComposer]);

  const handleDeleteCampaign = async (campaign) => {
    const confirmed = window.confirm(`Delete the draft "${campaign.internalName}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingCampaignId(campaign.id);
    setError(null);
    setMessage(null);

    try {
      await axios.delete(`/newsletter/campaigns/${campaign.id}`);
      await fetchCampaignWorkspace();

      if (selectedCampaignId === campaign.id) {
        clearComposer();
        setActivePanel('compose');
      }

      setMessage({
        type: 'success',
        text: 'Campaign draft deleted.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete campaign draft.');
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleOpenCampaign = (campaign) => {
    setSelectedCampaignId(campaign.id);
    setCampaignForm(normalizeCampaignFormData(campaign));
    setPreviewError(null);
    setShowTemplatePicker(campaign.messageType !== 'PROFESSIONAL_UPDATE');
    setShowAdvancedComposer(shouldOpenAdvancedComposer(campaign));
    setActivePanel('compose');
    setMessage(null);
  };

  const handleUseAsNewDraft = (campaign) => {
    setSelectedCampaignId(null);
    setCampaignForm(normalizeCampaignFormData(campaign));
    setPreviewError(null);
    setShowTemplatePicker(campaign.messageType !== 'PROFESSIONAL_UPDATE');
    setShowAdvancedComposer(shouldOpenAdvancedComposer(campaign));
    setActivePanel('compose');
    setMessage({
      type: 'success',
      text: 'Campaign content loaded as a new draft.',
    });
  };

  const handleFieldChange = (field, value) => {
    setCampaignForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleMessageTypeChange = (messageType) => {
    setCampaignForm((currentForm) => applyCampaignTemplate(currentForm, messageType));
  };

  const persistCampaignDraft = useCallback(async () => {
    const response = selectedCampaignId
      ? await axios.put(`/newsletter/campaigns/${selectedCampaignId}`, preparedCampaignForm)
      : await axios.post('/newsletter/campaigns', preparedCampaignForm);
    const savedCampaign = response.data || {};
    setSelectedCampaignId(savedCampaign.id || selectedCampaignId || null);
    setCampaignForm(normalizeCampaignFormData(savedCampaign));
    return savedCampaign;
  }, [preparedCampaignForm, selectedCampaignId]);

  const handleSaveCampaign = async () => {
    const wasEditing = Boolean(selectedCampaignId);
    setSavingCampaign(true);
    setError(null);
    setMessage(null);

    try {
      await persistCampaignDraft();
      await fetchCampaignWorkspace();
      setMessage({
        type: 'success',
        text: wasEditing ? 'Draft updated.' : 'Draft saved.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save campaign draft.');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleApplySelectedTemplate = () => {
    const hasExistingContent = Boolean(
      normalizeComposerText(campaignForm.subject)
      || normalizeComposerText(campaignForm.body)
      || normalizeComposerText(campaignForm.title)
      || normalizeComposerText(campaignForm.preheader)
    );

    if (hasExistingContent) {
      const confirmed = window.confirm('Replace the current subject and message with this template?');
      if (!confirmed) {
        return;
      }
    }

    setCampaignForm((currentForm) => ({
      ...currentForm,
      messageType: selectedMessageType.value,
      internalName: selectedMessageType.defaults.internalName || '',
      subject: selectedMessageType.defaults.subject || '',
      title: selectedMessageType.defaults.title || '',
      preheader: selectedMessageType.defaults.preheader || '',
      body: selectedMessageType.defaults.body || '',
      highlightTitle: selectedMessageType.defaults.highlightTitle || '',
      highlightBody: selectedMessageType.defaults.highlightBody || '',
      ctaLabel: selectedMessageType.defaults.ctaLabel || '',
      ctaUrl: selectedMessageType.defaults.ctaUrl || '',
      signature: selectedMessageType.defaults.signature || INITIAL_CAMPAIGN_FORM.signature,
    }));
  };

  const handleSendTest = async () => {
    if (!campaignReadyForPreview) {
      setError('Add the subject and message before sending a test email.');
      return;
    }

    setTestingCampaignId(selectedCampaignId || 'new-draft');
    setError(null);
    setMessage(null);

    try {
      const savedCampaign = await persistCampaignDraft();
      const campaignId = savedCampaign.id;
      const response = await axios.post(`/newsletter/campaigns/${campaignId}/test-send`);
      await fetchCampaignWorkspace();
      setMessage({
        type: 'success',
        text: response.data?.message || 'Test email sent.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to send the test email.');
    } finally {
      setTestingCampaignId(null);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignReadyForPreview) {
      setError('Add the subject and message before sending this message.');
      return;
    }

    if (selectedAudienceCount <= 0) {
      setError('There are no reachable contacts in the selected audience right now.');
      return;
    }

    const confirmed = window.confirm('Send this campaign to the selected audience now?');
    if (!confirmed) {
      return;
    }

    setSendingCampaignId(selectedCampaignId || 'new-draft');
    setError(null);
    setMessage(null);

    try {
      const savedCampaign = await persistCampaignDraft();
      const campaignId = savedCampaign.id;
      const response = await axios.post(`/newsletter/campaigns/${campaignId}/send`);
      await Promise.all([
        fetchCampaignWorkspace(),
        fetchSubscribers({ withLoading: false }),
      ]);
      clearComposer();
      setActivePanel('history');
      setMessage({
        type: 'success',
        text: response.data?.message || 'Campaign sent successfully.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to send the campaign.');
      try {
        await fetchCampaignWorkspace();
      } catch (refreshError) {
        // Keep the original action error visible when the follow-up refresh also fails.
      }
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleCopyToken = async (token) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
      }
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(''), 1600);
    } catch (copyError) {
      setError('Token copy is unavailable in this browser. You can still type the token manually.');
    }
  };

  if (loading && subscribers.length === 0) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading newsletter workspace...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Growth Operations"
      title="Newsletter"
      description="Prepare polished travel communication, send with confidence, and keep audience records well organized."
      actions={(
        <>
          <button
            type="button"
            onClick={resetComposer}
            className="rounded-full border border-[#d6ccb8] bg-white px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#faf8f3]"
          >
            New Draft
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </>
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
        tabs={workspaceTabs}
        value={activePanel}
        onChange={setActivePanel}
      />

      {activePanel === 'compose' && (
        <div className="space-y-6">
          <StaffCardSection
            title="How to Send"
            description="Choose the audience, write the message, then send a test or the full message. Templates and extra styling are optional."
            actions={selectedCampaignId ? <StaffInfoPill tone="info">Draft #{selectedCampaignId}</StaffInfoPill> : <StaffInfoPill tone="neutral">New message</StaffInfoPill>}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-[1.45rem] border border-[#ece4d2] bg-[#fbfaf7] px-5 py-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Step 1</div>
                <h3 className="mt-2 text-lg font-black text-[#101c2d]">Write the message</h3>
                <p className="mt-2 text-sm leading-6 text-[#67707e]">
                  Start with your own subject and message. You can keep it simple and send without opening templates.
                </p>
                <div className="mt-4">
                  <StaffInfoPill tone={hasCoreMessage ? 'accent' : 'neutral'}>
                    {hasCoreMessage ? 'Ready' : 'Add subject and message'}
                  </StaffInfoPill>
                </div>
              </article>
              <article className="rounded-[1.45rem] border border-[#ece4d2] bg-[#fbfaf7] px-5 py-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Step 2</div>
                <h3 className="mt-2 text-lg font-black text-[#101c2d]">Send a test</h3>
                <p className="mt-2 text-sm leading-6 text-[#67707e]">
                  A test email goes to the admin inbox first. The latest changes are saved automatically.
                </p>
                <div className="mt-4">
                  <StaffInfoPill tone={selectedDraftCampaign?.lastTestSentAt ? 'accent' : 'neutral'}>
                    {selectedDraftCampaign?.lastTestSentAt ? 'Test sent' : 'Recommended'}
                  </StaffInfoPill>
                </div>
              </article>
              <article className="rounded-[1.45rem] border border-[#ece4d2] bg-[#fbfaf7] px-5 py-5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">Step 3</div>
                <h3 className="mt-2 text-lg font-black text-[#101c2d]">Send to audience</h3>
                <p className="mt-2 text-sm leading-6 text-[#67707e]">
                  The message will go to {selectedAudienceOption.label.toLowerCase()} and duplicate emails are removed automatically.
                </p>
                <div className="mt-4">
                  <StaffInfoPill tone={canDeliverToAudience ? 'accent' : 'neutral'}>
                    {canDeliverToAudience ? `${selectedAudienceCount} ready` : 'Audience not ready'}
                  </StaffInfoPill>
                </div>
              </article>
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Write Message"
            description="Choose who should receive the message, then write the subject and the message itself."
            actions={selectedDraftCampaign ? <StaffInfoPill tone="info">Editing saved draft</StaffInfoPill> : <StaffInfoPill tone="neutral">Simple mode</StaffInfoPill>}
          >
            <div className="space-y-6">
              <div>
                <div className="mb-3 text-sm font-semibold text-gray-700">Audience</div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {CAMPAIGN_AUDIENCE_OPTIONS.map((option) => {
                    const isSelected = campaignForm.audienceType === option.value;
                    const optionCount = getAudienceCountForSelection(option.value, audienceReadiness);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFieldChange('audienceType', option.value)}
                        className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-[#bca77a] bg-[#fffdf8] shadow-sm'
                            : 'border-[#e7dfcf] bg-[#fbfaf7] hover:border-[#c9b48a] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-black text-[#101c2d]">{option.label}</div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8a7443] shadow-sm">{optionCount}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#67707e]">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-[1.4rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Audience snapshot</div>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    This message is currently set for <span className="font-bold text-[#101c2d]">{selectedAudienceOption.label}</span> with about <span className="font-bold text-[#101c2d]">{selectedAudienceCount}</span> reachable contact{selectedAudienceCount === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Email subject</span>
                  <input
                    type="text"
                    value={campaignForm.subject}
                    onChange={(event) => handleFieldChange('subject', event.target.value)}
                    placeholder="Example: Welcome to NuurPath"
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Message</span>
                  <textarea
                    value={campaignForm.body}
                    onChange={(event) => handleFieldChange('body', event.target.value)}
                    placeholder="Write the message here. Example: Dear {firstName}, welcome to NuurPath..."
                    rows={10}
                    className="w-full rounded-[1.5rem] border border-gray-300 bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>

                <div className="rounded-[1.4rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Helpful note</div>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    If you want the message to greet each person by name, use one of these tokens: <span className="font-bold text-[#101c2d]">{'{firstName}'}</span>, <span className="font-bold text-[#101c2d]">{'{fullName}'}</span>, or <span className="font-bold text-[#101c2d]">{'{email}'}</span>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-[#ece4d2] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker((currentValue) => !currentValue)}
                    className="rounded-full border border-[#d6ccb8] bg-white px-4 py-2 text-sm font-semibold text-[#101c2d] transition hover:bg-[#faf8f3]"
                  >
                    {showTemplatePicker ? 'Hide templates' : 'Templates optional'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedComposer((currentValue) => !currentValue)}
                    className="rounded-full border border-[#d6ccb8] bg-white px-4 py-2 text-sm font-semibold text-[#101c2d] transition hover:bg-[#faf8f3]"
                  >
                    {showAdvancedComposer ? 'Hide more options' : 'More options'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreviewPanel((currentValue) => !currentValue)}
                    className="rounded-full border border-[#d6ccb8] bg-white px-4 py-2 text-sm font-semibold text-[#101c2d] transition hover:bg-[#faf8f3]"
                  >
                    {showPreviewPanel ? 'Hide live preview' : 'Live preview'}
                  </button>
                  <StaffInfoPill tone={campaignForm.messageType === 'PROFESSIONAL_UPDATE' ? 'neutral' : 'warm'}>
                    {selectedMessageType.label}
                  </StaffInfoPill>
                </div>

                {showTemplatePicker && (
                  <div className="rounded-[1.5rem] border border-[#e7dfcf] bg-[#fbfaf7] px-5 py-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Message template</span>
                      <select
                        value={campaignForm.messageType}
                        onChange={(event) => handleMessageTypeChange(event.target.value)}
                        className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                      >
                        {CAMPAIGN_MESSAGE_TYPES.map((typeOption) => (
                          <option key={typeOption.value} value={typeOption.value}>
                            {typeOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-3xl">
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8a7443]">
                          {selectedMessageType.eyebrow}
                        </div>
                        <div className="mt-2 text-lg font-black text-[#101c2d]">{selectedMessageType.label}</div>
                        <p className="mt-2 text-sm leading-6 text-[#67707e]">{selectedMessageType.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplySelectedTemplate}
                        className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16263b]"
                      >
                        Load template text
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(selectedMessageType.bestFor || []).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-[#ddd3bf] bg-white px-3 py-1.5 text-xs font-semibold text-[#5b6472]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </StaffCardSection>

          {showAdvancedComposer && (
            <StaffCardSection
              title="More Options"
              description="Use these fields only when the email needs a more structured design."
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Campaign name</span>
                  <input
                    type="text"
                    value={campaignForm.internalName}
                    onChange={(event) => handleFieldChange('internalName', event.target.value)}
                    placeholder="Internal draft name"
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Message title</span>
                  <input
                    type="text"
                    value={campaignForm.title}
                    onChange={(event) => handleFieldChange('title', event.target.value)}
                    placeholder={selectedMessageType.defaults.title}
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Preheader</span>
                  <input
                    type="text"
                    value={campaignForm.preheader}
                    onChange={(event) => handleFieldChange('preheader', event.target.value)}
                    placeholder={selectedMessageType.defaults.preheader}
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>
                <div>
                  <div className="mb-3 text-sm font-semibold text-gray-700">Greeting style</div>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_GREETING_STYLES.map((style) => {
                      const isSelected = campaignForm.greetingStyle === style.value;

                      return (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => handleFieldChange('greetingStyle', style.value)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? 'bg-[#101c2d] text-white shadow-sm'
                              : 'border border-[#ddd3bf] bg-white text-[#4f5763] hover:border-[#bca77a] hover:text-[#101c2d]'
                          }`}
                          title={style.description}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </StaffCardSection>
          )}

          {showAdvancedComposer && (
            <StaffCardSection
              title="Highlight, CTA, and Signature"
              description="Use these only when the message needs one clear highlight or a stronger action."
              actions={campaignForm.highlightTitle || campaignForm.highlightBody ? <StaffInfoPill tone="warm">Highlight included</StaffInfoPill> : null}
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Highlight title</span>
                    <input
                      type="text"
                      value={campaignForm.highlightTitle}
                      onChange={(event) => handleFieldChange('highlightTitle', event.target.value)}
                      placeholder={selectedMessageType.defaults.highlightTitle}
                      className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">CTA label</span>
                    <input
                      type="text"
                      value={campaignForm.ctaLabel}
                      onChange={(event) => handleFieldChange('ctaLabel', event.target.value)}
                      placeholder={selectedMessageType.defaults.ctaLabel}
                      className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Highlight body</span>
                  <textarea
                    value={campaignForm.highlightBody}
                    onChange={(event) => handleFieldChange('highlightBody', event.target.value)}
                    placeholder={selectedMessageType.defaults.highlightBody}
                    rows={5}
                    className="w-full rounded-[1.5rem] border border-gray-300 bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">CTA link</span>
                    <input
                      type="url"
                      value={campaignForm.ctaUrl}
                      onChange={(event) => handleFieldChange('ctaUrl', event.target.value)}
                      placeholder="https://example.com/offer"
                      className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Signature</span>
                    <textarea
                      value={campaignForm.signature}
                      onChange={(event) => handleFieldChange('signature', event.target.value)}
                      rows={3}
                      className="w-full rounded-[1.5rem] border border-gray-300 bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                    />
                  </label>
                </div>
              </div>
            </StaffCardSection>
          )}

          <StaffCardSection
            title="Review and Send"
            description="Testing and sending automatically save your latest changes first."
            actions={copiedToken ? <StaffInfoPill tone="accent">{copiedToken} copied</StaffInfoPill> : null}
          >
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <article className="rounded-[1.35rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Audience</div>
                  <div className="mt-2 text-sm font-black text-[#101c2d]">{selectedAudienceOption.label}</div>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    {selectedAudienceCount} reachable contact{selectedAudienceCount === 1 ? '' : 's'} right now.
                  </p>
                </article>
                <article className="rounded-[1.35rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Template</div>
                  <div className="mt-2 text-sm font-black text-[#101c2d]">{selectedMessageType.label}</div>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    {showTemplatePicker ? 'Template tools are open.' : 'Template tools are hidden until you need them.'}
                  </p>
                </article>
                <article className="rounded-[1.35rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Draft status</div>
                  <div className="mt-2 text-sm font-black text-[#101c2d]">
                    {selectedCampaignId ? `Draft #${selectedCampaignId}` : 'Not saved yet'}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    {selectedDraftCampaign?.lastTestSentAt
                      ? `Last test sent ${formatAdminDate(selectedDraftCampaign.lastTestSentAt, 'recently')}.`
                      : 'You can save now, or go straight to test send and it will save automatically.'}
                  </p>
                </article>
              </div>

              <div className="rounded-[1.4rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Personalization tokens</div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {CAMPAIGN_TOKENS.map((token) => (
                    <button
                      key={token.value}
                      type="button"
                      onClick={() => handleCopyToken(token.value)}
                      className="rounded-full border border-[#d6ccb8] bg-white px-4 py-2 text-sm font-semibold text-[#101c2d] transition hover:bg-[#faf8f3]"
                    >
                      {token.label}: {token.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <article className="rounded-[1.4rem] border border-[#ece4d2] bg-white px-5 py-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Step 1</div>
                  <h3 className="mt-2 text-lg font-black text-[#101c2d]">Save message</h3>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Save the draft if you want to keep this message before sending.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveCampaign}
                    disabled={savingCampaign}
                    className="mt-4 rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingCampaign ? 'Saving...' : selectedCampaignId ? 'Update Draft' : 'Save Draft'}
                  </button>
                </article>

                <article className="rounded-[1.4rem] border border-[#ece4d2] bg-white px-5 py-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Step 2</div>
                  <h3 className="mt-2 text-lg font-black text-[#101c2d]">Send test email</h3>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Sends a test to the admin inbox and saves the latest changes automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={!campaignReadyForPreview || savingCampaign || Boolean(testingCampaignId) || Boolean(sendingCampaignId)}
                    className="mt-4 rounded-full border border-[#d6ccb8] bg-white px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#faf8f3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {testingCampaignId ? 'Sending Test...' : 'Send Test'}
                  </button>
                </article>

                <article className="rounded-[1.4rem] border border-[#ece4d2] bg-white px-5 py-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Step 3</div>
                  <h3 className="mt-2 text-lg font-black text-[#101c2d]">Send to audience</h3>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Sends to the selected audience after one final automatic save.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendCampaign}
                    disabled={!canDeliverToAudience || savingCampaign || Boolean(sendingCampaignId) || Boolean(testingCampaignId)}
                    className="mt-4 rounded-full bg-[#8a7443] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#735f37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingCampaignId ? 'Sending Message...' : 'Send Message'}
                  </button>
                </article>
              </div>

              {selectedDraftCampaign?.lastError ? (
                <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                  {selectedDraftCampaign.lastError}
                </div>
              ) : null}

              {selectedCampaignId ? (
                <button
                  type="button"
                  onClick={resetComposer}
                  className="rounded-full border border-[#d6ccb8] bg-white px-5 py-3 text-sm font-bold text-[#101c2d] transition hover:bg-[#faf8f3]"
                >
                  Leave Current Draft
                </button>
              ) : null}
            </div>
          </StaffCardSection>

          {showPreviewPanel && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
              <StaffCardSection
                title="Preview Recipient"
                description="Choose a sample recipient to check how the personalization looks."
                actions={campaignsLoading ? <StaffInfoPill tone="neutral">Loading samples</StaffInfoPill> : null}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Recipient sample</span>
                  <select
                    value={selectedPreviewRecipientId}
                    onChange={(event) => setSelectedPreviewRecipientId(event.target.value)}
                    className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                  >
                    {previewRecipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {(recipient.name || recipient.email)} - {recipient.sourceLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </StaffCardSection>

              <NewsletterCampaignPreview
                previewData={previewData}
                previewLoading={previewLoading}
                previewError={previewError}
                selectedRecipientLabel={`${selectedPreviewRecipient.name || selectedPreviewRecipient.email} (${selectedPreviewRecipient.email}) - ${selectedPreviewRecipient.sourceLabel}`}
                isReady={campaignReadyForPreview}
              />
            </div>
          )}
        </div>
      )}

      {activePanel === 'drafts' && (
        <StaffCardSection
          title="Draft Library"
          description="Keep message work clean by saving drafts here first. Open any draft to refine the message, preview it, and send when ready."
          actions={campaignsLoading ? <StaffInfoPill tone="neutral">Refreshing drafts</StaffInfoPill> : <StaffInfoPill tone="info">{draftCampaigns.length} draft{draftCampaigns.length === 1 ? '' : 's'}</StaffInfoPill>}
        >
          {draftCampaigns.length === 0 ? (
            <StaffEmptyState
              title="No campaign drafts yet"
              description="Start in the composer tab, shape the message quietly, and save the draft when the structure feels right."
              action={(
                <button
                  type="button"
                  onClick={() => setActivePanel('compose')}
                  className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
                >
                  Open Composer
                </button>
              )}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {draftCampaigns.map((campaign) => (
                <NewsletterCampaignDraftCard
                  key={campaign.id}
                  campaign={campaign}
                  isActive={selectedCampaignId === campaign.id}
                  deleting={deletingCampaignId === campaign.id}
                  onOpen={() => handleOpenCampaign(campaign)}
                  onDelete={() => handleDeleteCampaign(campaign)}
                />
              ))}
            </div>
          )}
        </StaffCardSection>
      )}

      {activePanel === 'history' && (
        <StaffCardSection
          title="Campaign History"
          description="Review completed delivery records, audience size, and any delivery issues. Past campaigns stay preserved as history, and any message can be reused as a fresh draft."
          actions={campaignsLoading ? <StaffInfoPill tone="neutral">Refreshing history</StaffInfoPill> : <StaffInfoPill tone="warm">{historyCampaigns.length} record{historyCampaigns.length === 1 ? '' : 's'}</StaffInfoPill>}
        >
          {historyCampaigns.length === 0 ? (
            <StaffEmptyState
              title="No campaign history yet"
              description="Sent campaigns and delivery results will appear here once the first campaign is delivered."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {historyCampaigns.map((campaign) => (
                <NewsletterCampaignHistoryCard
                  key={campaign.id}
                  campaign={campaign}
                  onReuse={() => handleUseAsNewDraft(campaign)}
                />
              ))}
            </div>
          )}
        </StaffCardSection>
      )}

      {activePanel === 'subscribers' && (
        <>
          <StaffCardSection
            title="Audience Foundation"
            description="Subscriber identity, registered-user reach, and shared opt-out behavior stay aligned here so campaign delivery remains trustworthy and well organized."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {audienceCards.map((card) => (
                <article key={card.label} className="rounded-[1.5rem] border border-[#ece4d2] bg-white px-5 py-5 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a7443]">{card.label}</div>
                  <div className="mt-3 text-3xl font-black text-[#101c2d]">{card.value}</div>
                  <p className="mt-3 text-sm leading-6 text-[#67707e]">{card.description}</p>
                </article>
              ))}
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Filter and Search"
            description="Search by name or email, then switch between active and unsubscribed contacts before exporting the list."
          >
            <div className="space-y-4">
              <StaffFilterPills
                options={getSubscriberFilterOptions(counts)}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Search by name or email</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search subscribers..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>
          </StaffCardSection>

          <StaffCardSection
            title="Subscriber List"
            description={`Showing ${filteredTotal} subscriber${filteredTotal === 1 ? '' : 's'} in the current view. Use this section for clean audience preparation, visibility, and export.`}
          >
            {subscribers.length === 0 ? (
              <StaffEmptyState
                title="No subscribers match this view"
                description="Try another filter or search term, or wait for new newsletter signups from the public website."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {subscribers.map((subscriber) => (
                  <article key={subscriber.id} className="rounded-[1.5rem] border border-[#ebe4d3] bg-[#fcfbf8] p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">
                          Joined {formatAdminDate(subscriber.createdAt, 'Recently')}
                        </div>
                        <h3 className="mt-2 text-xl font-black text-[#101c2d]">{subscriber.name || subscriber.email}</h3>
                        <p className={`mt-1 text-sm ${subscriber.name ? 'text-[#67707e]' : 'text-[#8a7443]'}`}>
                          {subscriber.name ? subscriber.email : 'Name not saved yet'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${subscriber.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {subscriber.isActive ? 'Active' : 'Unsubscribed'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Email</div>
                        <div className="mt-2 break-all text-sm text-[#101c2d]">{subscriber.email}</div>
                      </div>
                      <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Subscribed</div>
                        <div className="mt-2 text-sm text-[#101c2d]">{formatAdminDate(subscriber.createdAt)}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Stored Name</div>
                        <div className="mt-2 text-sm text-[#101c2d]">{subscriber.name || 'No name saved yet'}</div>
                      </div>
                      <div className="rounded-2xl border border-[#ece4d2] bg-white px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Unsubscribed</div>
                        <div className="mt-2 text-sm text-[#101c2d]">
                          {subscriber.unsubscribedAt ? formatAdminDate(subscriber.unsubscribedAt) : 'Still active'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {subscriber.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(subscriber, false)}
                          disabled={actionSubscriberId === subscriber.id}
                          className="rounded-full border border-amber-200 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark Unsubscribed
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(subscriber, true)}
                          disabled={actionSubscriberId === subscriber.id}
                          className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </StaffCardSection>

          {totalPages > 1 && (
            <StaffCardSection title="Browse More Subscribers" description="Move between pages when the list grows so the workspace stays simple to scan.">
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

export default ManageNewsletter;
