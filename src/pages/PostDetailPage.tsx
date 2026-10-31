import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, Trash2, MessageSquare, Send, Edit3 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SEOHead } from '../components/SEOHead';
import { StoryComment, VALIDATION_LIMITS } from '../types';
import { generateSafeId } from '../utils/imageUtils';

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { posts, isAdmin, deletePost, seedInitialStoriesToFirestore, firestorePostsCount } =
    useApp();

  const decodedId = postId ? decodeURIComponent(postId) : '';
  const post = posts.find(
    (p) => p.id === decodedId || p.slug === decodedId
  );

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
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

  if (!post) {
    return (
      <div className="py-16 text-center">
        <SEOHead
          title="Story Not Found"
          description="The requested story could not be found."
          noindex
        />
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Story Not Found' },
          ]}
        />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          Story Not Found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          This story may have been removed or its URL has changed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Stories</span>
        </Link>
      </div>
    );
  }

  const allImages =
    post.images && post.images.length > 0 ? post.images : [post.coverImage];
  const currentImage = allImages[activeImageIndex] || post.coverImage;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    {
      label: post.category,
      href: `/categories/${encodeURIComponent(post.category)}`,
    },
    { label: post.title },
  ];

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
    try {
      // If this post is still an unseeded local fallback story and an admin is signed in, seed it first
      if (post.isSeed && firestorePostsCount === 0 && isAdmin) {
        await seedInitialStoriesToFirestore();
      }

      const commentId = generateSafeId('cmt');
      const commentPath = `posts/${post.id}/comments/${commentId}`;
      await setDoc(doc(db, 'posts', post.id, 'comments', commentId), {
        postId: post.id,
        authorName: cleanName,
        content: cleanContent,
        createdAt: serverTimestamp(),
      });
      setCommentText('');
      setCommentFeedback('Comment published.');
    } catch (error) {
      if (post.isSeed && firestorePostsCount === 0) {
        setCommentFeedback(
          'This is a preview starter story. Sign in at /admin to publish stories to Firestore so comments can be stored.'
        );
      } else {
        setCommentFeedback('Unable to post comment right now.');
        console.error(error);
      }
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
        title={post.title}
        description={post.excerpt || post.content.slice(0, 155)}
        canonicalPath={`/posts/${encodeURIComponent(post.id)}`}
        ogImage={post.coverImage}
        ogType="article"
        publishedTime={post.createdAt.toISOString()}
        modifiedTime={post.updatedAt.toISOString()}
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} />

      {/* Top Navigation & Admin Quick Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Gallery</span>
        </Link>

        {isAdmin && !post.isSeed && (
          <div className="flex items-center gap-2">
            <Link
              to={`/admin?edit=${encodeURIComponent(post.id)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit in Admin</span>
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

      {/* 1. Image on Top (with multi-image switcher if story has multiple images) */}
      <div className="mb-8">
        <div className="w-full aspect-[16/10] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <img
            src={currentImage}
            alt={post.title}
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
                    ? 'border-zinc-950 dark:border-white opacity-100'
                    : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`${post.title} view ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Story Header & Rest of the Story Underneath */}
      <header className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          <Link
            to={`/categories/${encodeURIComponent(post.category)}`}
            className="hover:text-zinc-950 dark:hover:text-white underline-offset-4 hover:underline"
          >
            {post.category}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to={`/collections/${encodeURIComponent(post.collection)}`}
            className="hover:text-zinc-950 dark:hover:text-white underline-offset-4 hover:underline"
          >
            {post.collection}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.createdAt.toISOString()} className="tabular-nums">
            Published {formattedDate}
          </time>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance mb-4">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {post.excerpt}
          </p>
        )}
      </header>

      {/* Story Narrative Body */}
      <div className="font-editorial text-base sm:text-lg leading-relaxed text-zinc-800 dark:text-zinc-200 space-y-6 mb-14 max-w-[70ch]">
        {paragraphs.map((para, index) => (
          <p key={index} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>

      {/* 3. Comment Section Underneath Story */}
      <section
        aria-labelledby="comments-heading"
        className="pt-10 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            id="comments-heading"
            className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Comments ({comments.length})</span>
          </h2>
        </div>

        {/* Add Comment Form */}
        <form
          onSubmit={handleCommentSubmit}
          className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 mb-8 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="comment-author"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
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
                className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="comment-content"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
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
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {commentFeedback || 'Comments are saved directly to Firestore.'}
            </span>
            <button
              type="submit"
              disabled={submittingComment}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6">
            No comments yet. Be the first to share a response below this story.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {comments.map((comment) => (
              <div key={comment.id} className="py-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
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
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {comment.content}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    aria-label="Delete comment"
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
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
