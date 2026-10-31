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
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

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
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
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
    if (location.pathname !== '/' && location.pathname !== '/posts') {
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
              alt="walkathawa Logo"
              className="w-9 h-9 object-contain rounded bg-[#0a1124] p-0.5 border border-[#1e2f52]"
            />
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              walkathawa
            </span>
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links (Admin link removed as requested) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <Link
              to="/"
              onClick={() => setSearchQuery('')}
              className={`hover:text-blue-600 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname === '/' || location.pathname === '/posts'
                  ? 'text-blue-700 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-400'
                  : ''
              }`}
            >
              Home
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
                    alt="walkathawa Logo"
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

              {/* Primary Pages: Home, Collections, Categories */}
              <div className="py-5 space-y-1">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-400 px-3 pb-2">
                  Pages
                </p>
                <Link
                  to="/"
                  onClick={() => setSearchQuery('')}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/' || location.pathname === '/posts'
                      ? 'bg-[#162544] text-white dark:bg-blue-600 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162544]'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 shrink-0" />
                  <span>Home</span>
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
                        to={`/collections/${encodeURIComponent(col)}`}
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
                        to={`/categories/${encodeURIComponent(cat)}`}
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
              <div className="flex items-center gap-3">
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
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Clean Footer with Privacy Policy & Terms and Conditions (Sitemap button removed as requested) */}
      <footer className="border-t border-slate-200 dark:border-[#1e2f52] bg-white dark:bg-[#0d1730] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/Untitled_Design_62137426.png"
              alt="walkathawa"
              className="w-7 h-7 object-contain rounded bg-[#0a1124] p-0.5 border border-[#1e2f52]"
            />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              walkathawa
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} All rights reserved.
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
      </footer>
    </div>
  );
}
