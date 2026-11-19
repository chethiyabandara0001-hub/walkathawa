import { useMemo, useEffect } from 'react';
import { Link, Navigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StoryCard } from '../components/StoryCard';
import { NotFoundPage } from './NotFoundPage';
import { BreadcrumbItem, POSTS_PER_PAGE } from '../types';
import {
  useSeo,
  buildCollectionPageJsonLd,
  truncateSinhalaDescription,
} from '../lib/seo';

export function HomePage() {
  const { categoryName, collectionName } = useParams<{
    categoryName?: string;
    collectionName?: string;
  }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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

  const isAllPostsRoute =
    location.pathname === '/posts' || location.pathname === '/posts/';

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
    const sParam = searchParams.get('s') || searchParams.get('q');
    if (sParam !== null && sParam !== searchQuery) {
      setSearchQuery(sParam);
    }
  }, [searchParams]);

  const parsedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

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
          post.collection.toLowerCase().includes(q) ||
          post.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posts, activeCategory, activeCollection, searchQuery]);

  // 3 columns x 10 rows per page = 30 posts per page
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(requestedPage, totalPages);
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

  const buildPageHref = (pageNum: number) => {
    if (pageNum <= 1) return canonicalPath;
    return `${canonicalPath}?page=${pageNum}`;
  };

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
    ? `${activeCategory} සිංහල වල් කතා සහ වැල කතා එකතුව (${filteredPosts.length} stories). Read ${activeCategory} Sinhala Wal Katha on Wal Kathawa.`
    : activeCollection
    ? `${activeCollection} සියලුම කොටස් (${filteredPosts.length} episodes). Read all parts of ${activeCollection} Sinhala Wal Katha series on Wal Kathawa.`
    : isAllPostsRoute
    ? 'සියලුම සිංහල වල් කතා සහ අලුත් වැල කතා එකතුව. Browse the complete archive of Sinhala Wal Katha and serialized stories on Wal Kathawa.'
    : 'දිනපතා අලුත් වන සිංහල වල් කතා, වැල කතා සහ කතා මාලා කියවන්න. Read the latest Sinhala Wal Katha & Wela Katha daily on Wal Kathawa.';

  const pageDescription = truncateSinhalaDescription(rawDescription, 155);

  const semanticH1Text = activeCategory
    ? `${activeCategory} Wal Katha — සිංහල වල් කතා`
    : activeCollection
    ? `${activeCollection} Wal Katha — සියලුම කොටස්`
    : isAllPostsRoute
    ? 'All Sinhala Wal Katha Stories — සියලුම සිංහල කතා'
    : 'Sinhala Wal Katha — අලුත්ම සිංහල වල් කතා';

  const isUnknownTaxonomy =
    !loadingPosts &&
    ((Boolean(categoryName) && !activeCategory) ||
      (Boolean(collectionName) && !activeCollection));

  const isFilteredOrPaginatedQuery =
    safePage > 1 || Boolean(searchParams.get('s') || searchParams.get('q'));

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
    noindex: isUnknownTaxonomy || isFilteredOrPaginatedQuery,
    breadcrumbs,
    jsonLdEntities: collectionJsonLd,
  });

  // 301-style client redirect when visiting legacy encoded Sinhala or variant category/collection URLs
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
      {/* Clean semantic page header with sole H1 matching existing navy/slate typography */}
      <header className="mb-6 pb-4 border-b border-slate-200 dark:border-[#1e2f52] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          {(activeCategory || activeCollection || isAllPostsRoute) && (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1.5">
                    {crumb.href && !isLast ? (
                      <Link
                        to={crumb.href}
                        className="hover:text-blue-600 dark:hover:text-white transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        {crumb.label}
                      </span>
                    )}
                    {!isLast && <span aria-hidden="true">/</span>}
                  </span>
                );
              })}
            </nav>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {semanticH1Text}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCategory
              ? `${activeCategory} වර්ගයේ සිංහල කතා ${filteredPosts.length} ක් කියවන්න.`
              : activeCollection
              ? `${activeCollection} කතා මාලාවේ කොටස් ${filteredPosts.length} ක් කියවන්න.`
              : isAllPostsRoute
              ? `සම්පූර්ණ සිංහල කතා එකතුව — ${filteredPosts.length} published stories.`
              : `දිනපතා අලුත් වන සිංහල වල් කතා සහ කතා මාලා (${filteredPosts.length} stories).`}
          </p>
        </div>

        {(activeCategory || activeCollection || searchQuery.trim()) && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            {searchQuery.trim() && (
              <span className="text-slate-500 dark:text-slate-400">
                Search:{' '}
                <strong className="text-slate-950 dark:text-white">
                  &ldquo;{searchQuery}&rdquo;
                </strong>
              </span>
            )}
            <Link
              to="/"
              onClick={() => setSearchQuery('')}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Filter
            </Link>
          </div>
        )}
      </header>

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
                <StoryCard
                  key={post.id}
                  post={post}
                  priority={safePage === 1 && idx < 3}
                  isLcpCandidate={safePage === 1 && idx === 0}
                />
              ))}
            </div>
          </section>

          {/* Crawlable Pagination Bar (3 columns x 10 rows = 30 per page) */}
          <nav
            aria-label="Story Archive Pagination"
            className="mt-12 pt-6 border-t border-slate-200 dark:border-[#1e2f52] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400"
          >
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
                {safePage > 1 ? (
                  <Link
                    to={buildPageHref(safePage - 1)}
                    rel="prev"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 opacity-40 cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </span>
                )}

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <Link
                      key={pageNum}
                      to={buildPageHref(pageNum)}
                      aria-current={pageNum === safePage ? 'page' : undefined}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg font-medium tabular-nums transition-colors ${
                        pageNum === safePage
                          ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                          : 'border border-slate-200 dark:border-[#1e2f52] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162544]'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {safePage < totalPages ? (
                  <Link
                    to={buildPageHref(safePage + 1)}
                    rel="next"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 opacity-40 cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
