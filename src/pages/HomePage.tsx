import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { SEOHead } from '../components/SEOHead';
import { AdBanner320x50, SmartLinkCta } from '../components/AdPlacements';
import { BreadcrumbItem, POSTS_PER_PAGE } from '../types';

export function HomePage() {
  const { categoryName, collectionName } = useParams<{
    categoryName?: string;
    collectionName?: string;
  }>();
  const location = useLocation();
  const {
    posts,
    categories,
    collections,
    loadingPosts,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [currentPage, setCurrentPage] = useState<number>(1);

  const decodedCategory = categoryName ? decodeURIComponent(categoryName) : undefined;
  const decodedCollection = collectionName
    ? decodeURIComponent(collectionName)
    : undefined;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sParam = params.get('s');
    if (sParam !== null && sParam !== searchQuery) {
      setSearchQuery(sParam);
    }
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [decodedCategory, decodedCollection, searchQuery, location.pathname]);

  // Posts are sorted newest-first in AppContext
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (
        decodedCategory &&
        post.category.toLowerCase() !== decodedCategory.toLowerCase()
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
  }, [posts, decodedCategory, decodedCollection, searchQuery]);

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
    return [{ label: 'Home' }];
  }, [decodedCategory, decodedCollection]);

  // Exact Programmatic SEO Title & Description Patterns
  const pageTitle = decodedCategory
    ? `${decodedCategory} Wal Katha — සිංහල වල් කතා 2026 | Wal Kathawa`
    : decodedCollection
    ? `${decodedCollection} — සියලුම කොටස් කියවන්න | Sinhala Wal Katha - Wal Kathawa`
    : 'Wal Kathawa - Sinhala Wal Katha, Wela Katha & Wala Katha 2026 | සිංහල වල් කතා';

  const pageDescription = decodedCategory
    ? `Explore the latest ${decodedCategory} Sinhala Wal Katha and Wela Katha stories on walkathawa.com. දිනපතා අලුත් වන සිංහල වල් කතා එකතුව.`
    : decodedCollection
    ? `Read all episodes of ${decodedCollection} (සියලුම කොටස් කියවන්න) on Wal Kathawa. Complete Sinhala Wal Katha & Wela Katha series archive.`
    : 'Wal Kathawa (walkathawa.com) - 2026 අලුත්ම සිංහල වල් කතා, සිංහල වැල කතා, අම්මා වල් කතා, පවුලේ කතා, Read the latest Sinhala Wal Katha, Wela Katha, Wala Katha, Welakathaa, and Aluth Sinhala Sex Stories daily.';

  const pageKeywords = useMemo(
    () => [decodedCategory || '', decodedCollection || ''].filter(Boolean),
    [decodedCategory, decodedCollection]
  );

  const semanticH1Text = decodedCategory
    ? `${decodedCategory} Wal Katha — සිංහල වල් කතා 2026`
    : decodedCollection
    ? `${decodedCollection} — සියලුම කොටස් කියවන්න | Sinhala Wal Katha`
    : 'Wal Kathawa - Sinhala Wal Katha & Wela Katha (සිංහල වල් කතා)';

  return (
    <div>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalPath={location.pathname}
        breadcrumbs={breadcrumbs}
        keywords={pageKeywords}
      />

      {/* Semantic H1 & Internal Category Quick-Links */}
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <h1 className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 mb-3">
          {semanticH1Text}
        </h1>
        {/* Internal Links Bar to Categories & Collections for Crawler Discovery */}
        {(categories.length > 0 || collections.length > 0) && (
          <nav
            aria-label="Story Categories and Collections"
            className="flex flex-wrap items-center gap-2 text-xs"
          >
            <Link
              to="/"
              onClick={() => setSearchQuery('')}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                !decodedCategory && !decodedCollection
                  ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                  : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              සියලුම කතා ({posts.length})
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/categories/${encodeURIComponent(cat)}`}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  decodedCategory?.toLowerCase() === cat.toLowerCase()
                    ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                    : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                {cat}
              </Link>
            ))}
            {collections.map((col) => (
              <Link
                key={col}
                to={`/collections/${encodeURIComponent(col)}`}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  decodedCollection?.toLowerCase() === col.toLowerCase()
                    ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                    : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                }`}
              >
                {col}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Show active search or category/collection filter banner only when filtering */}
      {(decodedCategory || decodedCollection || searchQuery.trim()) && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {decodedCategory && (
              <span>
                Category: <strong className="text-slate-950 dark:text-white">{decodedCategory}</strong>
              </span>
            )}
            {decodedCollection && (
              <span>
                Collection: <strong className="text-slate-950 dark:text-white">{decodedCollection}</strong>
              </span>
            )}
            {searchQuery.trim() && (
              <span>
                Search: <strong className="text-slate-950 dark:text-white">&ldquo;{searchQuery}&rdquo;</strong>
              </span>
            )}
          </div>
          <Link
            to="/"
            onClick={() => setSearchQuery('')}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Filter
          </Link>
        </div>
      )}

      {/* 3 Columns x 10 Rows Story Grid */}
      {loadingPosts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200 dark:bg-[#162544]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-[#162544] rounded" />
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-[#162544] rounded" />
                <div className="h-3 w-full bg-slate-200 dark:bg-[#162544] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : paginatedPosts.length === 0 ? (
        <div className="py-16 text-center border border-slate-200 dark:border-[#1e2f52] rounded-xl bg-white dark:bg-[#111d38]">
          <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-2">
            No stories match your current filter.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Open the sidebar to search for another topic or return to all stories.
          </p>
          <Link
            to="/"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity"
          >
            Show All Stories
          </Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="latest-stories-heading">
            <h2 id="latest-stories-heading" className="sr-only">
              අලුත්ම සිංහල කතා ලැයිස්තුව (Latest Sinhala Stories)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post, idx) => (
                <div key={post.id} className="contents">
                  <StoryCard post={post} />
                  {(idx + 1) % 6 === 0 && idx < paginatedPosts.length - 1 && (
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-1">
                      <AdBanner320x50 showDoubleOnDesktop showSmartlink />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8">
            <SmartLinkCta />
            <AdBanner320x50 showDoubleOnDesktop />
          </div>

          {/* Pagination Bar (3 columns x 10 rows = 30 per page) */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#1e2f52] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="tabular-nums">
              Showing{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {(safePage - 1) * POSTS_PER_PAGE + 1}
              </span>
              –
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {Math.min(safePage * POSTS_PER_PAGE, filteredPosts.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {filteredPosts.length}
              </span>{' '}
              stories (Page {safePage} of {totalPages})
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                          ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                          : 'border border-slate-200 dark:border-[#1e2f52] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544]'
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
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer disabled:cursor-not-allowed"
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
