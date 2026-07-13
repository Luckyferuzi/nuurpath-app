import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import MediaPostImageCarousel from './MediaPostImageCarousel.jsx';
import { formatMediaPostDate, getMediaPostExcerpt, getMediaPostImageUrls } from '../lib/mediaPosts.js';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All stories' },
  { value: 'video', label: 'With video' },
  { value: 'photo', label: 'Photo stories' },
];

const TravelStoriesPage = () => {
  const {
    mediaPosts,
    mediaPostsLoading,
    mediaPostsError,
  } = usePublicContent();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStories = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return mediaPosts.filter((post) => {
      if (activeFilter === 'video' && !post.videoUrl) {
        return false;
      }

      if (activeFilter === 'photo' && post.videoUrl) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      return [
        post.title,
        post.caption,
        post.destination,
        post.relatedPackage?.title,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedTerm));
    });
  }, [activeFilter, mediaPosts, searchTerm]);

  return (
    <PublicPageShell>
      <div className="space-y-8">
        <PublicPageHeader
          eyebrow="Story Feed"
          title="Travel stories that feel like updates, not advertisements."
          description="Browse recent posts, open the full story first, then continue to the next step only after the traveler context is clear."
        />

        <section className="rounded-[1.75rem] border border-[#e6decc] bg-white p-5 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#101c2d]">Find the right story fast</h2>
              <p className="mt-2 text-sm leading-6 text-[#67707e]">
                Filter the feed without turning it into a heavy portal. The goal is still a calm, readable post experience.
              </p>
            </div>
            <label className="block w-full max-w-md">
              <span className="mb-2 block text-sm font-semibold text-[#5b6472]">Search stories</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, destination, or package..."
                className="w-full rounded-full border border-[#d8cfbf] bg-[#fcfbf8] px-5 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#8a7240] focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {FILTER_OPTIONS.map((filterOption) => {
              const isActive = filterOption.value === activeFilter;

              return (
                <button
                  key={filterOption.value}
                  type="button"
                  onClick={() => setActiveFilter(filterOption.value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    isActive
                      ? 'bg-[#101c2d] text-white'
                      : 'border border-[#ddd3bf] bg-white text-[#4f5763] hover:border-[#bca77a] hover:text-[#101c2d]'
                  }`}
                >
                  {filterOption.label}
                </button>
              );
            })}
          </div>
        </section>

        {mediaPostsLoading && mediaPosts.length === 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-[1.75rem] border border-[#ebe4d3] bg-white">
                <div className="h-64 bg-[#efe7d9] sm:h-72" />
                <div className="space-y-4 p-6">
                  <div className="h-3 w-28 rounded bg-[#efe7d9]" />
                  <div className="h-8 w-3/4 rounded bg-[#efe7d9]" />
                  <div className="h-4 w-full rounded bg-[#efe7d9]" />
                  <div className="h-4 w-5/6 rounded bg-[#efe7d9]" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!mediaPostsLoading && mediaPostsError && mediaPosts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {mediaPostsError}
          </div>
        ) : null}

        {!mediaPostsLoading && filteredStories.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] px-6 py-10 text-center">
            <h2 className="text-xl font-black text-[#101c2d]">No stories match this view</h2>
            <p className="mt-3 text-sm leading-6 text-[#67707e]">
              Try a different filter or search term to bring the story feed back into view.
            </p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {filteredStories.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-[1.85rem] border border-[#e7dfcf] bg-white shadow-[0_14px_38px_rgba(16,28,45,0.06)]"
            >
              <Link to={`/stories/${post.id}`} className="block">
                <MediaPostImageCarousel
                  images={getMediaPostImageUrls(post)}
                  title={post.title}
                  className="h-64 border-b border-[#eee6d8] bg-[#f7f3ea] sm:h-72"
                  imageClassName="h-full w-full object-contain p-3 sm:p-4"
                />
              </Link>

              <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
                  <span className="rounded-full bg-[#faf7ef] px-3 py-1 text-[#8a7240]">
                    {formatMediaPostDate(post.eventDate || post.createdAt)}
                  </span>
                  {post.destination ? (
                    <span className="rounded-full border border-[#d9cfbb] px-3 py-1 text-[#101c2d]">
                      {post.destination}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h2 className="text-[1.9rem] font-black leading-tight tracking-tight text-[#101c2d]">
                    <Link to={`/stories/${post.id}`} className="transition hover:text-[#0B1C3E]">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-sm leading-7 text-[#5f6774]">
                    {getMediaPostExcerpt(post.caption, 185)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#67707e]">
                  <span>{post.engagement?.likes || 0} likes</span>
                  <span>{post.engagement?.comments || 0} comments</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <Link
                    to={`/stories/${post.id}`}
                    className="inline-flex rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1a2f55]"
                  >
                    Open story
                  </Link>
                  {post.relatedPackage?.title ? (
                    <span className="text-sm font-semibold text-[#52606d]">
                      Related to {post.relatedPackage.title}
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PublicPageShell>
  );
};

export default TravelStoriesPage;
