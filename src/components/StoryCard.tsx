import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, Trash2, Layers } from 'lucide-react';
import { StoryPost } from '../types';
import { useApp } from '../context/AppContext';
import {
  ensureHttpsUrl,
  formatRelativeTime,
} from '../utils/imageUtils';

interface StoryCardProps {
  post: StoryPost;
}

export function StoryCard({ post }: StoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isAdmin, deletePost } = useApp();
  const navigate = useNavigate();

  const relativeTime = formatRelativeTime(post.createdAt);
  const categoryLabel = post.category || 'වෙනත්';

  const handleQuickDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin || deleting) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
    } catch (err) {
      setDeleting(false);
      console.error(err);
    }
  };

  const handleQuickEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/admin?edit=${encodeURIComponent(post.id)}`);
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/categories/${encodeURIComponent(categoryLabel)}`);
  };

  const handleSeriesHubClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (post.collection) {
      navigate(`/collections/${encodeURIComponent(post.collection)}`);
    } else {
      navigate(`/categories/${encodeURIComponent(categoryLabel)}`);
    }
  };

  return (
    <article className="group flex flex-col bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors duration-150">
      <Link
        to={`/posts/${encodeURIComponent(post.id)}`}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        {/* Story Image on top of gallery card */}
        <div className="relative aspect-[4/3] w-full bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]">
          {!imgError && post.coverImage ? (
            <img
              src={ensureHttpsUrl(post.coverImage)}
              alt={`${post.title} — ${categoryLabel} | Sinhala Wal Katha`}
              width={800}
              height={600}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0a1124] text-slate-300">
              <span className="text-xs tracking-widest uppercase text-slate-400 mb-2">
                {categoryLabel}
              </span>
              <span className="font-editorial text-base font-medium text-slate-100 line-clamp-2">
                {post.title}
              </span>
            </div>
          )}
        </div>

        {/* Title, Bilingual Excerpt, Metadata Badges & Series Hub Internal Link Hook */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
              <span
                role="link"
                tabIndex={0}
                onClick={handleCategoryClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    handleCategoryClick(e as unknown as React.MouseEvent);
                }}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-[#162544] text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 hover:underline cursor-pointer"
              >
                {categoryLabel}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.createdAt.toISOString()} className="tabular-nums">
                {relativeTime}
              </time>
            </div>

            <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-2 text-balance">
              {post.title}
            </h2>
          </div>

          {post.excerpt && (
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Series Hub Internal Link Hook */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#1e2f52]/60">
            <span
              role="link"
              tabIndex={0}
              onClick={handleSeriesHubClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  handleSeriesHubClick(e as unknown as React.MouseEvent);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer line-clamp-1"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {post.collection || post.title} (සියලුම කොටස් කියවන්න)
              </span>
            </span>
          </div>
        </div>
      </Link>

      {/* Admin Quick Edit & Delete Bar directly on every Gallery Card */}
      {isAdmin && (
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-[#1e2f52] bg-slate-50 dark:bg-[#0d1730] flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Admin</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleQuickEdit}
              className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleQuickDelete}
              className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
