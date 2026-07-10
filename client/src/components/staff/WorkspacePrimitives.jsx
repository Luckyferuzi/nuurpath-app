import React from 'react';
import { getOperationalStatusBadgeClassName, getOperationalStatusLabel } from '../../lib/operationalPipeline.js';

export function StaffPageShell({ eyebrow = 'Staff Workspace', title, description, actions, children }) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#e6decc] bg-white shadow-[0_20px_60px_rgba(16,28,45,0.08)]">
        <div className="border-b border-[#efe8d8] bg-[linear-gradient(135deg,_#fcfbf8_0%,_#f5f1e7_50%,_#efe7d6_100%)] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#8a7443]">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black text-[#101c2d] sm:text-4xl">{title}</h1>
              {description && <p className="mt-3 text-sm leading-6 text-[#5b6472] sm:text-base">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}

export function StaffMetricCard({ label, value, hint, tone = 'default' }) {
  const toneClasses = {
    default: 'text-[#101c2d]',
    accent: 'text-[#006837]',
    warm: 'text-[#8a7443]',
    danger: 'text-[#b42318]',
  };

  return (
    <div className="rounded-[1.5rem] border border-[#ebe4d3] bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.24em] text-[#7a828f]">{label}</div>
      <div className={`mt-4 text-3xl font-black ${toneClasses[tone] || toneClasses.default}`}>{value}</div>
      {hint && <p className="mt-2 text-sm leading-6 text-[#67707e]">{hint}</p>}
    </div>
  );
}

export function StaffCardSection({ title, description, actions, children }) {
  return (
    <section className="rounded-[1.75rem] border border-[#ebe4d3] bg-white p-5 shadow-sm sm:p-6">
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {title && <h2 className="text-xl font-black text-[#101c2d]">{title}</h2>}
            {description && <p className="mt-2 text-sm leading-6 text-[#67707e]">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StaffDetailSection({ title, description, children }) {
  return (
    <section className="rounded-[1.75rem] border border-[#ebe4d3] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black text-[#101c2d]">{title}</h3>
        {description && <p className="mt-1 text-sm leading-6 text-[#67707e]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function StaffDetailRow({ label, value, subtle = false }) {
  return (
    <div className="rounded-2xl border border-[#f0eadb] bg-[#fbfaf7] px-4 py-3">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#7a828f]">{label}</div>
      <div className={`mt-2 text-sm leading-6 ${subtle ? 'text-[#67707e]' : 'text-[#101c2d]'}`}>
        {value || 'Not provided'}
      </div>
    </div>
  );
}

export function StaffStatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOperationalStatusBadgeClassName(status)}`}>
      {getOperationalStatusLabel(status)}
    </span>
  );
}

export function StaffFilterPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-[#101c2d] text-white shadow-sm'
                : 'border border-[#ddd3bf] bg-white text-[#4f5763] hover:border-[#bca77a] hover:text-[#101c2d]'
            }`}
          >
            {option.label}
            {option.count !== undefined ? ` (${option.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}

export function StaffEmptyState({ title, description, action }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] p-10 text-center">
      <h3 className="text-xl font-black text-[#101c2d]">{title}</h3>
      {description && <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#67707e]">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
