import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Sun,
  Moon,
  FolderKanban,
  Layers,
  Home as HomeIcon,
  BookOpen,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  AdBanner320x50,
  AdSkyscraper160x600,
  SMARTLINK_URL,
} from './AdPlacements';
import { getTaxonomySlug } from '../lib/slugs';

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    theme,
    toggleTheme,
    categories,
    collections,
    searchQuery,
    setSearchQuery,
  } = useApp();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setSidebarOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSidebarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    setSidebarOpen(false);
    if (localSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(localSearch.trim())}`);
    } else if (location.pathname !== '/' && location.pathname !== '/posts') {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a1124] text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Top Bar: Logo at Top Left — Nav Links — Sidebar Icon at Top Right */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0d1730]/95 backdrop-blur border-b border-slate-200 dark:border-[#1e2f52]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Logo at Top Left Corner */}
          <Link
            to="/"
            onClick={() => setSearchQuery('')}
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
          >
            <img
              src="/assets/aistudio/Untitled_Design_62137426.png"
              alt="Wal Kathawa Logo"
              width={36}
              height={36}
              className="w-9 h-9 object-contain rounded bg-[#0a1124] p-0.5 border border-[#1e2f52]"
            />
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              walkathawa
            </span>
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links (Home, Stories, Collections, Categories) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <Link
              to="/"
              onClick={() => setSearchQuery('')}
              className={`hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname === '/'
                  ? 'text-blue-700 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-400'
                  : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/posts"
              onClick={() => setSearchQuery('')}
              className={`hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname === '/posts' || location.pathname.startsWith('/posts/')
                  ? 'text-blue-700 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-400'
                  : ''
              }`}
            >
              Stories
            </Link>
            <Link
              to="/collections"
              className={`hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/collections')
                  ? 'text-blue-700 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-400'
                  : ''
              }`}
            >
              Collections
            </Link>
            <Link
              to="/categories"
              className={`hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/categories')
                  ? 'text-blue-700 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-400'
                  : ''
              }`}
            >
              Categories
            </Link>
          </nav>

          {/* Zone 3: Top Right Corner Sidebar Icon & Theme Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light UI' : 'Switch to navy dark UI'}
              title={theme === 'dark' ? 'Switch to White Theme' : 'Switch to Navy Theme'}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              aria-expanded={sidebarOpen}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:bg-[#1e325c] dark:hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Right-Corner Slide-Over Sidebar Drawer with Search Button */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            aria-label="Site Pages Sidebar"
            className="relative z-10 w-80 max-w-full bg-white dark:bg-[#0d1730] border-l border-slate-200 dark:border-[#1e2f52] h-full flex flex-col justify-between p-6 overflow-y-auto shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-[#1e2f52]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/Untitled_Design_62137426.png"
                    alt="Wal Kathawa Logo"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain rounded bg-[#0a1124] p-0.5 border border-[#1e2f52]"
                  />
                  <span className="font-bold text-base tracking-tight text-slate-950 dark:text-white">
                    walkathawa
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#1e2f52] text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar & Search Button in Sidebar */}
              <form onSubmit={handleSidebarSearchSubmit} className="pt-5 pb-2">
                <label
                  htmlFor="sidebar-story-search"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2"
                >
                  Search Stories
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="sidebar-story-search"
                      type="search"
                      value={localSearch}
                      onChange={(e) => {
                        setLocalSearch(e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Search stories..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-[#0a1124] border border-slate-200 dark:border-[#1e2f52] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#162544] dark:bg-blue-600 text-white hover:bg-[#1e325c] dark:hover:bg-blue-500 transition-colors cursor-pointer shrink-0"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Primary Pages: Home, Stories, Collections, Categories */}
              <div className="py-5 space-y-1">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-400 px-3 pb-2">
                  Pages
                </p>
                <Link
                  to="/"
                  onClick={() => setSearchQuery('')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/'
                      ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544]'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 shrink-0" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/posts"
                  onClick={() => setSearchQuery('')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/posts' || location.pathname.startsWith('/posts/')
                      ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Stories</span>
                </Link>
                <Link
                  to="/collections"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/collections')
                      ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544]'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span>Collections</span>
                </Link>
                <Link
                  to="/categories"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/categories')
                      ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544]'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Categories</span>
                </Link>
                <a
                  href={SMARTLINK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-50 dark:bg-[#162544] text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <span>🔥 විශේෂ කතා (Special Link)</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              </div>

              {/* Quick Collections List */}
              {collections.length > 0 && (
                <div className="py-4 border-t border-slate-200 dark:border-[#1e2f52]">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-400 px-3 pb-2">
                    Collections
                  </p>
                  <div className="space-y-1">
                    {collections.map((col) => (
                      <Link
                        key={col}
                        to={`/collections/${getTaxonomySlug(col)}`}
                        className="block px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors truncate"
                      >
                        {col}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Categories List */}
              {categories.length > 0 && (
                <div className="py-4 border-t border-slate-200 dark:border-[#1e2f52]">
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-400 px-3 pb-2">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        to={`/categories/${getTaxonomySlug(cat)}`}
                        className="block px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#162544] transition-colors truncate"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="pt-6 border-t border-slate-200 dark:border-[#1e2f52] text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/about"
                  className="hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  About
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/contact"
                  className="hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  Contact
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/privacy-policy"
                  className="hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/terms-and-conditions"
                  className="hover:text-slate-950 dark:hover:text-white transition-colors"
                >
                  Terms &amp; Conditions
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Top Leaderboard 320x50 Banner Row + Smartlink */}
      <div className="w-full max-w-[1600px] mx-auto px-4 pt-3">
        <AdBanner320x50 showDoubleOnDesktop showSmartlink />
      </div>

      {/* Main Content Area Flanked by Two Side Ad Rails (9 per side on Homepage, 6 per side on Story Pages, 3 per side on other pages) */}
      <div className="flex-1 w-full max-w-[1640px] mx-auto px-2 sm:px-4 lg:px-6 py-6 flex items-start justify-center gap-4 xl:gap-6">
        {/* Left Side 160x600 Ad Rail */}
        <aside
          aria-label="Left Side Sponsored Banners"
          className="hidden xl:flex flex-col items-center shrink-0"
        >
          <AdSkyscraper160x600
            count={
              location.pathname === '/' || location.pathname === '/posts'
                ? 9
                : location.pathname.startsWith('/posts/')
                ? 6
                : 3
            }
          />
        </aside>

        {/* Central Page Content */}
        <main className="flex-1 min-w-0 max-w-7xl w-full">
          {children}
        </main>

        {/* Right Side 160x600 Ad Rail */}
        <aside
          aria-label="Right Side Sponsored Banners"
          className="hidden xl:flex flex-col items-center shrink-0"
        >
          <AdSkyscraper160x600
            count={
              location.pathname === '/' || location.pathname === '/posts'
                ? 9
                : location.pathname.startsWith('/posts/')
                ? 6
                : 3
            }
          />
        </aside>
      </div>

      {/* Bottom 320x50 Banner Row before Footer */}
      <div className="w-full max-w-[1600px] mx-auto px-4 pb-2">
        <AdBanner320x50 showDoubleOnDesktop showSmartlink />
      </div>

      {/* Clean Footer with SEO Keyword Block, About, Contact, Privacy Policy & Terms and Conditions */}
      <footer className="border-t border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#0d1730] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 max-w-5xl">
            Wal Kathawa (walkathawa.com) is Sri Lanka&apos;s premier archive for Sinhala Wal Katha (සිංහල වල් කතා), Wela Katha (සිංහල වැල කතා), Aluth Wal Katha 2026, Wife Wal Katha, Amma Wal Katha, Akka Katha, and Sinhala Chithra Katha.
          </p>

          <div className="pt-4 border-t border-slate-200/70 dark:border-[#1e2f52]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/Untitled_Design_62137426.png"
                alt="Wal Kathawa Logo"
                width={28}
                height={28}
                loading="lazy"
                className="w-7 h-7 object-contain rounded bg-[#0a1124] p-0.5 border border-[#1e2f52]"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                walkathawa
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                © 2026 All rights reserved.
              </span>
            </div>

            <nav
              aria-label="Footer Legal and Site Links"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              <Link
                to="/"
                onClick={() => setSearchQuery('')}
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/posts"
                onClick={() => setSearchQuery('')}
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Stories
              </Link>
              <Link
                to="/collections"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Collections
              </Link>
              <Link
                to="/categories"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Categories
              </Link>
              <Link
                to="/about"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Contact
              </Link>
              <a
                href={SMARTLINK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Special Stories (VIP)
              </a>
              <Link
                to="/privacy-policy"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-and-conditions"
                className="hover:text-blue-600 dark:hover:text-white transition-colors"
              >
                Terms and Conditions
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
