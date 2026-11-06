import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SEOHead } from '../components/SEOHead';
import { AdBanner320x50 } from '../components/AdPlacements';

export function CollectionsPage() {
  const { posts, collections } = useApp();

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Collections' },
  ];

  return (
    <div>
      <SEOHead
        title="කතා එකතු (Collections) — සියලුම කොටස් කියවන්න | Sinhala Wal Katha - Wal Kathawa"
        description="Read all episodes of කතා එකතු (Collections) (සියලුම කොටස් කියවන්න) on Wal Kathawa. Complete Sinhala Wal Katha & Wela Katha series archive."
        canonicalPath="/collections"
        breadcrumbs={breadcrumbs}
        keywords={collections}
      />

      <div className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Thematic Series · {collections.length} Collections
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
          Collections
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collectionName) => {
          const matching = posts.filter((p) => p.collection === collectionName);
          const cover = matching[0]?.coverImage;

          return (
            <Link
              key={collectionName}
              to={`/collections/${encodeURIComponent(collectionName)}`}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <div className="aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]">
                {cover && (
                  <img
                    src={cover}
                    alt={collectionName}
                    loading="lazy"
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

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Categories' },
  ];

  return (
    <div>
      <SEOHead
        title="Sinhala Wal Katha — සිංහල වල් කතා 2026 | Wal Kathawa"
        description="Explore the latest Sinhala Wal Katha and Wela Katha stories on walkathawa.com. දිනපතා අලුත් වන සිංහල වල් කතා එකතුව."
        canonicalPath="/categories"
        breadcrumbs={breadcrumbs}
        keywords={categories}
      />

      <div className="mb-8 pb-6 border-b border-slate-200 dark:border-[#1e2f52]">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Subject Index · {categories.length} Categories
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
          Categories
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((categoryName) => {
          const matching = posts.filter((p) => p.category === categoryName);
          const cover = matching[0]?.coverImage;

          return (
            <Link
              key={categoryName}
              to={`/categories/${encodeURIComponent(categoryName)}`}
              className="group flex flex-col border border-slate-200 dark:border-[#1e2f52] rounded-xl overflow-hidden bg-white dark:bg-[#111d38] hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors"
            >
              <div className="aspect-[16/10] bg-[#0a1124] overflow-hidden border-b border-slate-200 dark:border-[#1e2f52]">
                {cover && (
                  <img
                    src={cover}
                    alt={categoryName}
                    loading="lazy"
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
