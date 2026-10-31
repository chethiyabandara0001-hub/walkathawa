import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Upload,
  X,
  Edit3,
  Check,
  Database,
  Globe,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SEOHead } from '../components/SEOHead';
import { ADMIN_EMAIL, StoryPost, VALIDATION_LIMITS } from '../types';
import { compressImageFileToDataUrl } from '../utils/imageUtils';

export function AdminPage() {
  const {
    user,
    isAdmin,
    authReady,
    posts,
    firestorePostsCount,
    signInWithGoogle,
    signOut,
    createPost,
    updatePost,
    deletePost,
    seedInitialStoriesToFirestore,
    categories,
    collections,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const editIdParam = searchParams.get('edit');

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [collectionName, setCollectionName] = useState('Monochrome Coastlines');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSitemapModal, setShowSitemapModal] = useState(false);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Admin Panel' },
  ];

  useEffect(() => {
    if (editIdParam) {
      const target = posts.find((p) => p.id === editIdParam && !p.isSeed);
      if (target) {
        loadPostIntoForm(target);
      }
    }
  }, [editIdParam, posts]);

  const loadPostIntoForm = (post: StoryPost) => {
    setEditingPostId(post.id);
    setEditingSlug(post.slug);
    setTitle(post.title);
    setCategory(post.category);
    setCollectionName(post.collection);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setImages(post.images.length > 0 ? [...post.images] : [post.coverImage]);
    setStatusMessage(`Editing "${post.title}"`);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingPostId(null);
    setEditingSlug('');
    setTitle('');
    setCategory('Architecture');
    setCollectionName('Monochrome Coastlines');
    setExcerpt('');
    setContent('');
    setImages([]);
    setImageUrlInput('');
    if (searchParams.has('edit')) {
      setSearchParams({});
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage(null);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (images.length + newImages.length >= VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT) {
          break;
        }
        const compressed = await compressImageFileToDataUrl(files[i]);
        newImages.push(compressed);
      }
      setImages((prev) =>
        [...prev, ...newImages].slice(0, VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT)
      );
      setStatusMessage(`Added ${newImages.length} image(s) ready for Firestore storage.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to process image file.'
      );
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const clean = imageUrlInput.trim();
    if (!clean) return;
    if (images.length >= VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT) {
      setErrorMessage(`Maximum ${VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT} images per post.`);
      return;
    }
    setImages((prev) => [...prev, clean]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (images.length === 0) {
      setErrorMessage('Please upload or add at least one image for the story.');
      return;
    }

    setSavingPost(true);
    try {
      if (editingPostId) {
        await updatePost({
          id: editingPostId,
          slug: editingSlug,
          title,
          excerpt,
          content,
          category,
          collection: collectionName,
          images,
        });
        setStatusMessage('Story updated in Firestore.');
      } else {
        await createPost({
          title,
          excerpt,
          content,
          category,
          collection: collectionName,
          images,
        });
        setStatusMessage('New story published to Firestore.');
      }
      resetForm();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save story to Firestore.'
      );
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deletePost(postId);
      if (editingPostId === postId) {
        resetForm();
      }
      setStatusMessage(`Deleted "${postTitle}" from Firestore.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to delete story.'
      );
    }
  };

  const handleSeedStories = async () => {
    setSeeding(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await seedInitialStoriesToFirestore();
      setStatusMessage('Seeded starter stories into Firestore.');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to seed starter stories.'
      );
    } finally {
      setSeeding(false);
    }
  };

  const generateDynamicSitemapXml = () => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://ais-pre-ca6ojtarha2uogyhz5lcii-163749283160.asia-southeast1.run.app';
    const today = new Date().toISOString().split('T')[0];

    const staticUrls = [
      { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${origin}/posts`, priority: '0.9', changefreq: 'daily' },
      { loc: `${origin}/collections`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${origin}/categories`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${origin}/privacy-policy`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${origin}/terms-and-conditions`, priority: '0.4', changefreq: 'monthly' },
    ];

    const categoryUrls = categories.map((c) => ({
      loc: `${origin}/categories/${encodeURIComponent(c)}`,
      priority: '0.7',
      changefreq: 'weekly',
    }));

    const collectionUrls = collections.map((c) => ({
      loc: `${origin}/collections/${encodeURIComponent(c)}`,
      priority: '0.7',
      changefreq: 'weekly',
    }));

    const postUrls = posts.map((p) => ({
      loc: `${origin}/posts/${encodeURIComponent(p.id)}`,
      lastmod: p.updatedAt.toISOString().split('T')[0],
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const allEntries = [...staticUrls, ...categoryUrls, ...collectionUrls, ...postUrls];

    const xmlRows = allEntries
      .map(
        (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${'lastmod' in entry ? entry.lastmod : today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlRows}\n</urlset>`;
  };

  const handleDownloadSitemap = () => {
    const xml = generateDynamicSitemapXml();
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SEOHead
        title="Admin Panel"
        description="Administrator dashboard for managing stories and images in Firestore."
        canonicalPath="/admin"
        breadcrumbs={breadcrumbs}
        noindex
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            Firestore Content Management · Google Auth Restricted
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Admin Panel
          </h1>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Authentication Gate */}
      {!authReady ? (
        <div className="py-16 text-center text-sm text-zinc-500">
          Checking authentication status...
        </div>
      ) : !user ? (
        <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 text-center space-y-5">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            Administrator Sign In
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Sign in with Google using the authorized administrator account (
            <span className="font-mono text-xs text-zinc-900 dark:text-zinc-200">
              {ADMIN_EMAIL}
            </span>
            ) to add, edit, or delete stories and images in Firestore.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Continue with Google</span>
          </button>
        </div>
      ) : !isAdmin ? (
        <div className="max-w-lg mx-auto my-12 p-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-center space-y-4">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-300">
            Access Restricted
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Signed in as <strong>{user.email}</strong>. Only{' '}
            <code className="font-mono">{ADMIN_EMAIL}</code> has administrator
            permissions to modify stories.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Google Account</span>
          </button>
        </div>
      ) : (
        /* Verified Admin Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Add / Edit Story Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                {editingPostId ? 'Edit Story & Images' : 'Publish New Story'}
              </h2>
              {editingPostId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {statusMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-800 dark:text-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitPost} className="space-y-5">
              <div>
                <label
                  htmlFor="post-title"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Story Title *
                </label>
                <input
                  id="post-title"
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.POST_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter story headline..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="post-category"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Category *
                  </label>
                  <input
                    id="post-category"
                    type="text"
                    required
                    maxLength={VALIDATION_LIMITS.POST_CATEGORY_MAX}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Architecture, Photography, Chronicles"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="post-collection"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Collection *
                  </label>
                  <input
                    id="post-collection"
                    type="text"
                    required
                    maxLength={VALIDATION_LIMITS.POST_COLLECTION_MAX}
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="e.g. Winter Archives, Night Studies"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="post-excerpt"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Short Summary / Excerpt
                </label>
                <input
                  id="post-excerpt"
                  type="text"
                  maxLength={VALIDATION_LIMITS.POST_EXCERPT_MAX}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief 1-sentence introduction shown in gallery and search snippets..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Image Management Section (Upload files or paste URLs, remove images) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Story Images ({images.length}/{VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT}) *
                  </label>
                  <span className="text-xs text-zinc-500">
                    First image is the gallery cover & top image
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingImage ? 'Compressing...' : 'Upload Image File(s)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Or paste image URL / data URI..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {/* Attached Images Preview & Remove Controls */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {images.map((imgSrc, index) => (
                      <div
                        key={index}
                        className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900"
                      >
                        <img
                          src={imgSrc}
                          alt={`Attached ${index + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 flex items-center justify-between text-[11px] text-white">
                          <span>{index === 0 ? 'Cover Image' : `Image #${index + 1}`}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            aria-label={`Remove image ${index + 1}`}
                            className="text-red-300 hover:text-red-100 p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="post-content"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Full Story Text *
                </label>
                <textarea
                  id="post-content"
                  required
                  rows={10}
                  maxLength={VALIDATION_LIMITS.POST_CONTENT_MAX}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the full story here. Separate paragraphs with a blank line..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 font-editorial leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                {editingPostId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingPost || uploadingImage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {savingPost
                      ? 'Saving to Firestore...'
                      : editingPostId
                      ? 'Save Updated Story'
                      : 'Publish Story to Firestore'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Right 5 Columns: Existing Stories Manager & Google Search Console Sitemap Tools */}
          <div className="lg:col-span-5 space-y-6">
            {/* Search Console & Sitemap Utility */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Google Search Console & SEO</span>
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 dark:text-zinc-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>sitemap.xml</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>·</span>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 dark:text-zinc-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>robots.txt</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Static <code>/sitemap.xml</code> and <code>/robots.txt</code> are live at
                your domain root. You can also export an updated XML sitemap containing
                all {posts.length} dynamic story URLs.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadSitemap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Dynamic sitemap.xml</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSitemapModal((v) => !v)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  {showSitemapModal ? 'Hide XML' : 'Preview XML'}
                </button>
              </div>
              {showSitemapModal && (
                <pre className="mt-3 p-3 rounded-lg bg-zinc-950 text-zinc-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-zinc-800">
                  {generateDynamicSitemapXml()}
                </pre>
              )}
            </div>

            {/* Firestore Posts List */}
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                    Published Stories ({firestorePostsCount} in Firestore)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Newest stories appear at the top of the gallery.
                  </p>
                </div>

                {firestorePostsCount === 0 && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedStories}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>{seeding ? 'Seeding...' : 'Seed 6 Stories to Firestore'}</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[540px] overflow-y-auto pr-1">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-10 rounded object-cover bg-zinc-900 shrink-0 border border-zinc-200 dark:border-zinc-800"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/posts/${encodeURIComponent(post.id)}`}
                          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate block"
                        >
                          {post.title}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>{post.category}</span>
                          <span>·</span>
                          <span>{post.images.length} img</span>
                          {post.isSeed && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400">
                                Preview Seed
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!post.isSeed && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadPostIntoForm(post)}
                          aria-label={`Edit ${post.title}`}
                          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id, post.title)}
                          aria-label={`Delete ${post.title}`}
                          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
