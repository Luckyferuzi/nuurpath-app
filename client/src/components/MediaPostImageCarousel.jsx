import React, { useEffect, useState } from 'react';

const MediaPostImageCarousel = ({
  images,
  title,
  className = '',
  imageClassName = 'h-full w-full object-contain',
  showIndicators = true,
  showControls = true,
  autoPlay = true,
  autoPlayDelay = 4200,
}) => {
  const safeImages = Array.isArray(images) && images.length > 0 ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex < safeImages.length) {
      return;
    }

    setActiveIndex(0);
  }, [activeIndex, safeImages.length]);

  useEffect(() => {
    if (!autoPlay || safeImages.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % safeImages.length);
    }, autoPlayDelay);

    return () => window.clearInterval(timer);
  }, [autoPlay, autoPlayDelay, safeImages.length]);

  if (safeImages.length === 0) {
    return null;
  }

  const goToSlide = (nextIndex) => {
    setActiveIndex(nextIndex);
  };

  const showCarouselControls = showControls && safeImages.length > 1;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {safeImages.map((imageUrl, index) => (
          <div key={`${imageUrl}-${index}`} className="h-full min-w-full bg-[#f3efe6]">
            <img
              src={imageUrl}
              alt={`${title} ${index + 1}`}
              className={imageClassName}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>

      {showCarouselControls ? (
        <>
          <button
            type="button"
            onClick={() => goToSlide((activeIndex - 1 + safeImages.length) % safeImages.length)}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3dac7] bg-white/92 text-xl text-[#101c2d] shadow-sm transition hover:bg-white"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goToSlide((activeIndex + 1) % safeImages.length)}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e3dac7] bg-white/92 text-xl text-[#101c2d] shadow-sm transition hover:bg-white"
            aria-label="Next image"
          >
            ›
          </button>
        </>
      ) : null}

      {showIndicators && safeImages.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 shadow-sm">
          {safeImages.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-indicator-${index}`}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Show image ${index + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === activeIndex ? 'bg-[#D4AF37]' : 'bg-[#d8cfbf]'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default MediaPostImageCarousel;
