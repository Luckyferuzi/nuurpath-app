import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatAdminDate, formatAdminDateTime } from '../lib/staffRequestUtils.js';
import {
  StaffCardSection,
  StaffDetailRow,
  StaffDetailSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffMetricCard,
  StaffPageShell,
} from './staff/WorkspacePrimitives.jsx';

const REVIEW_FILTERS = [
  { value: 'all', label: 'All reviews' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'visible', label: 'Visible' },
  { value: 'media', label: 'With media' },
];

function truncateText(value, maxLength = 180) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getReviewVisibilityClassName(review) {
  return review?.isVisible ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
}

function getReviewVisibilityLabel(review) {
  return review?.isVisible ? 'Visible' : 'Pending approval';
}

function getMediaCount(review) {
  return (review?.images?.length || 0) + (review?.videos?.length || 0);
}

function matchesReviewFilter(review, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  if (filterValue === 'pending') {
    return !review?.isVisible;
  }

  if (filterValue === 'visible') {
    return review?.isVisible;
  }

  if (filterValue === 'media') {
    return getMediaCount(review) > 0;
  }

  return true;
}

function getReviewFilterOptions(reviews) {
  return REVIEW_FILTERS.map((option) => ({
    ...option,
    count: reviews.filter((review) => matchesReviewFilter(review, option.value)).length,
  }));
}

const ManageReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [actionReviewId, setActionReviewId] = useState(null);

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const fetchReviews = useCallback(async () => {
    setLoading(true);

    try {
      const response = await axios.get('/reviews?all=true');
      setReviews(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (!reviews.length) {
      setSelectedReviewId(null);
      return;
    }

    const selectedExists = reviews.some((review) => review.id === selectedReviewId);
    if (!selectedExists) {
      setSelectedReviewId(reviews[0].id);
    }
  }, [reviews, selectedReviewId]);

  const filteredReviews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return reviews.filter((review) => {
      if (!matchesReviewFilter(review, reviewFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(review.name || '').toLowerCase().includes(term) ||
        String(review.comment || '').toLowerCase().includes(term) ||
        String(review.package?.title || '').toLowerCase().includes(term)
      );
    });
  }, [reviewFilter, reviews, searchTerm]);

  const selectedReview = filteredReviews.find((review) => review.id === selectedReviewId)
    || filteredReviews[0]
    || reviews.find((review) => review.id === selectedReviewId)
    || reviews[0]
    || null;

  const metrics = [
    {
      label: 'Pending Approval',
      value: reviews.filter((review) => !review.isVisible).length,
      hint: 'Reviews waiting for a staff decision before they appear publicly.',
      tone: 'warm',
    },
    {
      label: 'Visible Reviews',
      value: reviews.filter((review) => review.isVisible).length,
      hint: 'Testimonials and memories already helping build trust on the public site.',
      tone: 'accent',
    },
    {
      label: 'With Media',
      value: reviews.filter((review) => getMediaCount(review) > 0).length,
      hint: 'Reviews that include image or video proof and usually carry stronger trust value.',
      tone: 'default',
    },
    {
      label: 'Average Rating',
      value: reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : '0.0',
      hint: 'A quick signal for the overall customer experience coming through your published memories.',
      tone: 'default',
    },
  ];

  const handleToggleVisibility = async (review) => {
    setActionReviewId(review.id);
    setMessage(null);
    setError(null);

    try {
      const response = await axios.put(`/reviews/${review.id}/toggle`);
      const updatedReview = response.data;

      setReviews((currentReviews) => currentReviews.map((entry) => (
        entry.id === updatedReview.id ? { ...entry, isVisible: updatedReview.isVisible } : entry
      )));
      setMessage({
        type: 'success',
        text: updatedReview.isVisible ? 'Review is now visible to customers.' : 'Review has been hidden from the public site.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update review status.');
    } finally {
      setActionReviewId(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setActionReviewId(reviewId);
    setMessage(null);
    setError(null);

    try {
      await axios.delete(`/reviews/${reviewId}`);
      setReviews((currentReviews) => currentReviews.filter((review) => review.id !== reviewId));
      setMessage({ type: 'success', text: 'Review deleted successfully.' });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete review.');
    } finally {
      setActionReviewId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading reviews...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Content and Trust"
      title="Reviews"
      description="Moderate customer memories and testimonials in a cleaner approval workflow that works on smaller screens too."
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className={`rounded-2xl px-5 py-4 text-sm ${message.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      </div>

      <StaffCardSection
        title="Filter and Search"
        description="Switch quickly between pending, published, and media-based reviews before opening the full detail panel."
      >
        <div className="space-y-4">
          <StaffFilterPills
            options={getReviewFilterOptions(reviews)}
            value={reviewFilter}
            onChange={setReviewFilter}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Search reviews</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by reviewer, package, or comment..."
              className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
            />
          </label>
        </div>
      </StaffCardSection>

      {filteredReviews.length === 0 ? (
        <StaffEmptyState
          title="No reviews match this view"
          description="Try another filter or search term, or wait for new customer memories to arrive."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const isSelected = selectedReview?.id === review.id;
              const mediaCount = getMediaCount(review);

              return (
                <button
                  key={review.id}
                  type="button"
                  onClick={() => setSelectedReviewId(review.id)}
                  className={`w-full rounded-[2rem] border p-5 text-left shadow-sm transition ${isSelected ? 'border-[#101c2d] bg-[#101c2d] text-white shadow-lg' : 'border-[#ebe4d3] bg-white hover:-translate-y-0.5 hover:shadow-md'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-black uppercase tracking-[0.22em] ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        Review #{review.id}
                      </div>
                      <h3 className={`mt-2 text-xl font-black ${isSelected ? 'text-white' : 'text-[#101c2d]'}`}>
                        {review.name || 'Customer review'}
                      </h3>
                      <div className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-[#67707e]'}`}>
                        {review.package?.title || 'General NuurPath experience'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white/15 text-white' : getReviewVisibilityClassName(review)}`}>
                        {getReviewVisibilityLabel(review)}
                      </span>
                      <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#7a828f]'}`}>
                        {formatAdminDate(review.createdAt, 'Recently')}
                      </span>
                    </div>
                  </div>

                  <div className={`mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.18em] ${isSelected ? 'text-white/75' : 'text-[#7a828f]'}`}>
                    <span>{review.rating || 0}/5 rating</span>
                    <span>{mediaCount} media file{mediaCount === 1 ? '' : 's'}</span>
                    <span>{review.user ? 'Signed-in customer' : 'Guest name only'}</span>
                  </div>

                  <p className={`mt-4 text-sm leading-6 ${isSelected ? 'text-white/85' : 'text-[#5b6472]'}`}>
                    {truncateText(review.comment)}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedReview && (
            <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <StaffDetailSection
                title={`Review #${selectedReview.id}`}
                description="Approve, hide, or remove this trust content after checking the full comment and attached media."
              >
                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getReviewVisibilityClassName(selectedReview)}`}>
                    {getReviewVisibilityLabel(selectedReview)}
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    {selectedReview.rating || 0}/5 rating
                  </span>
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    Submitted {formatAdminDateTime(selectedReview.createdAt, 'recently')}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(selectedReview)}
                    disabled={actionReviewId === selectedReview.id}
                    className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionReviewId === selectedReview.id ? 'Saving...' : selectedReview.isVisible ? 'Hide Review' : 'Approve Review'}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedReview.id)}
                      disabled={actionReviewId === selectedReview.id}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete Review
                    </button>
                  )}
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Review Details">
                <div className="grid gap-3 md:grid-cols-2">
                  <StaffDetailRow label="Reviewer name" value={selectedReview.name || 'Not provided'} />
                  <StaffDetailRow label="Review topic" value={selectedReview.package?.title || 'General NuurPath experience'} />
                  <StaffDetailRow label="Rating" value={`${selectedReview.rating || 0}/5`} />
                  <StaffDetailRow label="Media count" value={`${getMediaCount(selectedReview)}`} />
                </div>
                <div className="mt-3">
                  <StaffDetailRow label="Full comment" value={selectedReview.comment || 'No comment provided.'} subtle />
                </div>
              </StaffDetailSection>

              <StaffDetailSection title="Attached Media" description="Images and videos attached to this review can be checked here before approving the post publicly.">
                {getMediaCount(selectedReview) === 0 ? (
                  <StaffEmptyState
                    title="No media attached"
                    description="This review contains text only, so you only need to decide whether the written feedback should be visible publicly."
                  />
                ) : (
                  <div className="space-y-4">
                    {selectedReview.images?.length > 0 && (
                      <div>
                        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#7a828f]">Images</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedReview.images.map((imageUrl, index) => (
                            <a
                              key={imageUrl}
                              href={imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="overflow-hidden rounded-[1.25rem] border border-[#ece4d2] bg-[#fbfaf7]"
                            >
                              <img
                                src={imageUrl}
                                alt={`Review media ${index + 1}`}
                                className="h-44 w-full object-cover"
                                loading="lazy"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReview.videos?.length > 0 && (
                      <div>
                        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#7a828f]">Videos</div>
                        <div className="space-y-3">
                          {selectedReview.videos.map((videoUrl) => (
                            <video
                              key={videoUrl}
                              src={videoUrl}
                              controls
                              className="w-full rounded-[1.25rem] border border-[#ece4d2] bg-black"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </StaffDetailSection>
            </div>
          )}
        </div>
      )}
    </StaffPageShell>
  );
};

export default ManageReviews;
