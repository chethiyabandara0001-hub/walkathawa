import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SEOHead } from '../components/SEOHead';
import { BreadcrumbItem, POSTS_PER_PAGE } from '../types';

export function HomePage() {
  const { categoryName, collectionName } = useParams<{
    categoryName?: string;
    collectionName?: string;
  }>();
  const location = useLocation();
  const { posts, categories, loadingPosts } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const decodedCategory = categoryName ? decodeURIComponent(categoryName) : undefined;
  const decodedCollection = collectionName
    ? decodeURIComponent(collectionName)
    : undefined;

  useEffect(() => {
    setCurrentPage(1);
    if (decodedCategory) {
      setSelectedCategory(decodedCategory);
    } else {
      setSelectedCategory('all');
    }
  }, [decodedCategory, decodedCollection, location.pathname]);

  // Posts are already sorted newest-first in AppContext
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (decodedCategory && post.category.toLowerCase() !== decodedCategory.toLowerCase()) {
        return false;
      }
      if (
        !decodedCategory &&
        selectedCategory !== 'all' &&
        post.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (
        decodedCollection &&
        post.collection.toLowerCase() !== decodedCollection.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          post.title.toLowerCase().includes(q) ||
          post.excerpt.toLowerCase().includes(q) ||
          post.category.toLowerCase().includes(q) ||
          post.collection.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, decodedCategory, decodedCollection, selectedCategory, searchQuery]);

  // 3 columns x 10 rows per page = 30 posts per page
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => {
    const start = (safePage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, safePage]);

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    if (decodedCategory) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Categories', href: '/categories' },
        { label: decodedCategory },
      ];
    }
    if (decodedCollection) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Collections', href: '/collections' },
        { label: decodedCollection },
      ];
    }
    if (location.pathname === '/posts') {
      return [{ label: 'Home', href: '/' }, { label: 'All Stories' }];
    }
    return [{ label: 'Home' }];
  }, [decodedCategory, decodedCollection, location.pathname]);

  const pageTitle = decodedCategory
    ? `${decodedCategory} Stories`
    : decodedCollection
    ? `${decodedCollection} Collection`
    : 'walkathawa — Stories, Collections & Categories';

  const pageDescription = decodedCategory
    ? `Browse all stories published under the ${decodedCategory} category on walkathawa.`
    : decodedCollection
    ? `Explore curated stories in the ${decodedCollection} collection on walkathawa.`
    : 'Explore curated stories, collections, and categories on walkathawa in a clean dark and white gallery.';

  return (
    <div>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath={location.pathname}
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} />

      {/* Editorial Header */}
      <section className="pb-8 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              {decodedCategory
                ? `Category Archive · ${filteredPosts.length} Stories`
                : decodedCollection
                ? `Curated Collection · ${filteredPosts.length} Stories`
                : `Latest Stories · 3×10 Gallery (${POSTS_PER_PAGE} per page)`}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance">
              {decodedCategory
                ? decodedCategory
                : decodedCollection
                ? decodedCollection
                : 'Latest Published Stories'}
            </h1>
          </div>

          {/* Search Input */}
          <div className="w-full md:w-72">
            <label htmlFor="story-search" className="sr-only">
              Search stories
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="story-search"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search stories..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Interactive Category Filter Bar (when on main gallery) */}
        {!decodedCategory && !decodedCollection && categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-6 pb-1">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              All Stories ({posts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3 Columns x 10 Rows Story Grid */}
      {loadingPosts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/40 animate-pulse"
            >
              <div className="aspect-[4/3] bg-zinc-200 dark:bg-zinc-800" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : paginatedPosts.length === 0 ? (
        <div className="py-16 text-center border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No stories match your current filter.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            Try clearing your search query or viewing the complete story archive.
          </p>
          <Link
            to="/"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPosts.map((post) => (
              <StoryCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination Bar (3 columns x 10 rows = 30 per page) */}
          <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="tabular-nums">
              Showing{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {(safePage - 1) * POSTS_PER_PAGE + 1}
              </span>
              –
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {Math.min(safePage * POSTS_PER_PAGE, filteredPosts.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {filteredPosts.length}
              </span>{' '}
              stories (Page {safePage} of {totalPages} · Max 30 per page)
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-8 h-8 rounded-lg font-medium tabular-nums transition-colors cursor-pointer ${
                        pageNum === safePage
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                          : 'border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
