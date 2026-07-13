import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios, { resolveBackendUrl } from '../lib/api';
import { formatMediaPostInteractionLabel, formatMediaPostRelativeTime } from '../lib/mediaPosts.js';
import {
  StaffCardSection,
  StaffEmptyState,
  StaffFilterPills,
  StaffInfoPill,
  StaffMetricCard,
  StaffPageShell,
} from './staff/WorkspacePrimitives.jsx';

const MEDIA_POST_FILTERS = [
  { value: 'all', label: 'All posts' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'video', label: 'With video link' },
];

const defaultFormData = {
  title: '',
  caption: '',
  destination: '',
  eventDate: '',
  relatedPackageId: '',
  videoUrl: '',
  isPublished: true,
};

function matchesMediaPostFilter(post, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  if (filterValue === 'published') {
    return Boolean(post?.isPublished);
  }

  if (filterValue === 'draft') {
    return !post?.isPublished;
  }

  if (filterValue === 'video') {
    return Boolean(String(post?.videoUrl || '').trim());
  }

  return true;
}

function getMediaPostFilterOptions(posts) {
  return MEDIA_POST_FILTERS.map((option) => ({
    ...option,
    count: posts.filter((post) => matchesMediaPostFilter(post, option.value)).length,
  }));
}

function formatMediaPostDate(value) {
  if (!value) {
    return 'Recent journey';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recent journey';
  }

  return parsedDate.toLocaleDateString();
}

function buildFormDataPayload(formData, existingImages, newImages) {
  const payload = new FormData();
  payload.append('title', formData.title);
  payload.append('caption', formData.caption);
  payload.append('destination', formData.destination);
  payload.append('eventDate', formData.eventDate);
  payload.append('relatedPackageId', formData.relatedPackageId);
  payload.append('videoUrl', formData.videoUrl);
  payload.append('isPublished', String(formData.isPublished));
  payload.append('existingImages', JSON.stringify(existingImages));

  newImages.forEach((image) => {
    payload.append('images', image.file);
  });

  return payload;
}

const ManageMediaPosts = () => {
  const [mediaPosts, setMediaPosts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingMediaPostId, setEditingMediaPostId] = useState(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionPostId, setActionPostId] = useState(null);

  const revokeNewImagePreviews = useCallback((imagesToClear = []) => {
    imagesToClear.forEach((image) => {
      if (image?.previewUrl) {
        window.URL.revokeObjectURL(image.previewUrl);
      }
    });
  }, []);

  const fetchMediaPosts = useCallback(async () => {
    const response = await axios.get('/media-posts/manage');
    return Array.isArray(response.data) ? response.data : [];
  }, []);

  const fetchDependencies = useCallback(async () => {
    setLoading(true);

    try {
      const [mediaPostsResponse, packagesResponse] = await Promise.all([
        fetchMediaPosts(),
        axios.get('/packages'),
      ]);

      setMediaPosts(mediaPostsResponse);
      setPackages(Array.isArray(packagesResponse.data) ? packagesResponse.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to load travel evidence.');
    } finally {
      setLoading(false);
    }
  }, [fetchMediaPosts]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => (
    () => {
      revokeNewImagePreviews(newImages);
    }
  ), [newImages, revokeNewImagePreviews]);

  const filteredMediaPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return mediaPosts.filter((post) => {
      if (!matchesMediaPostFilter(post, mediaFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        String(post.title || '').toLowerCase().includes(term) ||
        String(post.caption || '').toLowerCase().includes(term) ||
        String(post.destination || '').toLowerCase().includes(term) ||
        String(post.relatedPackage?.title || '').toLowerCase().includes(term)
      );
    });
  }, [mediaFilter, mediaPosts, searchTerm]);

  const metrics = [
    {
      label: 'Published Stories',
      value: mediaPosts.filter((post) => post.isPublished).length,
      hint: 'Evidence posts already visible on the homepage.',
      tone: 'accent',
    },
    {
      label: 'Draft Stories',
      value: mediaPosts.filter((post) => !post.isPublished).length,
      hint: 'Posts still being prepared before they are shown publicly.',
      tone: 'warm',
    },
    {
      label: 'Story Comments',
      value: mediaPosts.reduce((total, post) => total + Number(post.engagement?.comments || 0), 0),
      hint: 'Public replies already left on live travel stories.',
      tone: 'default',
    },
    {
      label: 'Story Likes',
      value: mediaPosts.reduce((total, post) => total + Number(post.engagement?.likes || 0), 0),
      hint: 'Unique story likes tracked from the public website.',
      tone: 'accent',
    },
    {
      label: 'Video Opens',
      value: mediaPosts.reduce((total, post) => total + Number(post.engagement?.videoViews || 0), 0),
      hint: 'Tracked clicks on story video buttons from public post pages.',
      tone: 'default',
    },
  ];

  const resetForm = useCallback(() => {
    revokeNewImagePreviews(newImages);
    setFormData(defaultFormData);
    setExistingImages([]);
    setNewImages([]);
    setEditingMediaPostId(null);
    setShowForm(false);
    setSubmitting(false);
  }, [newImages, revokeNewImagePreviews]);

  const handleEdit = (post) => {
    revokeNewImagePreviews(newImages);
    setFormData({
      title: post.title || '',
      caption: post.caption || '',
      destination: post.destination || '',
      eventDate: post.eventDate ? new Date(post.eventDate).toISOString().slice(0, 10) : '',
      relatedPackageId: post.relatedPackageId ? String(post.relatedPackageId) : '',
      videoUrl: post.videoUrl || '',
      isPublished: Boolean(post.isPublished),
    });
    setExistingImages(Array.isArray(post.images) ? [...post.images] : []);
    setNewImages([]);
    setEditingMediaPostId(post.id);
    setShowForm(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const previewImages = selectedFiles.map((file) => ({
      file,
      previewUrl: window.URL.createObjectURL(file),
      key: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    }));

    setNewImages((currentImages) => [...currentImages, ...previewImages]);
    event.target.value = '';
  };

  const removeExistingImage = (imageUrl) => {
    setExistingImages((currentImages) => currentImages.filter((image) => image !== imageUrl));
  };

  const removeNewImage = (imageKey) => {
    setNewImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.key === imageKey);
      if (imageToRemove?.previewUrl) {
        window.URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return currentImages.filter((image) => image.key !== imageKey);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildFormDataPayload(formData, existingImages, newImages);

      if (editingMediaPostId) {
        await axios.put(`/media-posts/${editingMediaPostId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: 'Travel evidence post updated successfully.' });
      } else {
        await axios.post('/media-posts', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: 'Travel evidence post created successfully.' });
      }

      const refreshedMediaPosts = await fetchMediaPosts();
      setMediaPosts(refreshedMediaPosts);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to save travel evidence post.');
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this travel evidence post?')) {
      return;
    }

    setActionPostId(postId);
    setError(null);
    setMessage(null);

    try {
      await axios.delete(`/media-posts/${postId}`);
      setMediaPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
      setMessage({ type: 'success', text: 'Travel evidence post deleted successfully.' });

      if (editingMediaPostId === postId) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to delete travel evidence post.');
    } finally {
      setActionPostId(null);
    }
  };

  const handleMove = async (postId, direction) => {
    const currentIndex = mediaPosts.findIndex((post) => post.id === postId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= mediaPosts.length) {
      return;
    }

    const reorderedPosts = [...mediaPosts];
    const [movedPost] = reorderedPosts.splice(currentIndex, 1);
    reorderedPosts.splice(targetIndex, 0, movedPost);
    const orderedIds = reorderedPosts.map((post) => post.id);

    setActionPostId(postId);
    setMediaPosts(reorderedPosts);
    setError(null);

    try {
      await axios.put('/media-posts/reorder', { orderedIds });
      setMessage({ type: 'success', text: 'Travel evidence order updated.' });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to reorder travel evidence.');
      const refreshedMediaPosts = await fetchMediaPosts();
      setMediaPosts(refreshedMediaPosts);
    } finally {
      setActionPostId(null);
    }
  };

  const handlePublishToggle = async (post) => {
    setActionPostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const payload = new FormData();
      payload.append('title', post.title || '');
      payload.append('caption', post.caption || '');
      payload.append('destination', post.destination || '');
      payload.append('eventDate', post.eventDate ? new Date(post.eventDate).toISOString().slice(0, 10) : '');
      payload.append('relatedPackageId', post.relatedPackageId ? String(post.relatedPackageId) : '');
      payload.append('videoUrl', post.videoUrl || '');
      payload.append('isPublished', String(!post.isPublished));
      payload.append('existingImages', JSON.stringify(post.images || []));

      await axios.put(`/media-posts/${post.id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const refreshedMediaPosts = await fetchMediaPosts();
      setMediaPosts(refreshedMediaPosts);
      setMessage({
        type: 'success',
        text: !post.isPublished ? 'Travel evidence is now published on the homepage.' : 'Travel evidence has been moved back to draft.',
      });
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update publish status.');
    } finally {
      setActionPostId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading travel evidence...</div>;
  }

  return (
    <StaffPageShell
      eyebrow="Content and Trust"
      title="Travel Evidence"
      description="Publish real travel moments, destination proof, and journey updates without turning the workspace into a heavy CMS."
      actions={(
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="rounded-full bg-[#101c2d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16263b]"
        >
          {showForm ? 'Close Form' : 'Add Travel Evidence'}
        </button>
      )}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <StaffMetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} tone={metric.tone} />
        ))}
      </div>

      {showForm && (
        <StaffCardSection
          title={editingMediaPostId ? 'Edit Travel Evidence' : 'Create Travel Evidence'}
          description="Images are stored in Neon-backed storage for this project size. Larger video stories should stay as external links, such as YouTube."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Title</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                  required
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Destination or story label</span>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(event) => setFormData({ ...formData, destination: event.target.value })}
                  placeholder="Makkah, Madinah, Zanzibar, Kigali..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Caption</span>
                <textarea
                  value={formData.caption}
                  onChange={(event) => setFormData({ ...formData, caption: event.target.value })}
                  required
                  placeholder="Explain what happened, what the traveler experienced, or what this evidence proves."
                  className="h-32 w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Event date</span>
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(event) => setFormData({ ...formData, eventDate: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Related package</span>
                <select
                  value={formData.relatedPackageId}
                  onChange={(event) => setFormData({ ...formData, relatedPackageId: event.target.value })}
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                >
                  <option value="">Not linked to a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-gray-700">External video link</span>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(event) => setFormData({ ...formData, videoUrl: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
                />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-[#ebe4d3] bg-[#fbfaf7] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#101c2d]">Images</h3>
                  <p className="mt-2 text-sm leading-6 text-[#67707e]">
                    Upload proof photos, traveler moments, or destination highlights. Keep bigger videos as external links.
                  </p>
                </div>
                <label className="rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white">
                  Add Images
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelection}
                    className="hidden"
                  />
                </label>
              </div>

              {(existingImages.length > 0 || newImages.length > 0) ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {existingImages.map((imageUrl) => (
                    <div key={imageUrl} className="overflow-hidden rounded-[1.25rem] border border-[#ece4d2] bg-white">
                      <img src={resolveBackendUrl(imageUrl)} alt="Existing travel evidence" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(imageUrl)}
                        className="w-full border-t border-[#ece4d2] px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {newImages.map((image) => (
                    <div key={image.key} className="overflow-hidden rounded-[1.25rem] border border-[#ece4d2] bg-white">
                      <img src={image.previewUrl} alt="New travel evidence" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(image.key)}
                        className="w-full border-t border-[#ece4d2] px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[#67707e]">
                  No images selected yet. Add at least one image or provide a video link before saving.
                </p>
              )}
            </div>

            <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#101c2d]">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(event) => setFormData({ ...formData, isPublished: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#101c2d] focus:ring-[#7f6a3d]"
              />
              Publish this post on the homepage immediately
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving...' : editingMediaPostId ? 'Save Travel Evidence' : 'Create Travel Evidence'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </StaffCardSection>
      )}

      <StaffCardSection
        title="Filter and Search"
        description="Switch between published stories, drafts, and video-linked posts before narrowing to a destination or package."
      >
        <div className="space-y-4">
          <StaffFilterPills
            options={getMediaPostFilterOptions(mediaPosts)}
            value={mediaFilter}
            onChange={setMediaFilter}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700">Search travel evidence</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title, caption, package, or destination..."
              className="w-full rounded-2xl border border-gray-300 bg-[#fcfbf8] px-4 py-3 text-sm text-[#101c2d] outline-none transition focus:border-[#7f6a3d] focus:bg-white"
            />
          </label>
        </div>
      </StaffCardSection>

      <StaffCardSection
        title="Published and Draft Stories"
        description="Use the order controls to shape homepage storytelling, then watch replies, likes, and video interest without leaving this workspace."
      >
        {filteredMediaPosts.length === 0 ? (
          <StaffEmptyState
            title="No travel evidence matches this view"
            description="Try another filter, widen your search, or create the first proof post to begin building the public evidence section."
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredMediaPosts.map((post) => {
              const currentIndex = mediaPosts.findIndex((item) => item.id === post.id);
              const isFirst = currentIndex === 0;
              const isLast = currentIndex === mediaPosts.length - 1;
              const heroImage = post.heroImage || post.images?.[0];

              return (
                <article key={post.id} className="overflow-hidden rounded-[1.75rem] border border-[#ebe4d3] bg-white shadow-sm">
                  <div className="relative h-64 bg-[#0B1C3E]/10">
                    {heroImage ? (
                      <img
                        src={resolveBackendUrl(heroImage)}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-[#67707e]">
                        No image uploaded yet
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#101c2d]">
                        Order #{currentIndex + 1}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${post.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {post.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7443]">
                          {formatMediaPostDate(post.eventDate || post.createdAt)}
                        </div>
                        <h3 className="mt-2 text-2xl font-black text-[#101c2d]">{post.title}</h3>
                      </div>
                      {post.relatedPackage?.title && (
                        <span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#7f6a3d]">
                          {post.relatedPackage.title}
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-[#5b6472]">
                      {post.caption}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.destination && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {post.destination}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                        {post.images?.length || 0} image{post.images?.length === 1 ? '' : 's'}
                      </span>
                      {post.videoUrl && (
                        <a
                          href={post.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[#101c2d] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#16263b]"
                        >
                          Watch video
                        </a>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.1rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7a828f]">Likes</div>
                        <div className="mt-2 text-2xl font-black text-[#101c2d]">{post.engagement?.likes || 0}</div>
                      </div>
                      <div className="rounded-[1.1rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7a828f]">Comments</div>
                        <div className="mt-2 text-2xl font-black text-[#101c2d]">{post.engagement?.comments || 0}</div>
                      </div>
                      <div className="rounded-[1.1rem] border border-[#ece4d2] bg-[#fbfaf7] px-4 py-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7a828f]">Video Opens</div>
                        <div className="mt-2 text-2xl font-black text-[#101c2d]">{post.engagement?.videoViews || 0}</div>
                      </div>
                    </div>

                    {(post.recentComments?.length > 0 || post.recentInteractions?.length > 0) ? (
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-[#ece4d2] bg-[#fbfaf7] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-black text-[#101c2d]">Latest replies</h4>
                            <StaffInfoPill tone="warm">{post.engagement?.comments || 0}</StaffInfoPill>
                          </div>
                          <div className="mt-3 space-y-3">
                            {post.recentComments?.length ? post.recentComments.map((comment) => (
                              <div key={comment.id} className="rounded-[1rem] border border-white bg-white px-3 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-black text-[#101c2d]">{comment.authorDisplayName || comment.authorName}</span>
                                  <span className="text-xs text-[#7a828f]">{formatMediaPostRelativeTime(comment.createdAt)}</span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#5b6472]">{comment.message}</p>
                              </div>
                            )) : (
                              <p className="text-sm leading-6 text-[#67707e]">No replies yet on this story.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.25rem] border border-[#ece4d2] bg-[#fbfaf7] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-black text-[#101c2d]">Recent activity</h4>
                            <StaffInfoPill tone="accent">
                              {(post.engagement?.likes || 0) + (post.engagement?.videoViews || 0)}
                            </StaffInfoPill>
                          </div>
                          <div className="mt-3 space-y-3">
                            {post.recentInteractions?.length ? post.recentInteractions.map((interaction) => (
                              <div key={interaction.id} className="rounded-[1rem] border border-white bg-white px-3 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-black text-[#101c2d]">{interaction.actorName}</span>
                                  <span className="text-xs text-[#7a828f]">{formatMediaPostRelativeTime(interaction.createdAt)}</span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#5b6472]">
                                  {formatMediaPostInteractionLabel(interaction.type)}
                                </p>
                              </div>
                            )) : (
                              <p className="text-sm leading-6 text-[#67707e]">No likes or video opens tracked yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to={`/stories/${post.id}`}
                        className="rounded-full border border-[#d8cfbf] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#faf8f3]"
                      >
                        Preview Story
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEdit(post)}
                        className="rounded-full bg-[#101c2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16263b]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishToggle(post)}
                        disabled={actionPostId === post.id}
                        className="rounded-full border border-[#101c2d] px-4 py-2 text-sm font-bold text-[#101c2d] transition hover:bg-[#101c2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {post.isPublished ? 'Move to Draft' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(post.id, 'up')}
                        disabled={isFirst || actionPostId === post.id}
                        className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(post.id, 'down')}
                        disabled={isLast || actionPostId === post.id}
                        className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Move Down
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={actionPostId === post.id}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </StaffCardSection>
    </StaffPageShell>
  );
};

export default ManageMediaPosts;
