import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SEOHead } from '../components/SEOHead';

export function CollectionsPage() {
  const { posts, collections } = useApp();

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Collections' },
  ];

  return (
    <div>
      <SEOHead
        title="Curated Story Collections"
        description="Browse curated thematic collections of visual stories on walkathawa."
        canonicalPath="/collections"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Thematic Series · {collections.length} Collections
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
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
              className="group flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="aspect-[16/10] bg-zinc-900 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
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
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 tabular-nums">
                    {matching.length} {matching.length === 1 ? 'Story' : 'Stories'}
                  </p>
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                    {collectionName}
                  </h2>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
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
        title="Story Categories"
        description="Browse stories organized by subject and discipline on walkathawa."
        canonicalPath="/categories"
        breadcrumbs={breadcrumbs}
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Subject Index · {categories.length} Categories
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
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
              className="group flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="aspect-[16/10] bg-zinc-900 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
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
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 tabular-nums">
                    {matching.length} {matching.length === 1 ? 'Story' : 'Stories'}
                  </p>
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">
                    {categoryName}
                  </h2>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
