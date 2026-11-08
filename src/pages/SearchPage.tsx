import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { useSeo } from '../lib/seo';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('s') || '';
  const [queryText, setQueryText] = useState(initialQuery);
  const { posts } = useApp();

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('s') || '';
    setQueryText(q);
  }, [searchParams]);

  useSeo({
    title: queryText.trim()
      ? `Search: ${queryText.trim()} | Wal Kathawa`
      : 'Search Sinhala Wal Katha Stories | Wal Kathawa',
    description:
      'සිංහල වල් කතා සහ අලුත් වැල කතා සොයන්න. Search the Wal Kathawa Sinhala story archive by title, category, or collection.',
    canonical: '/search',
    noindex: true,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Search', href: '/search' },
    ],
  });

  const matchingPosts = useMemo(() => {
    const q = queryText.toLowerCase().trim();
    if (!q) return posts.slice(0, 18);
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.collection.toLowerCase().includes(q) ||
        post.slug.toLowerCase().includes(q)
    );
  }, [posts, queryText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryText.trim()) {
      setSearchParams({ q: queryText.trim() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-8">
      <header className="pb-6 border-b border-slate-200 dark:border-[#1e2f52] space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Search Sinhala Wal Katha — කතා සොයන්න
        </h1>

        <form onSubmit={handleSubmit} className="max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              name="q"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="කතාවේ නම හෝ වර්ගය ඇතුළත් කරන්න..."
              aria-label="Search stories"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity cursor-pointer"
          >
            Search
          </button>
        </form>
      </header>

      {matchingPosts.length === 0 ? (
        <div className="p-8 rounded-xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] text-center space-y-4">
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">
            &ldquo;{queryText}&rdquo; සඳහා කතා හමු නොවීය.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs font-semibold">
            <Link
              to="/posts"
              className="px-4 py-2 rounded-lg bg-[#162544] dark:bg-blue-600 text-white"
            >
              Browse All Stories
            </Link>
            <Link
              to="/categories"
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      ) : (
        <section aria-labelledby="search-results-heading">
          <h2 id="search-results-heading" className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
            {queryText.trim()
              ? `Found ${matchingPosts.length} matching stories`
              : 'Recent Stories'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingPosts.map((post) => (
              <StoryCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
