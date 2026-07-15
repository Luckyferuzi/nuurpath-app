import React from 'react';
import { StaffInfoPill } from '../staff/WorkspacePrimitives.jsx';
import { formatAdminDate } from '../../lib/staffRequestUtils.js';

const NewsletterCampaignDraftCard = ({
  campaign,
  isActive,
  deleting,
  onOpen,
  onDelete,
}) => {
  const helperLine = campaign.preheader || campaign.title || 'No preview line saved yet.';

  return (
    <article className={`rounded-[1.5rem] border p-5 shadow-sm transition ${
      isActive
        ? 'border-[#bca77a] bg-[#fffdf8]'
        : 'border-[#ebe4d3] bg-white'
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">
            Updated {formatAdminDate(campaign.updatedAt, 'Recently')}
          </div>
          <h3 className="mt-2 text-xl font-black text-[#101c2d]">{campaign.internalName}</h3>
          <p className="mt-2 text-sm font-semibold text-[#101c2d]">{campaign.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StaffInfoPill tone="dark">{campaign.status}</StaffInfoPill>
          <StaffInfoPill tone="info">{campaign.messageTypeLabel || campaign.messageType.replace(/_/g, ' ')}</StaffInfoPill>
          {campaign.lastTestSentAt ? <StaffInfoPill tone="accent">Tested</StaffInfoPill> : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#67707e]">{helperLine}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <StaffInfoPill tone="warm">{campaign.audienceLabel || campaign.audienceType.replace(/_/g, ' ')}</StaffInfoPill>
        {campaign.updatedBy?.name ? <StaffInfoPill tone="neutral">Saved by {campaign.updatedBy.name}</StaffInfoPill> : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onOpen}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            isActive
              ? 'bg-[#101c2d] text-white hover:bg-[#16263b]'
              : 'border border-[#d6ccb8] text-[#101c2d] hover:bg-[#faf8f3]'
          }`}
        >
          {isActive ? 'Editing Draft' : 'Open Draft'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? 'Removing...' : 'Delete Draft'}
        </button>
      </div>
    </article>
  );
};

export default NewsletterCampaignDraftCard;
