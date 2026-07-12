import React from 'react';

const BACKGROUNDS = {
  soft: 'bg-[#f7f6f2]',
  white: 'bg-white',
  deep: 'bg-[#0B1C3E] text-white',
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
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base leading-7 text-[#5f6774] sm:text-lg">
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
  <section className={`overflow-hidden rounded-[1.75rem] border border-[#e6e0d2] bg-white shadow-[0_14px_40px_rgba(16,28,45,0.06)] ${className}`}>
    <div className={`grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 ${aside ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : ''}`}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl lg:text-[2.8rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#5f6774] sm:text-lg">
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
