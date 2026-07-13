import React from 'react';
import { Link } from 'react-router-dom';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { formatMediaPostDate, getMediaPostExcerpt, getMediaPostImageUrls } from '../lib/mediaPosts.js';
import MediaPostImageCarousel from './MediaPostImageCarousel.jsx';

const TravelEvidenceSection = () => {
  const {
    mediaPosts,
    mediaPostsLoading,
    mediaPostsError,
  } = usePublicContent();

  if (mediaPostsLoading && mediaPosts.length === 0) {
    return (
      <section className="border-t border-[#ede5d5] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-[1.75rem] border border-[#eee6d8] bg-[#fcfbf8]">
                <div className="h-56 bg-[#ece5d8] sm:h-60" />
                <div className="space-y-4 p-5">
                  <div className="h-3 w-28 rounded bg-[#ece5d8]" />
                  <div className="h-7 w-3/4 rounded bg-[#ece5d8]" />
                  <div className="h-4 w-full rounded bg-[#ece5d8]" />
                  <div className="h-4 w-5/6 rounded bg-[#ece5d8]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (mediaPostsError && mediaPosts.length === 0) {
    return (
      <section className="border-t border-[#ede5d5] bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-red-600 sm:px-6 lg:px-8">
          {mediaPostsError}
        </div>
      </section>
    );
  }

  if (mediaPosts.length === 0) {
    return null;
  }

  const highlightedStories = mediaPosts.slice(0, 3);

  return (
    <section className="border-t border-[#ede5d5] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a7240]">Travel Stories</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#101c2d] sm:text-4xl">
              Real moments, updates, and proof from recent journeys.
            </h2>
            <p className="mt-3 text-base leading-7 text-[#5f6774] sm:text-lg">
              Open each story to see the full post, comments, and any video update without leaving the NuurPath experience too early.
            </p>
          </div>
          <Link
            to="/stories"
            className="inline-flex rounded-full border border-[#d8cfbf] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#101c2d] transition hover:bg-[#faf8f3]"
          >
            View all stories
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {highlightedStories.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-[1.85rem] border border-[#e7dfcf] bg-white shadow-[0_14px_38px_rgba(16,28,45,0.06)]"
            >
              <Link to={`/stories/${post.id}`} className="block">
                <MediaPostImageCarousel
                  images={getMediaPostImageUrls(post)}
                  title={post.title}
                  className="h-56 border-b border-[#eee6d8] bg-[#f7f3ea] sm:h-60"
                  imageClassName="h-full w-full object-contain p-3 sm:p-4"
                />
              </Link>

              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#faf7ef] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a7240]">
                    {formatMediaPostDate(post.eventDate || post.createdAt)}
                  </span>
                  {post.destination ? (
                    <span className="rounded-full border border-[#e8dfcf] px-3 py-1 text-[11px] font-bold text-[#4e5764]">
                      {post.destination}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight text-[#101c2d]">
                    <Link to={`/stories/${post.id}`} className="transition hover:text-[#0B1C3E]">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5f6774]">
                    {getMediaPostExcerpt(post.caption, 150)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#67707e]">
                  <span>{post.engagement?.likes || 0} likes</span>
                  <span>{post.engagement?.comments || 0} comments</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to={`/stories/${post.id}`}
                    className="inline-flex rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1a2f55]"
                  >
                    Open story
                  </Link>
                  {post.relatedPackage?.title ? (
                    <span className="text-sm font-semibold text-[#52606d]">
                      Linked to {post.relatedPackage.title}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TravelEvidenceSection;
