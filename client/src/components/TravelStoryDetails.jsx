import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PublicPageHeader, PublicPageShell } from './PublicPageShell.jsx';
import MediaPostImageCarousel from './MediaPostImageCarousel.jsx';
import {
  formatMediaPostDate,
  formatMediaPostRelativeTime,
  getMediaPostImageUrls,
} from '../lib/mediaPosts.js';
import {
  getOrCreateMediaPostVisitorKey,
  hasTrackedMediaPostInteraction,
  markMediaPostInteractionTracked,
} from '../lib/mediaPostEngagement.js';

const DEFAULT_COMMENT_FORM = {
  authorName: '',
  authorLocation: '',
  message: '',
};

const TravelStoryDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentForm, setCommentForm] = useState(DEFAULT_COMMENT_FORM);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentMessage, setCommentMessage] = useState(null);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasTrackedVideo, setHasTrackedVideo] = useState(false);

  useEffect(() => {
    setHasLiked(hasTrackedMediaPostInteraction(id, 'LIKE'));
    setHasTrackedVideo(hasTrackedMediaPostInteraction(id, 'VIDEO_VIEW'));
  }, [id]);

  useEffect(() => {
    setCommentForm((currentForm) => (
      currentForm.authorName
        ? currentForm
        : {
            ...currentForm,
            authorName: user?.name || '',
          }
    ));
  }, [user?.name]);

  useEffect(() => {
    const fetchStory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/media-posts/${id}`);
        setStory(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.msg || 'This travel story is not available right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [id]);

  const handleLike = async () => {
    if (!story || likeSubmitting || hasLiked) {
      return;
    }

    setLikeSubmitting(true);

    try {
      const response = await axios.post(`/media-posts/${id}/interactions`, {
        type: 'LIKE',
        visitorKey: getOrCreateMediaPostVisitorKey(),
      });

      markMediaPostInteractionTracked(id, 'LIKE');
      setHasLiked(true);
      setStory((currentStory) => (
        currentStory
          ? {
              ...currentStory,
              engagement: response.data?.engagement || currentStory.engagement,
            }
          : currentStory
      ));
    } catch (requestError) {
      setCommentError(requestError.response?.data?.msg || 'Unable to save your like right now.');
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleWatchVideo = async () => {
    if (!story?.videoUrl) {
      return;
    }

    try {
      if (!hasTrackedVideo && !videoSubmitting) {
        setVideoSubmitting(true);

        const response = await axios.post(`/media-posts/${id}/interactions`, {
          type: 'VIDEO_VIEW',
          visitorKey: getOrCreateMediaPostVisitorKey(),
        });

        markMediaPostInteractionTracked(id, 'VIDEO_VIEW');
        setHasTrackedVideo(true);
        setStory((currentStory) => (
          currentStory
            ? {
                ...currentStory,
                engagement: response.data?.engagement || currentStory.engagement,
              }
            : currentStory
        ));
      }
    } catch (requestError) {
      setCommentError(requestError.response?.data?.msg || 'Unable to open the video right now.');
      return;
    } finally {
      setVideoSubmitting(false);
    }

    window.open(story.videoUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();
    setCommentSubmitting(true);
    setCommentError(null);
    setCommentMessage(null);

    try {
      const response = await axios.post(`/media-posts/${id}/comments`, commentForm);

      setStory((currentStory) => (
        currentStory
          ? {
              ...currentStory,
              comments: [response.data.comment, ...(currentStory.comments || [])],
              engagement: response.data.engagement || currentStory.engagement,
            }
          : currentStory
      ));
      setCommentForm((currentForm) => ({
        ...currentForm,
        message: '',
      }));
      setCommentMessage('Your reply is now part of this story.');
    } catch (requestError) {
      setCommentError(requestError.response?.data?.msg || 'Unable to send your comment right now.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicPageShell>
        <div className="animate-pulse space-y-6">
          <div className="h-56 rounded-[1.75rem] bg-white" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="h-[32rem] rounded-[1.75rem] bg-white" />
            <div className="h-[32rem] rounded-[1.75rem] bg-white" />
          </div>
        </div>
      </PublicPageShell>
    );
  }

  if (error || !story) {
    return (
      <PublicPageShell>
        <div className="rounded-[1.75rem] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
          {error || 'This travel story could not be found.'}
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="space-y-8">
        <PublicPageHeader
          eyebrow="Travel Story"
          title={story.title}
          description={story.caption}
          aside={(
            <>
              <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fbfaf7] p-4">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7240]">Likes</div>
                <div className="mt-3 text-3xl font-black text-[#101c2d]">{story.engagement?.likes || 0}</div>
              </div>
              <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fbfaf7] p-4">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7240]">Comments</div>
                <div className="mt-3 text-3xl font-black text-[#101c2d]">{story.engagement?.comments || 0}</div>
              </div>
              <div className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fbfaf7] p-4">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7240]">Video opens</div>
                <div className="mt-3 text-3xl font-black text-[#101c2d]">{story.engagement?.videoViews || 0}</div>
              </div>
            </>
          )}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_380px]">
          <section className="overflow-hidden rounded-[1.85rem] border border-[#e6decc] bg-white shadow-[0_14px_40px_rgba(16,28,45,0.05)]">
            <MediaPostImageCarousel
              images={getMediaPostImageUrls(story)}
              title={story.title}
              className="h-[24rem] border-b border-[#eee6d8] sm:h-[30rem] lg:h-[34rem]"
              imageClassName="h-full w-full object-contain"
            />

            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#faf7ef] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a7240]">
                  {formatMediaPostDate(story.eventDate || story.createdAt)}
                </span>
                {story.destination ? (
                  <span className="rounded-full border border-[#e8dfcf] px-3 py-1 text-[11px] font-bold text-[#4e5764]">
                    {story.destination}
                  </span>
                ) : null}
                {story.relatedPackage?.title ? (
                  <span className="rounded-full border border-[#e8dfcf] px-3 py-1 text-[11px] font-bold text-[#4e5764]">
                    Related to {story.relatedPackage.title}
                  </span>
                ) : null}
              </div>

              <div className="rounded-[1.4rem] border border-[#ede5d5] bg-[#fbfaf7] p-5">
                <h2 className="text-lg font-black text-[#101c2d]">Story summary</h2>
                <p className="mt-3 text-sm leading-7 text-[#5f6774]">{story.caption}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLike}
                  disabled={hasLiked || likeSubmitting}
                  className={`rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.14em] transition ${
                    hasLiked
                      ? 'bg-[#0B1C3E] text-white'
                      : 'border border-[#d7cdbb] bg-white text-[#101c2d] hover:bg-[#faf8f3]'
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  {hasLiked ? 'Liked' : likeSubmitting ? 'Saving...' : 'Like story'}
                </button>
                {story.videoUrl ? (
                  <button
                    type="button"
                    onClick={handleWatchVideo}
                    disabled={videoSubmitting}
                    className="rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {videoSubmitting ? 'Opening...' : 'Watch video'}
                  </button>
                ) : null}
                {story.relatedPackage?.id ? (
                  <Link
                    to={`/packages/${story.relatedPackage.id}`}
                    className="rounded-full border border-[#d7cdbb] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition hover:bg-[#faf8f3]"
                  >
                    View related package
                  </Link>
                ) : (
                  <Link
                    to="/stories"
                    className="rounded-full border border-[#d7cdbb] bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#101c2d] transition hover:bg-[#faf8f3]"
                  >
                    Back to stories
                  </Link>
                )}
              </div>

              {commentError ? (
                <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {commentError}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.75rem] border border-[#e6decc] bg-white p-5 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:p-6">
              <h2 className="text-xl font-black text-[#101c2d]">Join the conversation</h2>
              <p className="mt-2 text-sm leading-6 text-[#67707e]">
                Reply to this story, leave a note, or share what stood out before you continue anywhere else.
              </p>

              <form onSubmit={handleCommentSubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#5b6472]">Name</span>
                    <input
                      type="text"
                      value={commentForm.authorName}
                      onChange={(event) => setCommentForm((currentForm) => ({ ...currentForm, authorName: event.target.value }))}
                      className="w-full rounded-2xl border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#8a7240] focus:bg-white"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#5b6472]">Location</span>
                    <input
                      type="text"
                      value={commentForm.authorLocation}
                      onChange={(event) => setCommentForm((currentForm) => ({ ...currentForm, authorLocation: event.target.value }))}
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#8a7240] focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#5b6472]">Reply</span>
                  <textarea
                    value={commentForm.message}
                    onChange={(event) => setCommentForm((currentForm) => ({ ...currentForm, message: event.target.value }))}
                    rows={5}
                    placeholder="Write your comment or reaction here..."
                    className="w-full rounded-[1.35rem] border border-[#d8cfbf] bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#8a7240] focus:bg-white"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={commentSubmitting}
                  className="w-full rounded-full bg-[#0B1C3E] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1a2f55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {commentSubmitting ? 'Sending...' : 'Post reply'}
                </button>

                {commentMessage ? (
                  <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {commentMessage}
                  </div>
                ) : null}
              </form>
            </section>

            <section className="rounded-[1.75rem] border border-[#e6decc] bg-white p-5 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#101c2d]">Recent replies</h2>
                <span className="text-sm font-semibold text-[#67707e]">
                  {story.comments?.length || 0} shown
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {story.comments?.length ? story.comments.map((comment) => (
                  <article key={comment.id} className="rounded-[1.35rem] border border-[#ece4d6] bg-[#fbfaf7] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-[#101c2d]">{comment.authorDisplayName || comment.authorName}</h3>
                        <p className="mt-1 text-xs text-[#7a828f]">
                          {[comment.authorLocation, formatMediaPostRelativeTime(comment.createdAt)].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#5f6774]">{comment.message}</p>
                  </article>
                )) : (
                  <div className="rounded-[1.35rem] border border-dashed border-[#d8cdb7] bg-[#fbfaf7] px-4 py-5 text-sm leading-6 text-[#67707e]">
                    No replies yet. Be the first to leave a note on this story.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        {story.relatedStories?.length ? (
          <section className="rounded-[1.85rem] border border-[#e6decc] bg-white p-5 shadow-[0_14px_40px_rgba(16,28,45,0.05)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7240]">More Stories</p>
                <h2 className="mt-2 text-2xl font-black text-[#101c2d]">Keep browsing the travel feed</h2>
              </div>
              <Link to="/stories" className="text-sm font-black uppercase tracking-[0.16em] text-[#101c2d] transition hover:text-[#8a7240]">
                View all stories
              </Link>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {story.relatedStories.map((relatedStory) => (
                <article key={relatedStory.id} className="overflow-hidden rounded-[1.5rem] border border-[#ebe4d3] bg-[#fcfbf8]">
                  <Link to={`/stories/${relatedStory.id}`} className="block">
                    <MediaPostImageCarousel
                      images={getMediaPostImageUrls(relatedStory)}
                      title={relatedStory.title}
                      className="h-64 border-b border-[#eee6d8]"
                      imageClassName="h-full w-full object-contain"
                    />
                  </Link>
                  <div className="space-y-3 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a7240]">
                      {formatMediaPostDate(relatedStory.eventDate || relatedStory.createdAt)}
                    </div>
                    <h3 className="text-xl font-black text-[#101c2d]">
                      <Link to={`/stories/${relatedStory.id}`} className="transition hover:text-[#0B1C3E]">
                        {relatedStory.title}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#67707e]">
                      <span>{relatedStory.engagement?.likes || 0} likes</span>
                      <span>{relatedStory.engagement?.comments || 0} comments</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PublicPageShell>
  );
};

export default TravelStoryDetails;
