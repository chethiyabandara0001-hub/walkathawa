import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, ShieldCheck, FolderKanban, Layers, Home as HomeIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme, categories, collections, isAdmin } = useApp();
  const location = useLocation();

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

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
      {/* Top Bar Contract: Zone 1 (Logo + Wordmark) — Zone 2 (Nav Links) — Zone 3 (Sidebar Icon) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Logo at Top Left Corner */}
          <Link
            to="/"
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 rounded-md"
          >
            <img
              src="/assets/aistudio/Untitled_Design_62137426.png"
              alt="Monolith Stories Logo"
              className="w-9 h-9 object-contain rounded bg-zinc-900 p-0.5 border border-zinc-800"
            />
            <span className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
              Monolith Stories
            </span>
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            <Link
              to="/"
              className={`hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname === '/' || location.pathname === '/posts'
                  ? 'text-zinc-950 dark:text-white underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/collections"
              className={`hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/collections')
                  ? 'text-zinc-950 dark:text-white underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Collections
            </Link>
            <Link
              to="/categories"
              className={`hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                location.pathname.startsWith('/categories')
                  ? 'text-zinc-950 dark:text-white underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              Categories
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`hover:text-zinc-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                  location.pathname.startsWith('/admin')
                    ? 'text-zinc-950 dark:text-white underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Zone 3: Top Right Corner Sidebar Icon & Theme Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to white UI' : 'Switch to dark UI'}
              title={theme === 'dark' ? 'Switch to White Theme' : 'Switch to Dark Theme'}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              aria-expanded={sidebarOpen}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Right-Corner Slide-Over Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            aria-label="Site Pages Sidebar"
            className="relative z-10 w-80 max-w-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col justify-between p-6 overflow-y-auto shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/aistudio/Untitled_Design_62137426.png"
                    alt="Monolith Logo"
                    className="w-7 h-7 object-contain rounded bg-zinc-900 p-0.5"
                  />
                  <span className="font-bold text-base tracking-tight text-zinc-950 dark:text-white">
                    Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Primary Pages: Home, Collections, Categories */}
              <div className="py-6 space-y-1">
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 px-3 pb-2">
                  Pages
                </p>
                <Link
                  to="/"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/' || location.pathname === '/posts'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 shrink-0" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/collections"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/collections')
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  <span>Collections</span>
                </Link>
                <Link
                  to="/categories"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/categories')
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Categories</span>
                </Link>
              </div>

              {/* Quick Collections List */}
              {collections.length > 0 && (
                <div className="py-4 border-t border-zinc-200 dark:border-zinc-800/80">
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 px-3 pb-2">
                    Collections
                  </p>
                  <div className="space-y-1">
                    {collections.map((col) => (
                      <Link
                        key={col}
                        to={`/collections/${encodeURIComponent(col)}`}
                        className="block px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors truncate"
                      >
                        {col}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Categories List */}
              {categories.length > 0 && (
                <div className="py-4 border-t border-zinc-200 dark:border-zinc-800/80">
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 px-3 pb-2">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat}
                        to={`/categories/${encodeURIComponent(cat)}`}
                        className="block px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors truncate"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Link
                to="/admin"
                className="flex items-center gap-2 py-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Panel</span>
              </Link>
              <div className="flex items-center gap-3 pt-2">
                <Link
                  to="/privacy-policy"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to="/terms-and-conditions"
                  className="hover:text-zinc-950 dark:hover:text-white transition-colors"
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

      {/* Clean Editorial Footer with Privacy Policy & Terms and Conditions */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/Untitled_Design_62137426.png"
              alt="Monolith Stories"
              className="w-7 h-7 object-contain rounded bg-zinc-900 p-0.5 border border-zinc-800"
            />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Monolith Stories
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} All rights reserved.
            </span>
          </div>

          <nav
            aria-label="Footer Legal and Site Links"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            <Link
              to="/"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              to="/collections"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Collections
            </Link>
            <Link
              to="/categories"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Categories
            </Link>
            <Link
              to="/privacy-policy"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-and-conditions"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Terms and Conditions
            </Link>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Sitemap
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
