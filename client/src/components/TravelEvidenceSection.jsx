import React from 'react';
import { resolveBackendUrl } from '../lib/api';
import { usePublicContent } from '../contexts/PublicContentContext.jsx';

function formatEvidenceDate(value) {
  if (!value) {
    return 'Recent journey';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recent journey';
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getHeroImage(post) {
  if (post?.heroImage) {
    return resolveBackendUrl(post.heroImage);
  }

  if (Array.isArray(post?.images) && post.images.length > 0) {
    return resolveBackendUrl(post.images[0]);
  }

  return 'https://placehold.co/1200x900/0B1C3E/D4AF37?text=NuurPath+Journey';
}

const TravelEvidenceSection = () => {
  const {
    mediaPosts,
    mediaPostsLoading,
    mediaPostsError,
  } = usePublicContent();

  if (mediaPostsLoading && mediaPosts.length === 0) {
    return (
      <section className="border-t border-gray-100 bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">Travel Evidence</h2>
            <div className="mx-auto h-1 w-24 bg-[#D4AF37]"></div>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-[2rem] border border-gray-100 bg-gray-50">
                <div className="h-72 bg-gray-200" />
                <div className="space-y-4 p-6">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-6 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="h-4 w-5/6 rounded bg-gray-200" />
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
      <section className="border-t border-gray-100 bg-white py-20">
        <div className="container mx-auto px-4 text-center text-red-500">
          {mediaPostsError}
        </div>
      </section>
    );
  }

  if (mediaPosts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-gray-100 bg-white py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-2 text-3xl font-black uppercase tracking-widest text-[#0B1C3E]">Travel Evidence</h2>
          <div className="mx-auto h-1 w-24 bg-[#D4AF37]"></div>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
            Real moments from recent journeys, destination support, and travel activity managed directly by the NuurPath team.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {mediaPosts.slice(0, 6).map((post) => (
            <article key={post.id} className="group overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-100/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative h-72 overflow-hidden bg-[#0B1C3E]/10">
                <img
                  src={getHeroImage(post)}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C3E]/80 via-[#0B1C3E]/10 to-transparent" />
                <div className="absolute left-5 right-5 top-5 flex flex-wrap gap-2">
                  {post.destination && (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#0B1C3E]">
                      {post.destination}
                    </span>
                  )}
                  {post.relatedPackage?.title && (
                    <span className="rounded-full bg-[#D4AF37] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#0B1C3E]">
                      {post.relatedPackage.title}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">
                    {formatEvidenceDate(post.eventDate || post.createdAt)}
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-white">
                    {post.title}
                  </h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-7 text-gray-600">
                  {post.caption}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                    {(post.images?.length || 0)} image{post.images?.length === 1 ? '' : 's'}
                    {post.videoUrl ? ' + video story' : ''}
                  </div>
                  {post.videoUrl && (
                    <a
                      href={post.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-[#0B1C3E] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1a2f55]"
                    >
                      Watch Story
                    </a>
                  )}
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
