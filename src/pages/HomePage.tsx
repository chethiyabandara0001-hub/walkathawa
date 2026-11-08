import { useState, useMemo, useEffect } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { AdBanner320x50, SmartLinkCta } from '../components/AdPlacements';
import { NotFoundPage } from './NotFoundPage';
import { BreadcrumbItem, POSTS_PER_PAGE } from '../types';
import {
  useSeo,
  buildCollectionPageJsonLd,
  truncateSinhalaDescription,
} from '../lib/seo';
import { getTaxonomySlug } from '../lib/slugs';

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
    resolveCategoryFromParam,
    resolveCollectionFromParam,
  } = useApp();

  const [currentPage, setCurrentPage] = useState<number>(1);

  const isAllPostsRoute = location.pathname === '/posts' || location.pathname === '/posts/';

  const categoryRes = useMemo(
    () => resolveCategoryFromParam(categoryName),
    [categoryName, categories]
  );
  const collectionRes = useMemo(
    () => resolveCollectionFromParam(collectionName),
    [collectionName, collections]
  );

  const activeCategory = categoryRes.matched;
  const activeCollection = collectionRes.matched;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sParam = params.get('s') || params.get('q');
    if (sParam !== null && sParam !== searchQuery) {
      setSearchQuery(sParam);
    }
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeCollection, searchQuery, location.pathname]);

  // Posts are sorted newest-first in AppContext
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (
        activeCategory &&
        post.category.toLowerCase() !== activeCategory.toLowerCase()
      ) {
        return false;
      }
      if (
        activeCollection &&
        post.collection.toLowerCase() !== activeCollection.toLowerCase()
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
  }, [posts, activeCategory, activeCollection, searchQuery]);

  // 3 columns x 10 rows per page = 30 posts per page
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPosts = useMemo(() => {
    const start = (safePage - 1) * POSTS_PER_PAGE;
    return filteredPosts.slice(start, start + POSTS_PER_PAGE);
  }, [filteredPosts, safePage]);

  const canonicalPath = useMemo(() => {
    if (categoryName && categoryRes.canonicalSlug) {
      return `/categories/${categoryRes.canonicalSlug}`;
    }
    if (collectionName && collectionRes.canonicalSlug) {
      return `/collections/${collectionRes.canonicalSlug}`;
    }
    if (isAllPostsRoute) {
      return '/posts';
    }
    return '/';
  }, [
    categoryName,
    categoryRes.canonicalSlug,
    collectionName,
    collectionRes.canonicalSlug,
    isAllPostsRoute,
  ]);

  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    if (activeCategory && categoryRes.canonicalSlug) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Categories', href: '/categories' },
        {
          label: activeCategory,
          href: `/categories/${categoryRes.canonicalSlug}`,
        },
      ];
    }
    if (activeCollection && collectionRes.canonicalSlug) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Collections', href: '/collections' },
        {
          label: activeCollection,
          href: `/collections/${collectionRes.canonicalSlug}`,
        },
      ];
    }
    if (isAllPostsRoute) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Stories', href: '/posts' },
      ];
    }
    return [{ label: 'Home', href: '/' }];
  }, [
    activeCategory,
    categoryRes.canonicalSlug,
    activeCollection,
    collectionRes.canonicalSlug,
    isAllPostsRoute,
  ]);

  const pageTitle = activeCategory
    ? `${activeCategory} Wal Katha | Wal Kathawa`
    : activeCollection
    ? `${activeCollection} Wal Katha | Wal Kathawa`
    : isAllPostsRoute
    ? 'All Sinhala Wal Katha Stories | Wal Kathawa'
    : 'Sinhala Wal Katha – Aluth Wela Katha Daily | Wal Kathawa';

  const rawDescription = activeCategory
    ? `${activeCategory} සිංහල වල් කතා සහ අලුත්ම වැල කතා එකතුව. Read the latest ${activeCategory} Sinhala Wal Katha and Wela Katha stories on Wal Kathawa.`
    : activeCollection
    ? `${activeCollection} සියලුම කොටස් කියවන්න. Read all episodes of ${activeCollection} Sinhala Wal Katha series on Wal Kathawa.`
    : isAllPostsRoute
    ? 'සියලුම සිංහල වල් කතා සහ අලුත් වැල කතා එකතුව. Browse the complete archive of Sinhala Wal Katha, Wela Katha, and serialized stories on Wal Kathawa.'
    : 'දිනපතා අලුත් වන සිංහල වල් කතා, වැල කතා සහ කතා මාලා කියවන්න. Read the latest Sinhala Wal Katha & Wela Katha daily on Wal Kathawa.';

  const pageDescription = truncateSinhalaDescription(rawDescription, 155);

  const semanticH1Text = activeCategory
    ? `${activeCategory} Wal Katha — සිංහල වල් කතා`
    : activeCollection
    ? `${activeCollection} Wal Katha — සියලුම කොටස්`
    : isAllPostsRoute
    ? 'All Sinhala Wal Katha Stories — සියලුම සිංහල වල් කතා'
    : 'Sinhala Wal Katha — සිංහල වල් කතා සහ අලුත් වැල කතා';

  const isUnknownTaxonomy =
    !loadingPosts &&
    ((Boolean(categoryName) && !activeCategory) ||
      (Boolean(collectionName) && !activeCollection));

  const collectionJsonLd = useMemo(() => {
    if (isUnknownTaxonomy) return [];
    return [
      buildCollectionPageJsonLd({
        name: semanticH1Text,
        description: pageDescription,
        canonicalUrl: canonicalPath,
        posts: paginatedPosts.map((p) => ({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          createdAt: p.createdAt,
        })),
      }),
    ];
  }, [isUnknownTaxonomy, semanticH1Text, pageDescription, canonicalPath, paginatedPosts]);

  useSeo({
    title: isUnknownTaxonomy ? 'Page Not Found (404) | Wal Kathawa' : pageTitle,
    description: pageDescription,
    canonical: canonicalPath,
    type: 'website',
    noindex: isUnknownTaxonomy,
    breadcrumbs,
    jsonLdEntities: collectionJsonLd,
  });

  // 301-style client redirect when visiting legacy encoded Sinhala category/collection URLs
  if (categoryName && categoryRes.needsRedirect && categoryRes.canonicalSlug) {
    return <Navigate to={`/categories/${categoryRes.canonicalSlug}`} replace />;
  }
  if (collectionName && collectionRes.needsRedirect && collectionRes.canonicalSlug) {
    return <Navigate to={`/collections/${collectionRes.canonicalSlug}`} replace />;
  }

  // Render real 404 page if category or collection slug does not exist
  if (isUnknownTaxonomy) {
    return <NotFoundPage />;
  }

  return (
    <div>
      {/* Semantic Visible H1 & Internal Category Quick-Links */}
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-4">
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
                !activeCategory && !activeCollection && !isAllPostsRoute
                  ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                  : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              මුල් පිටුව ({posts.length})
            </Link>
            <Link
              to="/posts"
              onClick={() => setSearchQuery('')}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                isAllPostsRoute
                  ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                  : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              සියලුම කතා (All Stories)
            </Link>
            {categories.map((cat) => {
              const catSlug = getTaxonomySlug(cat);
              return (
                <Link
                  key={cat}
                  to={`/categories/${catSlug}`}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    activeCategory?.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                      : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
            {collections.map((col) => {
              const colSlug = getTaxonomySlug(col);
              return (
                <Link
                  key={col}
                  to={`/collections/${colSlug}`}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    activeCollection?.toLowerCase() === col.toLowerCase()
                      ? 'bg-[#162544] text-white border-[#162544] dark:bg-blue-600 dark:border-blue-600'
                      : 'border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  }`}
                >
                  {col}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Show active search or category/collection filter banner only when filtering */}
      {(activeCategory || activeCollection || searchQuery.trim()) && (
        <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white dark:bg-[#111d38] border border-slate-200 dark:border-[#1e2f52] text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {activeCategory && (
              <span>
                Category:{' '}
                <strong className="text-slate-950 dark:text-white">
                  {activeCategory}
                </strong>
              </span>
            )}
            {activeCollection && (
              <span>
                Collection:{' '}
                <strong className="text-slate-950 dark:text-white">
                  {activeCollection}
                </strong>
              </span>
            )}
            {searchQuery.trim() && (
              <span>
                Search:{' '}
                <strong className="text-slate-950 dark:text-white">
                  &ldquo;{searchQuery}&rdquo;
                </strong>
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
      {loadingPosts && posts.length === 0 ? (
        <div className="py-12 text-center border border-slate-200 dark:border-[#1e2f52] rounded-xl bg-white dark:bg-[#111d38]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading Sinhala stories...
          </p>
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
            to="/posts"
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

          <noscript>
            <div className="mt-6 p-4 border border-slate-700 rounded-lg">
              <h2>Sinhala Wal Katha Story Index</h2>
              <ul>
                {paginatedPosts.map((p) => (
                  <li key={p.id}>
                    <a href={`/posts/${p.slug}`}>{p.title}</a> — {p.excerpt}
                  </li>
                ))}
              </ul>
            </div>
          </noscript>

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
