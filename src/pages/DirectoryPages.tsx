import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  useSeo,
  buildCollectionPageJsonLd,
  truncateSinhalaDescription,
} from '../lib/seo';
import { getTaxonomySlug } from '../lib/slugs';
import { ensureHttpsUrl, formatRelativeTime } from '../utils/imageUtils';

export function CollectionsPage() {
  const { posts, collections, categories } = useApp();

  const description = truncateSinhalaDescription(
    `සියලුම සිංහල වල් කතා එකතු (${collections.length} Collections). Browse multi-part Sinhala Wal Katha & Wela Katha series on Wal Kathawa.`,
    155
  );

  const jsonLd = useMemo(
    () => [
      buildCollectionPageJsonLd({
        name: 'Sinhala Wal Katha Collections — කතා එකතු',
        description,
        canonicalUrl: '/collections',
        posts: posts.slice(0, 30).map((p) => ({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          createdAt: p.createdAt,
        })),
      }),
    ],
    [description, posts]
  );

  useSeo({
    title: 'Sinhala Wal Katha Collections – කතා එකතු | Wal Kathawa',
    description,
    canonical: '/collections',
    type: 'website',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Collections', href: '/collections' },
    ],
    jsonLdEntities: jsonLd,
  });

  const seriesPostCount = useMemo(
    () => posts.filter((p) => Boolean(p.collection)).length,
    [posts]
  );

  return (
    <div>
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52] space-y-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-700 dark:text-slate-200 font-medium">Collections</span>
        </nav>

        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Thematic Series · {collections.length} Collections · {seriesPostCount} Serialized Episodes
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sinhala Wal Katha Collections — කතා එකතු
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          කොටස් කිහිපයකින් සමන්විත ජනප්‍රිය සිංහල කතා මාලා පිළිවෙළින් කියවන්න. Explore all{' '}
          {collections.length} multi-part Sinhala story collections with direct links to opening and latest episodes.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collectionName, idx) => {
          const matching = posts.filter((p) => p.collection === collectionName);
          const chronological = [...matching].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );
          const latestStory = matching[0];
          const firstStory = chronological[0];
          const cover = latestStory?.coverImage;
          const colSlug = getTaxonomySlug(collectionName);
          const colPath = `/collections/${colSlug}`;
          const previewExcerpt = truncateSinhalaDescription(
            firstStory?.excerpt || latestStory?.excerpt || latestStory?.content || '',
            `${collectionName} කතා මාලාවේ සියලුම කොටස් කියවන්න.`,
            120
          );

          return (
            <article
              key={collectionName}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <Link
                to={colPath}
                className="block aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]"
              >
                {cover && (
                  <img
                    src={ensureHttpsUrl(cover)}
                    alt={`${collectionName} Wal Katha`}
                    width={800}
                    height={500}
                    loading={idx < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                )}
              </Link>

              <div className="p-5 flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      {matching.length} {matching.length === 1 ? 'Episode' : 'Episodes'}
                    </span>
                    {latestStory && (
                      <time dateTime={latestStory.updatedAt.toISOString()}>
                        Updated {formatRelativeTime(latestStory.updatedAt)}
                      </time>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                      <Link to={colPath}>{collectionName}</Link>
                    </h2>
                    <Link
                      to={colPath}
                      aria-label={`Open ${collectionName} collection`}
                      className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-white transition-colors shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {previewExcerpt}
                  </p>
                </div>

                {matching.length > 0 && (
                  <ul className="pt-3 border-t border-slate-100 dark:border-[#1e2f52]/70 space-y-1.5 text-xs">
                    {matching.slice(0, 3).map((story) => (
                      <li key={story.id} className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="w-3 h-3 text-blue-500 shrink-0" aria-hidden="true" />
                        <Link
                          to={`/posts/${story.slug}`}
                          className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 hover:underline truncate"
                        >
                          {story.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Helpful Cross-Navigation to Categories and Complete Archive */}
      <nav
        aria-label="Explore More Archive Sections"
        className="mt-10 pt-6 border-t border-slate-200 dark:border-[#1e2f52] flex flex-wrap items-center justify-between gap-4 text-xs"
      >
        <p className="text-slate-500 dark:text-slate-400">
          Looking for standalone stories? Browse {categories.length} story categories or the full archive.
        </p>
        <div className="flex items-center gap-3 font-semibold">
          <Link
            to="/categories"
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
          >
            Browse Categories ({categories.length})
          </Link>
          <Link
            to="/posts"
            className="px-3.5 py-2 rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity"
          >
            All Stories ({posts.length})
          </Link>
        </div>
      </nav>
    </div>
  );
}

export function CategoriesPage() {
  const { posts, categories, collections } = useApp();

  const description = truncateSinhalaDescription(
    `සිංහල වල් කතා සහ වැල කතා වර්ගීකරණ (${categories.length} Categories). Browse all Sinhala Wal Katha story categories on Wal Kathawa.`,
    155
  );

  const jsonLd = useMemo(
    () => [
      buildCollectionPageJsonLd({
        name: 'Sinhala Wal Katha Categories — කතා වර්ගීකරණ',
        description,
        canonicalUrl: '/categories',
        posts: posts.slice(0, 30).map((p) => ({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          createdAt: p.createdAt,
        })),
      }),
    ],
    [description, posts]
  );

  useSeo({
    title: 'Sinhala Wal Katha Categories – කතා වර්ගීකරණ | Wal Kathawa',
    description,
    canonical: '/categories',
    type: 'website',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Categories', href: '/categories' },
    ],
    jsonLdEntities: jsonLd,
  });

  return (
    <div>
      <header className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52] space-y-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          <Link to="/" className="hover:text-blue-600 dark:hover:text-white transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-700 dark:text-slate-200 font-medium">Categories</span>
        </nav>

        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Subject Index · {categories.length} Categories · {posts.length} Published Stories
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sinhala Wal Katha Categories — කතා වර්ගීකරණ
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          ඔබ කැමති මාතෘකාව අනුව සිංහල කතා පහසුවෙන් තෝරා කියවන්න. Browse all{' '}
          {categories.length} story categories and jump directly to the latest published Sinhala stories in each topic.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((categoryName, idx) => {
          const matching = posts.filter((p) => p.category === categoryName);
          const latestStory = matching[0];
          const cover = latestStory?.coverImage;
          const catSlug = getTaxonomySlug(categoryName);
          const catPath = `/categories/${catSlug}`;
          const previewExcerpt = truncateSinhalaDescription(
            latestStory?.excerpt || latestStory?.content || '',
            `${categoryName} වර්ගයේ සිංහල කතා එකතුව කියවන්න.`,
            120
          );

          return (
            <article
              key={categoryName}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <Link
                to={catPath}
                className="block aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]"
              >
                {cover && (
                  <img
                    src={ensureHttpsUrl(cover)}
                    alt={`${categoryName} Wal Katha`}
                    width={800}
                    height={500}
                    loading={idx < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                )}
              </Link>

              <div className="p-5 flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      {matching.length} {matching.length === 1 ? 'Story' : 'Stories'}
                    </span>
                    {latestStory && (
                      <time dateTime={latestStory.updatedAt.toISOString()}>
                        Updated {formatRelativeTime(latestStory.updatedAt)}
                      </time>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                      <Link to={catPath}>{categoryName}</Link>
                    </h2>
                    <Link
                      to={catPath}
                      aria-label={`Open ${categoryName} category`}
                      className="text-slate-400 group-hover:text-blue-500 dark:group-hover:text-white transition-colors shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {previewExcerpt}
                  </p>
                </div>

                {matching.length > 0 && (
                  <ul className="pt-3 border-t border-slate-100 dark:border-[#1e2f52]/70 space-y-1.5 text-xs">
                    {matching.slice(0, 3).map((story) => (
                      <li key={story.id} className="flex items-center gap-1.5 min-w-0">
                        <BookOpen className="w-3 h-3 text-blue-500 shrink-0" aria-hidden="true" />
                        <Link
                          to={`/posts/${story.slug}`}
                          className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 hover:underline truncate"
                        >
                          {story.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Helpful Cross-Navigation to Collections and Complete Archive */}
      <nav
        aria-label="Explore More Archive Sections"
        className="mt-10 pt-6 border-t border-slate-200 dark:border-[#1e2f52] flex flex-wrap items-center justify-between gap-4 text-xs"
      >
        <p className="text-slate-500 dark:text-slate-400">
          Prefer multi-part episodic series? Explore {collections.length} curated story collections.
        </p>
        <div className="flex items-center gap-3 font-semibold">
          <Link
            to="/collections"
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
          >
            Browse Collections ({collections.length})
          </Link>
          <Link
            to="/posts"
            className="px-3.5 py-2 rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity"
          >
            All Stories ({posts.length})
          </Link>
        </div>
      </nav>
    </div>
  );
}
