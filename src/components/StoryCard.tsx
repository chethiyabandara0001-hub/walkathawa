import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StoryPost } from '../types';

interface StoryCardProps {
  post: StoryPost;
}

export function StoryCard({ post }: StoryCardProps) {
  const [imgError, setImgError] = useState(false);

  const formattedDate = post.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="group flex flex-col bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/90 rounded-xl overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-150">
      <Link
        to={`/posts/${encodeURIComponent(post.id)}`}
        className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
      >
        {/* Story Image on top of gallery card */}
        <div className="relative aspect-[4/3] w-full bg-zinc-900 overflow-hidden border-b border-zinc-200 dark:border-zinc-800/80">
          {!imgError && post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-zinc-300">
              <span className="text-xs tracking-widest uppercase text-zinc-500 mb-2">
                {post.category}
              </span>
              <span className="font-editorial text-base font-medium text-zinc-200 line-clamp-2">
                {post.title}
              </span>
            </div>
          )}
        </div>

        {/* Title and unboxed metadata underneath */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            {/* Zero-Pill Metadata Discipline: quiet unboxed text with · separators */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <span>{post.category}</span>
              <span aria-hidden="true">·</span>
              <span>{post.collection}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.createdAt.toISOString()} className="tabular-nums">
                {formattedDate}
              </time>
            </div>

            <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-100 group-hover:underline decoration-1 underline-offset-4 line-clamp-2 text-balance">
              {post.title}
            </h2>
          </div>

          {post.excerpt && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
