import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  MessageSquare,
  Send,
  Edit3,
  Share2,
  Copy,
  Check,
  BookOpen,
  Layers,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useApp } from '../context/AppContext';
import { SEOHead } from '../components/SEOHead';
import { StoryCard } from '../components/StoryCard';
import {
  AdBanner320x50,
  SmartLinkCta,
  SMARTLINK_URL,
} from '../components/AdPlacements';
import { StoryComment, VALIDATION_LIMITS } from '../types';
import {
  ensureHttpsUrl,
  generateSafeId,
  toSinglishTitle,
  formatRelativeTime,
} from '../utils/imageUtils';

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const {
    posts,
    categories,
    collections,
    allPostsForAdmin,
    isAdmin,
    loadingPosts,
    deletePost,
  } = useApp();

  const decodedId = postId ? decodeURIComponent(postId) : '';
  const sourceList = isAdmin ? allPostsForAdmin : posts;
  const postIndex = sourceList.findIndex(
    (p) => p.id === decodedId || p.slug === decodedId
  );
  const post = postIndex >= 0 ? sourceList[postIndex] : undefined;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [copiedType, setCopiedType] = useState<'url' | 'forum' | 'html' | null>(
    null
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setCopiedType(null);
  }, [decodedId]);

  useEffect(() => {
    if (!post) return;
    const commentsPath = `posts/${post.id}/comments`;
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: StoryComment[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date();
          return {
            id: docSnap.id,
            postId: String(data.postId || post.id),
            authorName: String(data.authorName || 'Reader'),
            content: String(data.content || ''),
            createdAt,
          };
        });
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, commentsPath);
      }
    );

    return () => unsubscribe();
  }, [post?.id]);

  // Compute Related Stories (same category or collection first, then recent stories)
  const relatedStories = useMemo(() => {
    if (!post) return [];
    const others = posts.filter((p) => p.id !== post.id);
    const sameCategoryOrCollection = others.filter(
      (p) =>
        (post.category &&
          p.category.toLowerCase() === post.category.toLowerCase()) ||
        (post.collection &&
          p.collection.toLowerCase() === post.collection.toLowerCase())
    );
    const remaining = others.filter(
      (p) => !sameCategoryOrCollection.some((m) => m.id === p.id)
    );
    return [...sameCategoryOrCollection, ...remaining].slice(0, 6);
  }, [post, posts]);

  // Compute wordCount BEFORE any early returns so hook order is always identical across renders
  const wordCount = useMemo(() => {
    if (!post?.content) return 0;
    const words = post.content.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [post?.content]);

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const newerPost = postIndex > 0 ? sourceList[postIndex - 1] : undefined;
  const olderPost =
    postIndex >= 0 && postIndex < sourceList.length - 1
      ? sourceList[postIndex + 1]
      : undefined;

  if (!post && loadingPosts) {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-pulse space-y-6">
        <div className="h-4 w-32 bg-slate-200 dark:bg-[#162544] rounded" />
        <div className="w-full aspect-[16/10] bg-slate-200 dark:bg-[#162544] rounded-2xl" />
        <div className="space-y-3">
          <div className="h-4 w-48 bg-slate-200 dark:bg-[#162544] rounded" />
          <div className="h-8 w-3/4 bg-slate-200 dark:bg-[#162544] rounded" />
          <div className="h-4 w-full bg-slate-200 dark:bg-[#162544] rounded" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-16 text-center">
        <SEOHead
          title="Story Not Found"
          description="The requested story could not be found."
          noindex
        />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Story Not Found
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This story may have been removed or its URL has changed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[#162544] dark:bg-blue-600 text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Stories</span>
        </Link>
      </div>
    );
  }

  const allImages =
    post.images && post.images.length > 0 ? post.images : [post.coverImage];
  const currentImage = ensureHttpsUrl(
    allImages[activeImageIndex] || post.coverImage
  );

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    {
      label: post.category || 'Stories',
      href: post.category
        ? `/categories/${encodeURIComponent(post.category)}`
        : '/categories',
    },
    { label: post.title },
  ];

  const canonicalStoryUrl = `https://walkathawa.com/posts/${encodeURIComponent(
    post.id
  )}`;

  // Exact Single Story Page SEO Title & Description Patterns
  const singlishTitle = toSinglishTitle(post.title);
  const seoTitle = `${post.title} - ${singlishTitle || 'Sinhala Wal Katha'} | Wal Kathawa`;

  const rawBodyPreview = post.content.replace(/\s+/g, ' ').trim();
  const excerptSlice = (post.excerpt || rawBodyPreview).slice(0, 110);
  const seoDescription = `Read ${post.title} on Wal Kathawa. ${excerptSlice}... (සියලුම කොටස් කියවන්න - Sinhala Wal Katha & Wela Katha 2026).`;

  const relativeTime = formatRelativeTime(post.createdAt);
  const categoryLabel = post.category || 'වෙනත්';

  const handleCopyShareSnippet = async (type: 'url' | 'forum' | 'html') => {
    let textToCopy = canonicalStoryUrl;
    if (type === 'forum') {
      textToCopy = `[url=${canonicalStoryUrl}]${post.title} — සිංහල කතා (walkathawa)[/url]`;
    } else if (type === 'html') {
      textToCopy = `<a href="${canonicalStoryUrl}" rel="dofollow">${post.title} — walkathawa සිංහල කතා</a>`;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentFeedback(null);

    const cleanName = authorName
      .trim()
      .slice(0, VALIDATION_LIMITS.COMMENT_AUTHOR_MAX);
    const cleanContent = commentText
      .trim()
      .slice(0, VALIDATION_LIMITS.COMMENT_CONTENT_MAX);

    if (!cleanName || !cleanContent) {
      setCommentFeedback('Please enter both your name and comment.');
      return;
    }

    setSubmittingComment(true);
    const commentId = generateSafeId('cmt');
    const commentPath = `posts/${post.id}/comments/${commentId}`;
    try {
      await setDoc(doc(db, 'posts', post.id, 'comments', commentId), {
        postId: post.id,
        authorName: cleanName,
        content: cleanContent,
        createdAt: serverTimestamp(),
      });
      setCommentText('');
      setCommentFeedback('Comment published.');
    } catch (error) {
      setCommentFeedback('Unable to post comment right now.');
      handleFirestoreError(error, OperationType.CREATE, commentPath);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return;
    const commentPath = `posts/${post.id}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, 'posts', post.id, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, commentPath);
    }
  };

  const handleDeletePost = async () => {
    if (!isAdmin) return;
    setDeletingPost(true);
    try {
      await deletePost(post.id);
      navigate('/');
    } catch (error) {
      setDeletingPost(false);
      console.error(error);
    }
  };

  const formattedDate = post.createdAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const paragraphs = post.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="max-w-4xl mx-auto">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath={`/posts/${encodeURIComponent(post.id)}`}
        ogImage={post.coverImage}
        ogType="article"
        publishedTime={post.createdAt.toISOString()}
        modifiedTime={post.updatedAt.toISOString()}
        articleSection={post.category}
        wordCount={wordCount}
        breadcrumbs={breadcrumbs}
        keywords={[
          post.title,
          post.category,
          post.collection,
          'අම්මා වල් කතා 2026',
          'සිංහල වල් කතා 2026',
        ]}
      />

      {/* Top Navigation & Admin Quick Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gallery</span>
        </Link>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#1e2f52] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
            >
              <span>+ Add New Post</span>
            </Link>
            <Link
              to={`/admin?edit=${encodeURIComponent(post.id)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#1e2f52] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Post</span>
            </Link>
            <button
              type="button"
              disabled={deletingPost}
              onClick={handleDeletePost}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingPost ? 'Deleting...' : 'Delete Post'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Image on Top (with LCP priority & multi-image switcher if story has multiple images) */}
      <div className="mb-8">
        <div className="w-full aspect-[16/10] bg-[#0a1124] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e2f52]">
          <img
            src={currentImage}
            alt={`${post.title} — ${post.category || 'සිංහල කතා'}`}
            width={1200}
            height={750}
            fetchPriority="high"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {allImages.length > 1 && (
          <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-1">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  idx === activeImageIndex
                    ? 'border-blue-500 opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img
                  src={ensureHttpsUrl(imgUrl)}
                  alt={`${post.title} පිටුව ${idx + 1}`}
                  width={160}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Story Header (Sole H1) & Metadata */}
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <Link
            to={`/categories/${encodeURIComponent(categoryLabel)}`}
            className="inline-flex items-center px-2.5 py-0.5 rounded-md font-semibold bg-blue-50 dark:bg-[#162544] text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 hover:underline underline-offset-4"
          >
            {categoryLabel}
          </Link>
          <span aria-hidden="true">·</span>
          {post.collection && (
            <>
              <Link
                to={`/collections/${encodeURIComponent(post.collection)}`}
                className="hover:text-blue-600 dark:hover:text-white underline-offset-4 hover:underline"
              >
                {post.collection}
              </Link>
              <span aria-hidden="true">·</span>
            </>
          )}
          <time dateTime={post.createdAt.toISOString()} className="tabular-nums" title={formattedDate}>
            {relativeTime}
          </time>
          {wordCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{readingMinutes} min read</span>
              </span>
            </>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white text-balance mb-4">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            {post.excerpt}
          </p>
        )}

        {/* Series Hub Internal Link Hook & Smartlink */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            to={
              post.collection
                ? `/collections/${encodeURIComponent(post.collection)}`
                : `/categories/${encodeURIComponent(categoryLabel)}`
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50/80 dark:bg-[#162544]/80 border border-blue-200/70 dark:border-blue-500/30 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-[#1e325c] transition-colors"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>
              {post.collection || post.title} (සියලුම කොටස් කියවන්න)
            </span>
          </Link>

          <a
            href={SMARTLINK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            <span>🔥 තවත් විශේෂ කතා (Read More Exclusive)</span>
          </a>
        </div>

        <div className="mt-4">
          <AdBanner320x50 showDoubleOnDesktop />
        </div>
      </header>

      {/* Story Narrative Body with H2 Support */}
      <section aria-labelledby="story-body-heading" className="mb-12">
        <h2
          id="story-body-heading"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4"
        >
          {post.title} — සම්පූර්ණ කතාව
        </h2>

        <div className="font-editorial text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-200 space-y-6 max-w-[70ch]">
          {paragraphs.map((para, index) => {
            if (para.startsWith('## ')) {
              return (
                <h2
                  key={index}
                  className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white pt-4"
                >
                  {para.replace(/^##\s+/, '')}
                </h2>
              );
            }
            if (para.startsWith('### ')) {
              return (
                <h3
                  key={index}
                  className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 pt-2"
                >
                  {para.replace(/^###\s+/, '')}
                </h3>
              );
            }
            return (
              <p key={index} className="whitespace-pre-line">
                {para}
              </p>
            );
          })}
        </div>

        {allImages.length > 1 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              කතාවේ සියලුම පිටු ({allImages.length} Pages)
            </h2>
            <div className="space-y-6">
              {allImages.map((imgUrl, idx) => (
                <figure
                  key={idx}
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2f52] bg-[#0a1124]"
                >
                  <img
                    src={ensureHttpsUrl(imgUrl)}
                    alt={`${post.title} — පිටුව ${idx + 1}`}
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain"
                  />
                  <figcaption className="px-4 py-2 text-xs text-slate-400 border-t border-[#1e2f52]">
                    {post.title} — පිටුව {idx + 1} / {allImages.length}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <SmartLinkCta />
          <AdBanner320x50 showDoubleOnDesktop />
        </div>
      </section>

      {/* Previous / Next Internal Story Navigation */}
      {(newerPost || olderPost) && (
        <nav
          aria-label="Adjacent Stories"
          className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-[#1e2f52]"
        >
          {newerPost ? (
            <Link
              to={`/posts/${encodeURIComponent(newerPost.id)}`}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] hover:border-blue-400 transition-colors flex flex-col gap-1"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>මීළඟ කතාව (Newer Story)</span>
              </span>
              <span className="text-sm font-semibold text-slate-950 dark:text-white line-clamp-1">
                {newerPost.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {olderPost && (
            <Link
              to={`/posts/${encodeURIComponent(olderPost.id)}`}
              className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] hover:border-blue-400 transition-colors flex flex-col items-end text-right gap-1"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                <span>පෙර කතාව (Previous Story)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm font-semibold text-slate-950 dark:text-white line-clamp-1">
                {olderPost.title}
              </span>
            </Link>
          )}
        </nav>
      )}

      {/* Social, Forum & Guest Post Backlink Share Bar */}
      <section
        aria-labelledby="share-story-heading"
        className="mb-12 p-5 rounded-xl bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2
            id="share-story-heading"
            className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2"
          >
            <Share2 className="w-4 h-4 text-blue-500" />
            <span>මෙම කතාව බෙදාගන්න (Share &amp; Forum Backlinks)</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Share on Telegram, WhatsApp, Facebook, X, Reddit, or copy forum/blog embed code
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              canonicalStoryUrl
            )}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#162544] dark:bg-blue-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Telegram
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `${post.title} — ${canonicalStoryUrl}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              canonicalStoryUrl
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
              canonicalStoryUrl
            )}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
          >
            X / Twitter
          </a>
          <a
            href={`https://www.reddit.com/submit?url=${encodeURIComponent(
              canonicalStoryUrl
            )}&title=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
          >
            Reddit
          </a>

          <button
            type="button"
            onClick={() => handleCopyShareSnippet('url')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          >
            {copiedType === 'url' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedType === 'url' ? 'Copied URL!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyShareSnippet('forum')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          >
            {copiedType === 'forum' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedType === 'forum' ? 'Copied BBCode!' : 'Forum BBCode'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyShareSnippet('html')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
          >
            {copiedType === 'html' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedType === 'html' ? 'Copied HTML!' : 'Blog HTML Backlink'}</span>
          </button>
        </div>
      </section>

      {/* Related Stories Internal Linking Section (H2) */}
      {relatedStories.length > 0 && (
        <section
          aria-labelledby="related-stories-heading"
          className="mb-12 pt-8 border-t border-slate-200 dark:border-[#1e2f52]"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2
                id="related-stories-heading"
                className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
              >
                තවත් සිංහල කතා — Related Stories
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {post.category
                  ? `${post.category} සහ සම්බන්ධිත ජනප්‍රිය සිංහල කතා එකතුව`
                  : 'ඔබ කියවීමට කැමති විය හැකි තවත් ජනප්‍රිය සිංහල කතා'}
              </p>
            </div>
            <Link
              to="/categories"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              සියලුම වර්ගීකරණ →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedStories.map((related) => (
              <StoryCard key={related.id} post={related} />
            ))}
          </div>

          {/* Internal Category & Collection Topic Links */}
          {(categories.length > 0 || collections.length > 0) && (
            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-[#1e2f52]/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                තවත් මාතෘකා:
              </span>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/categories/${encodeURIComponent(cat)}`}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400"
                >
                  {cat}
                </Link>
              ))}
              {collections.map((col) => (
                <Link
                  key={col}
                  to={`/collections/${encodeURIComponent(col)}`}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400"
                >
                  {col}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Comment Section Underneath Story (H2) */}
      <div className="mb-6">
        <AdBanner320x50 showDoubleOnDesktop showSmartlink />
      </div>
      <section
        aria-labelledby="comments-heading"
        className="pt-10 border-t border-slate-200 dark:border-[#1e2f52]"
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="comments-heading"
            className="text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Comments ({comments.length})</span>
          </h2>
        </div>

        {/* Add Comment Form */}
        <form
          onSubmit={handleCommentSubmit}
          className="p-6 rounded-xl bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] mb-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="comment-author"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Your Name
              </label>
              <input
                id="comment-author"
                type="text"
                required
                maxLength={VALIDATION_LIMITS.COMMENT_AUTHOR_MAX}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="comment-content"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Comment
            </label>
            <textarea
              id="comment-content"
              required
              rows={3}
              maxLength={VALIDATION_LIMITS.COMMENT_CONTENT_MAX}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts on this story..."
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {commentFeedback || 'Comments are saved directly to Firestore.'}
            </span>
            <button
              type="submit"
              disabled={submittingComment}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
            No comments yet. Be the first to share a response below this story.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-[#1e2f52]">
            {comments.map((comment) => (
              <div key={comment.id} className="py-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {comment.authorName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={comment.createdAt.toISOString()} className="tabular-nums">
                      {comment.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {comment.content}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    aria-label="Delete comment"
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
