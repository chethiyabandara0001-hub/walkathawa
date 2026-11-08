import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdBanner320x50 } from '../components/AdPlacements';
import {
  useSeo,
  buildCollectionPageJsonLd,
  truncateSinhalaDescription,
} from '../lib/seo';
import { getTaxonomySlug } from '../lib/slugs';
import { ensureHttpsUrl } from '../utils/imageUtils';

export function CollectionsPage() {
  const { posts, collections } = useApp();

  const description = truncateSinhalaDescription(
    'සියලුම සිංහල වල් කතා එකතු (Collections) කියවන්න. Browse all multi-part Sinhala Wal Katha & Wela Katha series on Wal Kathawa.',
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

  return (
    <div>
      <div className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Thematic Series · {collections.length} Collections
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sinhala Wal Katha Collections — කතා එකතු
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collectionName) => {
          const matching = posts.filter((p) => p.collection === collectionName);
          const cover = matching[0]?.coverImage;
          const colSlug = getTaxonomySlug(collectionName);

          return (
            <Link
              key={collectionName}
              to={`/collections/${colSlug}`}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <div className="aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]">
                {cover && (
                  <img
                    src={ensureHttpsUrl(cover)}
                    alt={`${collectionName} Wal Katha`}
                    width={800}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                )}
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 tabular-nums">
                    {matching.length} {matching.length === 1 ? 'Story' : 'Stories'}
                  </p>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {collectionName}
                  </h2>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-white transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-8">
        <AdBanner320x50 showDoubleOnDesktop showSmartlink />
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { posts, categories } = useApp();

  const description = truncateSinhalaDescription(
    'සිංහල වල් කතා සහ වැල කතා වර්ගීකරණ (Categories). Browse all Sinhala Wal Katha categories on Wal Kathawa.',
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
      <div className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Subject Index · {categories.length} Categories
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sinhala Wal Katha Categories — කතා වර්ගීකරණ
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((categoryName) => {
          const matching = posts.filter((p) => p.category === categoryName);
          const cover = matching[0]?.coverImage;
          const catSlug = getTaxonomySlug(categoryName);

          return (
            <Link
              key={categoryName}
              to={`/categories/${catSlug}`}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <div className="aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]">
                {cover && (
                  <img
                    src={ensureHttpsUrl(cover)}
                    alt={`${categoryName} Wal Katha`}
                    width={800}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                )}
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 tabular-nums">
                    {matching.length} {matching.length === 1 ? 'Story' : 'Stories'}
                  </p>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {categoryName}
                  </h2>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-white transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-8">
        <AdBanner320x50 showDoubleOnDesktop showSmartlink />
      </div>
    </div>
  );
}
