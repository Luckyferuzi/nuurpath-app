import React from 'react';
import { StaffInfoPill } from '../staff/WorkspacePrimitives.jsx';
import { formatAdminDate } from '../../lib/staffRequestUtils.js';

function getStatusTone(status) {
  if (status === 'Sent') {
    return 'accent';
  }

  if (status === 'Failed') {
    return 'warm';
  }

  if (status === 'Sending') {
    return 'info';
  }

  return 'neutral';
}

const NewsletterCampaignHistoryCard = ({ campaign, onReuse }) => {
  const helperLine = campaign.preheader || campaign.title || 'No preview line saved.';
  const recentLogs = Array.isArray(campaign.deliveryLogs) ? campaign.deliveryLogs.slice(0, 3) : [];

  return (
    <article className="rounded-[1.5rem] border border-[#ebe4d3] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">
            {campaign.lastSentAt ? `Sent ${formatAdminDate(campaign.lastSentAt, 'Recently')}` : `Updated ${formatAdminDate(campaign.updatedAt, 'Recently')}`}
          </div>
          <h3 className="mt-2 text-xl font-black text-[#101c2d]">{campaign.internalName}</h3>
          <p className="mt-2 text-sm font-semibold text-[#101c2d]">{campaign.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StaffInfoPill tone={getStatusTone(campaign.status)}>{campaign.status}</StaffInfoPill>
          <StaffInfoPill tone="info">{campaign.messageTypeLabel || campaign.messageType?.replace(/_/g, ' ')}</StaffInfoPill>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#67707e]">{helperLine}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <StaffInfoPill tone="warm">{campaign.audienceLabel || campaign.audienceType?.replace(/_/g, ' ')}</StaffInfoPill>
        {campaign.updatedBy?.name ? <StaffInfoPill tone="neutral">Managed by {campaign.updatedBy.name}</StaffInfoPill> : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Audience</div>
          <div className="mt-2 text-sm font-semibold text-[#101c2d]">{campaign.recipientCount || 0}</div>
        </div>
        <div className="rounded-2xl border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Delivered</div>
          <div className="mt-2 text-sm font-semibold text-[#101c2d]">{campaign.sentCount || 0}</div>
        </div>
        <div className="rounded-2xl border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">Issues</div>
          <div className="mt-2 text-sm font-semibold text-[#101c2d]">{campaign.failedCount || 0}</div>
        </div>
      </div>

      {recentLogs.length > 0 ? (
        <div className="mt-5 rounded-[1.35rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Recent Delivery Activity</div>
          <div className="mt-3 space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white bg-white px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#101c2d]">{log.name || log.email}</div>
                    <div className="text-xs text-[#67707e]">{log.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StaffInfoPill tone={log.status === 'Sent' ? 'accent' : 'warm'}>{log.status}</StaffInfoPill>
                    <StaffInfoPill tone="neutral">{log.deliveryTypeLabel}</StaffInfoPill>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#67707e]">
                  {log.sourceLabel}
                  {log.sentAt ? ` • ${formatAdminDate(log.sentAt, 'Recently')}` : ''}
                </div>
                {log.errorMessage ? <p className="mt-2 text-xs leading-5 text-amber-700">{log.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReuse}
          className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
        >
          Use as New Draft
        </button>
      </div>
    </article>
  );
};

export default NewsletterCampaignHistoryCard;
