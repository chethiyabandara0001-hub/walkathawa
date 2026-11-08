import { Link } from 'react-router-dom';
import { Home, BookOpen, Layers } from 'lucide-react';
import { useSeo } from '../lib/seo';

export function NotFoundPage() {
  useSeo({
    title: 'Page Not Found (404) | Wal Kathawa',
    description:
      'සොයන ලද පිටුව හමු නොවීය (404 Page Not Found). Return to Wal Kathawa to read the latest Sinhala Wal Katha and Wela Katha stories.',
    noindex: true,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: '404 Not Found' },
    ],
  });

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#111d38] space-y-6">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-blue-50 dark:bg-[#162544] text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wider uppercase">
          HTTP 404 Error
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Page Not Found — පිටුව හමු නොවීය
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          ඔබ සොයන කතාව හෝ පිටුව ඉවත් කර ඇත, නැතහොත් එහි ලිපිනය වෙනස් වී ඇත. පහත සබැඳි හරහා අලුත්ම සිංහල කතා කියවන්න.
        </p>

        <nav
          aria-label="404 Recovery Links"
          className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-semibold"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            <span>Home (මුල් පිටුව)</span>
          </Link>

          <Link
            to="/posts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-800 dark:text-slate-100 hover:border-blue-400 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>All Stories (/posts)</span>
          </Link>

          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-800 dark:text-slate-100 hover:border-blue-400 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Categories (/categories)</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
