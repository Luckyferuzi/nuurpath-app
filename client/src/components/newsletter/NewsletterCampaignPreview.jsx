import React from 'react';
import { StaffInfoPill } from '../staff/WorkspacePrimitives.jsx';

const NewsletterCampaignPreview = ({
  previewData,
  previewLoading,
  previewError,
  selectedRecipientLabel,
  isReady,
}) => {
  return (
    <section className="rounded-[1.75rem] border border-[#ebe4d3] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#101c2d]">Live Preview</h2>
          <p className="mt-2 text-sm leading-6 text-[#67707e]">
            The composer keeps the message structured while the preview shows how the greeting, headline, and optional highlight block will land.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewData?.messageTypeLabel ? <StaffInfoPill tone="info">{previewData.messageTypeLabel}</StaffInfoPill> : null}
          {previewData?.audienceLabel ? <StaffInfoPill tone="warm">{previewData.audienceLabel}</StaffInfoPill> : null}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Preview Recipient</div>
        <div className="mt-2 text-sm text-[#101c2d]">{selectedRecipientLabel}</div>
      </div>

      {!isReady ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] p-8 text-center text-sm leading-6 text-[#67707e]">
          Add the campaign name, subject, title, body, and signature to unlock the live preview.
        </div>
      ) : previewError ? (
        <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {previewError}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-[#e6decc] bg-[#f5f1e7]">
          <div className="border-b border-[#ece4d2] bg-white px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Subject</div>
            <div className="mt-2 text-sm font-semibold text-[#101c2d]">
              {previewLoading ? 'Refreshing preview...' : previewData?.subject || 'Preview unavailable'}
            </div>
          </div>
          <div className="bg-[#f5f1e7] p-3 sm:p-4">
            <div
              className={`rounded-[1.5rem] bg-white shadow-[0_16px_36px_rgba(16,28,45,0.06)] transition-opacity ${
                previewLoading ? 'opacity-70' : 'opacity-100'
              }`}
              dangerouslySetInnerHTML={{ __html: previewData?.html || '' }}
            />
          </div>
        </div>
      )}

      {isReady && !previewError && previewData?.preferencesUrl && (
        <div className="mt-5 rounded-[1.5rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a7443]">Trust Footer</div>
          <p className="mt-2 text-sm leading-6 text-[#67707e]">
            Recipients will see a calm trust note and a direct link to manage their email preference.
          </p>
          <p className="mt-2 break-all text-xs leading-6 text-[#0B1C3E]">{previewData.preferencesUrl}</p>
        </div>
      )}
    </section>
  );
};

export default NewsletterCampaignPreview;
