import React, { useEffect, useState } from 'react';
import NewsletterForm from './NewsletterForm';
import {
  canShowNewsletterReminder,
  dismissNewsletterReminder,
} from '../lib/newsletterPreferences.js';

const REMINDER_DELAY_MS = 14000;
const REMINDER_SCROLL_THRESHOLD = 260;

const HomepageNewsletterReminder = ({ targetId = 'newsletter' }) => {
  const [isEligible, setIsEligible] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasDelayElapsed, setHasDelayElapsed] = useState(false);
  const [hasScrollSignal, setHasScrollSignal] = useState(false);
  const [targetInView, setTargetInView] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    setIsEligible(canShowNewsletterReminder());
  }, []);

  useEffect(() => {
    if (!isEligible) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setHasDelayElapsed(true);
    }, REMINDER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isEligible]);

  useEffect(() => {
    if (!isEligible) {
      return undefined;
    }

    const evaluateScroll = () => {
      if (window.scrollY >= REMINDER_SCROLL_THRESHOLD) {
        setHasScrollSignal(true);
      }
    };

    evaluateScroll();
    window.addEventListener('scroll', evaluateScroll, { passive: true });

    return () => window.removeEventListener('scroll', evaluateScroll);
  }, [isEligible]);

  useEffect(() => {
    if (!isEligible) {
      return undefined;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setTargetInView(Boolean(entry?.isIntersecting));
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(targetElement);

    return () => observer.disconnect();
  }, [isEligible, targetId]);

  useEffect(() => {
    if (!isEligible || hasBeenShown || !hasDelayElapsed || !hasScrollSignal || targetInView) {
      return;
    }

    setIsVisible(true);
    setHasBeenShown(true);
  }, [hasBeenShown, hasDelayElapsed, hasScrollSignal, isEligible, targetInView]);

  useEffect(() => {
    if (targetInView) {
      setIsVisible(false);
      setIsEligible(false);
    }
  }, [targetInView]);

  const handleDismiss = () => {
    dismissNewsletterReminder();
    setIsEligible(false);
    setIsVisible(false);
  };

  const handleSuccess = () => {
    setIsEligible(false);
    setIsVisible(false);
  };

  const scrollToNewsletter = () => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:right-5 sm:w-[30rem]">
      <section className="pointer-events-auto overflow-hidden rounded-[1.75rem] border border-[#e6decc] bg-white shadow-[0_24px_54px_rgba(16,28,45,0.18)]">
        <div className="bg-[linear-gradient(135deg,_#fcfbf8_0%,_#f5f1e7_52%,_#efe7d6_100%)] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a7443]">Travel Updates</p>
              <h3 className="mt-2 text-xl font-black text-[#101c2d]">Would you like calm updates from NuurPath?</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f6774]">
                Join for selected package highlights, guidance notes, and important announcements. We keep it thoughtful and occasional.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-[#ded5c4] bg-white px-3 py-1.5 text-xs font-bold text-[#5f6774] transition hover:text-[#101c2d]"
              aria-label="Dismiss newsletter reminder"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <NewsletterForm variant="reminder" onSuccess={handleSuccess} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe8d8] pt-4">
            <button
              type="button"
              onClick={scrollToNewsletter}
              className="text-sm font-semibold text-[#0B1C3E] transition hover:text-[#8a7443]"
            >
              Open full newsletter section
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm font-semibold text-[#67707e] transition hover:text-[#101c2d]"
            >
              Maybe later
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomepageNewsletterReminder;
