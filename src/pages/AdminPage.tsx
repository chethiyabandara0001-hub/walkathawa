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
  Globe,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  Layers,
  FolderKanban,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEOHead } from '../components/SEOHead';
import { ADMIN_EMAIL, StoryPost, VALIDATION_LIMITS } from '../types';
import { compressImageFileToDataUrl } from '../utils/imageUtils';

export function AdminPage() {
  const {
    user,
    isAdmin,
    authReady,
    allPostsForAdmin,
    firestorePostsCount,
    signInWithGoogle,
    signOut,
    createPost,
    updatePost,
    togglePublishPost,
    deletePost,
    categories,
    collections,
    addCategory,
    removeCategory,
    addCollection,
    removeCollection,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const editIdParam = searchParams.get('edit');

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [newCollectionInput, setNewCollectionInput] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [published, setPublished] = useState<boolean>(true);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSitemapModal, setShowSitemapModal] = useState(false);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Admin Panel' },
  ];

  useEffect(() => {
    if (editIdParam) {
      const target = allPostsForAdmin.find((p) => p.id === editIdParam);
      if (target) {
        loadPostIntoForm(target);
      }
    }
  }, [editIdParam, allPostsForAdmin.length]);

  const loadPostIntoForm = (post: StoryPost) => {
    setEditingPostId(post.id);
    setEditingSlug(post.slug);
    setTitle(post.title);
    setCategory(post.category);
    setCollectionName(post.collection);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setImages(post.images.length > 0 ? [...post.images] : [post.coverImage]);
    setPublished(post.published !== false);
    setStatusMessage(`Editing "${post.title}" — make changes below and click Update & Publish.`);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingPostId(null);
    setEditingSlug('');
    setTitle('');
    setCategory(categories[0] || '');
    setCollectionName(collections[0] || '');
    setExcerpt('');
    setContent('');
    setImages([]);
    setPublished(true);
    setImageUrlInput('');
    if (searchParams.has('edit')) {
      setSearchParams({});
    }
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryInput.trim();
    if (!clean) return;
    setErrorMessage(null);
    try {
      await addCategory(clean);
      setCategory(clean);
      setNewCategoryInput('');
      setStatusMessage(`Created category "${clean}" and selected it.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create category.'
      );
    }
  };

  const handleCreateCollection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCollectionInput.trim();
    if (!clean) return;
    setErrorMessage(null);
    try {
      await addCollection(clean);
      setCollectionName(clean);
      setNewCollectionInput('');
      setStatusMessage(`Created collection "${clean}" and selected it.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create collection.'
      );
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
      setStatusMessage(`Added ${newImages.length} image(s) to post.`);
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
    setStatusMessage('Added image URL to post.');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetAsCoverImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
    setStatusMessage('Updated primary cover image.');
  };

  const savePostWithStatus = async (shouldPublish: boolean) => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a story title.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Please enter the story text.');
      return;
    }
    if (images.length === 0) {
      setErrorMessage('Please upload or add at least one image for the story.');
      return;
    }

    const finalCategory = category.trim() || newCategoryInput.trim();
    const finalCollection = collectionName.trim() || newCollectionInput.trim();

    setSavingPost(true);
    try {
      if (editingPostId) {
        await updatePost({
          id: editingPostId,
          slug: editingSlug,
          title,
          excerpt,
          content,
          category: finalCategory,
          collection: finalCollection,
          images,
          published: shouldPublish,
        });
        setStatusMessage(
          shouldPublish
            ? 'Story updated and published to Firestore!'
            : 'Story saved as draft in Firestore.'
        );
      } else {
        await createPost({
          title,
          excerpt,
          content,
          category: finalCategory,
          collection: finalCollection,
          images,
          published: shouldPublish,
        });
        setStatusMessage(
          shouldPublish
            ? 'New story published to Firestore!'
            : 'New story saved as draft in Firestore.'
        );
      }
      setNewCategoryInput('');
      setNewCollectionInput('');
      resetForm();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save story to Firestore.'
      );
    } finally {
      setSavingPost(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePostWithStatus(published);
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setDeletingId(postId);
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
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (post: StoryPost) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setTogglingId(post.id);
    try {
      await togglePublishPost(post);
      setStatusMessage(
        post.published
          ? `Moved "${post.title}" to drafts.`
          : `Published "${post.title}" to live gallery.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to change publish status.'
      );
    } finally {
      setTogglingId(null);
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

    const postUrls = allPostsForAdmin
      .filter((p) => p.published !== false)
      .map((p) => ({
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
        description="Administrator dashboard for adding categories, creating, editing, publishing, and deleting stories in Firestore."
        canonicalPath="/admin"
        breadcrumbs={breadcrumbs}
        noindex
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-[#1e2f52]">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            walkathawa Admin · Manage Categories, Collections, Posts & Images
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Admin Panel
          </h1>
        </div>

        {user && (
          <div className="flex flex-wrap items-center gap-3">
            {editingPostId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setStatusMessage('Ready to create a new story.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Post</span>
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Authentication Gate */}
      {!authReady ? (
        <div className="py-16 text-center text-sm text-slate-500">
          Checking authentication status...
        </div>
      ) : !user ? (
        <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] text-center space-y-5">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            Administrator Sign In
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Sign in with Google using the authorized administrator account (
            <span className="font-mono text-xs text-slate-900 dark:text-slate-100">
              {ADMIN_EMAIL}
            </span>
            ) to manage categories and stories in Firestore.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer"
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
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Signed in as <strong>{user.email}</strong>. Only{' '}
            <code className="font-mono">{ADMIN_EMAIL}</code> has administrator
            permissions to modify stories.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Google Account</span>
          </button>
        </div>
      ) : (
        /* Verified Admin Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Add / Edit / Publish Story Form */}
          <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-[#1e2f52]">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  {editingPostId ? 'Edit Existing Story' : 'Create & Publish New Story'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingPostId
                    ? 'Update text, change category, add/remove images, or republish.'
                    : 'Create or select a category, attach images, and publish to Firestore.'}
                </p>
              </div>
              {editingPostId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Switch to New Story</span>
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
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category Selection & Creation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="post-category-select"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Assign Story to Category
                  </label>
                  {category && (
                    <Link
                      to={`/categories/${encodeURIComponent(category)}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View &ldquo;{category}&rdquo; Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          category === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No categories yet. Type a category name below and click Add Category.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="post-category-select"
                    type="text"
                    maxLength={VALIDATION_LIMITS.POST_CATEGORY_MAX}
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Type a new category name..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCategory()}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {/* Collection Selection & Creation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="post-collection-input"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    Assign Story to Collection (Optional)
                  </label>
                  {collectionName && (
                    <Link
                      to={`/collections/${encodeURIComponent(collectionName)}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>View &ldquo;{collectionName}&rdquo; Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {collections.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {collections.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setCollectionName(col)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          collectionName === col
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="post-collection-input"
                    type="text"
                    maxLength={VALIDATION_LIMITS.POST_COLLECTION_MAX}
                    value={newCollectionInput}
                    onChange={(e) => setNewCollectionInput(e.target.value)}
                    placeholder="Type a new collection name..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCollection()}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Collection</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="post-excerpt"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Short Summary / Excerpt
                </label>
                <input
                  id="post-excerpt"
                  type="text"
                  maxLength={VALIDATION_LIMITS.POST_EXCERPT_MAX}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief summary shown in gallery and search snippets..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Image Management Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Story Images ({images.length}/{VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT}) *
                  </label>
                  <span className="text-xs text-slate-500">
                    Add multiple images · Click star to set cover · Click ✕ to remove
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#1e2f52] bg-slate-50 dark:bg-[#0a1124] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingImage ? 'Compressing...' : 'Upload & Add Image(s)'}
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
                      placeholder="Or paste image URL to add..."
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#1e2f52] bg-slate-100 dark:bg-[#162544] text-slate-800 dark:text-slate-200 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                    >
                      Add Image
                    </button>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {images.map((imgSrc, index) => (
                      <div
                        key={index}
                        className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e2f52] bg-[#0a1124]"
                      >
                        <img
                          src={imgSrc}
                          alt={`Story image ${index + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2.5 py-1.5 flex items-center justify-between text-[11px] text-white">
                          <button
                            type="button"
                            onClick={() => handleSetAsCoverImage(index)}
                            title="Set as main cover image"
                            className={`inline-flex items-center gap-1 cursor-pointer ${
                              index === 0
                                ? 'text-amber-300 font-semibold'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            <span>{index === 0 ? 'Cover Image' : 'Make Cover'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            aria-label={`Remove image ${index + 1}`}
                            title="Remove this image"
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
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-editorial leading-relaxed"
                />
              </div>

              {/* Publish Action Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#1e2f52] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {editingPostId && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = allPostsForAdmin.find((p) => p.id === editingPostId);
                        if (target) {
                          handleDeletePost(target.id, target.title);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete This Story</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={savingPost || uploadingImage}
                    onClick={() => savePostWithStatus(false)}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    disabled={savingPost || uploadingImage}
                    onClick={() => savePostWithStatus(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {savingPost
                        ? 'Publishing...'
                        : editingPostId
                        ? 'Update & Publish Story'
                        : 'Publish Story'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right 5 Columns: Category Manager, Collection Manager & Stories Manager */}
          <div className="lg:col-span-5 space-y-6">
            {/* Categories Manager */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Categories ({categories.length})</span>
                </h3>
                <Link
                  to="/categories"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Categories Page →
                </Link>
              </div>

              <form onSubmit={handleCreateCategory} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={VALIDATION_LIMITS.POST_CATEGORY_MAX}
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Create new category..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </form>

              {categories.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  No categories created yet. Add your custom categories above.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-[#1e2f52] max-h-56 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const count = allPostsForAdmin.filter(
                      (p) => p.category.toLowerCase() === cat.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={cat}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            to={`/categories/${encodeURIComponent(cat)}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {cat}
                          </Link>
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                            ({count})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCategory(cat)}
                            className="text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer"
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCategory(cat)}
                            title={`Delete category ${cat}`}
                            className="text-red-500 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collections Manager */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  <span>Collections ({collections.length})</span>
                </h3>
                <Link
                  to="/collections"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Collections Page →
                </Link>
              </div>

              <form onSubmit={handleCreateCollection} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={VALIDATION_LIMITS.POST_COLLECTION_MAX}
                  value={newCollectionInput}
                  onChange={(e) => setNewCollectionInput(e.target.value)}
                  placeholder="Create new collection..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </form>

              {collections.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                  No collections created yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-[#1e2f52] max-h-48 overflow-y-auto pr-1">
                  {collections.map((col) => {
                    const count = allPostsForAdmin.filter(
                      (p) => p.collection.toLowerCase() === col.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={col}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Link
                            to={`/collections/${encodeURIComponent(col)}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {col}
                          </Link>
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                            ({count})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCollectionName(col)}
                            className="text-slate-600 dark:text-slate-300 hover:text-blue-500 cursor-pointer"
                          >
                            Select
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCollection(col)}
                            title={`Delete collection ${col}`}
                            className="text-red-500 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All Stories List */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                  Manage Stories ({allPostsForAdmin.length} Total)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click Edit to modify or add images, or Delete to remove.
                </p>
              </div>

              {allPostsForAdmin.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No stories published yet. Use the form on the left to publish your first story.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-[#1e2f52] max-h-[520px] overflow-y-auto pr-1">
                  {allPostsForAdmin.map((post) => {
                    const isCurrentlyEditing = editingPostId === post.id;
                    return (
                      <div
                        key={post.id}
                        className={`py-3.5 flex items-center justify-between gap-3 rounded-lg px-2 transition-colors ${
                          isCurrentlyEditing
                            ? 'bg-slate-100 dark:bg-[#162544]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-10 rounded object-cover bg-[#0a1124] shrink-0 border border-slate-200 dark:border-[#1e2f52]"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/posts/${encodeURIComponent(post.id)}`}
                              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline truncate block"
                            >
                              {post.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              {post.category && (
                                <>
                                  <Link
                                    to={`/categories/${encodeURIComponent(post.category)}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                  >
                                    {post.category}
                                  </Link>
                                  <span>·</span>
                                </>
                              )}
                              <span>{post.images.length} img</span>
                              <span>·</span>
                              <span
                                className={
                                  post.published !== false
                                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                    : 'text-amber-600 dark:text-amber-400 font-medium'
                                }
                              >
                                {post.published !== false ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadPostIntoForm(post)}
                            title="Edit story & images"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={togglingId === post.id}
                            onClick={() => handleTogglePublish(post)}
                            title={
                              post.published !== false
                                ? 'Unpublish (move to Drafts)'
                                : 'Publish to live site'
                            }
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {post.published !== false ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === post.id}
                            onClick={() => handleDeletePost(post.id, post.title)}
                            title="Delete story from Firestore"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>
                              {deletingId === post.id ? '...' : 'Delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search Console & Sitemap Utility */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Google Search Console & SEO</span>
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>sitemap.xml</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>·</span>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-slate-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>robots.txt</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Static <code>/sitemap.xml</code> and <code>/robots.txt</code> are live at
                your domain root. You can also export an updated XML sitemap containing
                all {firestorePostsCount || allPostsForAdmin.length} published story URLs.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadSitemap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Dynamic sitemap.xml</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSitemapModal((v) => !v)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                >
                  {showSitemapModal ? 'Hide XML' : 'Preview XML'}
                </button>
              </div>
              {showSitemapModal && (
                <pre className="mt-3 p-3 rounded-lg bg-[#0a1124] text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-[#1e2f52]">
                  {generateDynamicSitemapXml()}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
