import React from 'react';

const BACKGROUNDS = {
  soft: 'bg-[linear-gradient(180deg,_#f5f1e8_0%,_#f7f8fb_52%,_#f6f2ea_100%)]',
  white: 'bg-[#fcfbf8]',
  deep: 'bg-[linear-gradient(135deg,_#0B1C3E_0%,_#10264f_60%,_#17386e_100%)] text-white',
};

const CONTENT_WIDTH = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

export const PublicPageShell = ({
  children,
  background = 'soft',
  className = '',
  contentClassName = 'py-10 sm:py-12 lg:py-16',
}) => (
  <section className={`${BACKGROUNDS[background] || BACKGROUNDS.soft} ${className}`}>
    <div className={`${CONTENT_WIDTH} ${contentClassName}`}>
      {children}
    </div>
  </section>
);

export const PublicSectionHeading = ({
  eyebrow,
  title,
  description,
  align = 'center',
  actions = null,
  className = '',
}) => {
  const alignedClassName = align === 'left' ? 'text-left' : 'text-center';
  const actionsClassName = align === 'left' ? 'justify-start' : 'justify-center';

  return (
    <div className={`mx-auto max-w-3xl ${alignedClassName} ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.35em] text-[#8a7240]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-4 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[#5f6774] sm:text-lg">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className={`mt-6 flex flex-wrap gap-3 ${actionsClassName}`}>
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export const PublicPageHeader = ({
  eyebrow,
  title,
  description,
  actions = null,
  aside = null,
  className = '',
}) => (
  <section className={`overflow-hidden rounded-[2rem] border border-[#e3d9c6] bg-white/92 shadow-[0_24px_80px_rgba(16,28,45,0.08)] backdrop-blur ${className}`}>
    <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-10">
      <div>
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#8a7240]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl lg:text-[2.8rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f6774] sm:text-lg">
            {description}
          </p>
        ) : null}
        {actions ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions}
          </div>
        ) : null}
      </div>
      {aside ? (
        <div className="grid gap-3 self-start">
          {aside}
        </div>
      ) : null}
    </div>
  </section>
);
