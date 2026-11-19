import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import sitemapHandler from './api/sitemap.js';
import sitemapRevalidateHandler from './api/sitemap-revalidate.js';
import rssHandler from './api/rss.js';
import indexNowHandler from './api/indexnow.js';
import robotsHandler from './api/robots.js';
import r2Handler from './api/r2.js';
import {
  getTaxonomySlug,
  LEGACY_CATEGORY_SLUG_REDIRECTS,
  LEGACY_COLLECTION_SLUG_REDIRECTS,
} from './src/lib/slugs.ts';

const currentDir =
  typeof import.meta.dirname === 'string'
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

const STATIC_KNOWN_PATHS = new Set([
  '/',
  '/posts',
  '/categories',
  '/collections',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/search',
  '/admin',
  '/404.html',
]);

function isAdminRoute(pathname: string): boolean {
  const clean = String(pathname || '').trim().toLowerCase();
  return clean === '/admin' || clean.startsWith('/admin/');
}

function loadSeoData() {
  try {
    const raw = fs.readFileSync(
      path.resolve(currentDir, 'src/data/prerenderedData.json'),
      'utf8'
    );
    return JSON.parse(raw);
  } catch {
    return { posts: [], categories: [], collections: [] };
  }
}

function wrapRes(res: any) {
  return {
    setHeader: (k: string, v: string) => res.setHeader(k, v),
    status: (code: number) => {
      res.statusCode = code;
      return {
        send: (body: string | Buffer) => res.end(body),
        end: () => res.end(),
      };
    },
  };
}

function attachApiMiddlewares(
  middlewares: any,
  serveDistHtml = false,
  devServer?: any
) {
  middlewares.use(async (req: any, res: any, next: any) => {
    const rawUrl = req.url || '/';
    const qIdx = rawUrl.indexOf('?');
    const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
    const queryStr = qIdx >= 0 ? rawUrl.slice(qIdx) : '';
    const hasTrailingSlash = pathname.length > 1 && pathname.endsWith('/');
    const cleanPath =
      pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/';

    if (cleanPath === '/sitemap.xml' || cleanPath === '/api/sitemap') {
      await sitemapHandler(req, wrapRes(res));
      return;
    }

    if (cleanPath === '/rss.xml' || cleanPath === '/api/rss') {
      await rssHandler(req, wrapRes(res));
      return;
    }

    if (cleanPath === '/api/sitemap-revalidate') {
      await sitemapRevalidateHandler(req, wrapRes(res));
      return;
    }

    if (cleanPath === '/api/indexnow') {
      await indexNowHandler(req, wrapRes(res));
      return;
    }

    if (cleanPath === '/robots.txt' || cleanPath === '/api/robots') {
      robotsHandler(req, wrapRes(res));
      return;
    }

    if (cleanPath === '/api/r2') {
      await r2Handler(req, wrapRes(res));
      return;
    }

    // Skip Vite internal modules and static files with extensions
    if (
      cleanPath.startsWith('/@') ||
      cleanPath.startsWith('/src/') ||
      cleanPath.startsWith('/node_modules/') ||
      cleanPath.startsWith('/assets/') ||
      cleanPath.startsWith('/fonts/') ||
      (/\.[a-z0-9]{2,8}$/i.test(cleanPath) && cleanPath !== '/404.html')
    ) {
      next();
      return;
    }

    const seoData = loadSeoData();
    let decodedPath = cleanPath;
    try {
      decodedPath = decodeURIComponent(cleanPath);
    } catch {
      // keep raw path if malformed encoding
    }

    let redirectDest: string | null = null;
    let isKnownRoute = STATIC_KNOWN_PATHS.has(cleanPath);

    if (decodedPath.startsWith('/posts/')) {
      const seg = decodedPath.slice('/posts/'.length);
      const matchedPost = (seoData.posts || []).find(
        (p: any) => p.slug === seg || p.id === seg || p.legacySlug === seg
      );
      if (matchedPost) {
        isKnownRoute = true;
        if (seg !== matchedPost.slug) {
          redirectDest = `/posts/${matchedPost.slug}`;
        }
      } else {
        isKnownRoute = false;
      }
    } else if (decodedPath.startsWith('/categories/')) {
      const seg = decodedPath.slice('/categories/'.length);
      const lowerSeg = seg.toLowerCase();
      const mappedLegacy = LEGACY_CATEGORY_SLUG_REDIRECTS[lowerSeg];
      const lookupSlug = mappedLegacy || lowerSeg;
      const matchedCat = (seoData.categories || []).find(
        (c: string) =>
          getTaxonomySlug(c) === lookupSlug || c.toLowerCase() === lowerSeg
      );
      if (matchedCat) {
        isKnownRoute = true;
        const canonicalSlug = getTaxonomySlug(matchedCat);
        if (seg !== canonicalSlug) {
          redirectDest = `/categories/${canonicalSlug}`;
        }
      } else {
        isKnownRoute = false;
      }
    } else if (decodedPath.startsWith('/collections/')) {
      const seg = decodedPath.slice('/collections/'.length);
      const lowerSeg = seg.toLowerCase();
      const mappedLegacy = LEGACY_COLLECTION_SLUG_REDIRECTS[lowerSeg];
      const lookupSlug = mappedLegacy || lowerSeg;
      const matchedCol = (seoData.collections || []).find(
        (c: string) =>
          getTaxonomySlug(c) === lookupSlug || c.toLowerCase() === lowerSeg
      );
      if (matchedCol) {
        isKnownRoute = true;
        const canonicalSlug = getTaxonomySlug(matchedCol);
        if (seg !== canonicalSlug) {
          redirectDest = `/collections/${canonicalSlug}`;
        }
      } else {
        isKnownRoute = false;
      }
    }

    // Single-hop 301 for legacy slugs and/or trailing slashes
    if (redirectDest || hasTrailingSlash) {
      const finalTarget = `${redirectDest || cleanPath}${queryStr}`;
      res.statusCode = 301;
      res.setHeader('Location', finalTarget);
      res.end();
      return;
    }

    if (serveDistHtml) {
      const distDir = path.resolve(currentDir, 'dist');
      if (isAdminRoute(cleanPath)) {
        const indexHtmlPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          res.end(fs.readFileSync(indexHtmlPath, 'utf8'));
          return;
        }
      }
      if (isKnownRoute) {
        const flatPath =
          cleanPath === '/'
            ? path.join(distDir, 'index.html')
            : path.join(distDir, `${cleanPath.replace(/^\/+/, '')}.html`);
        if (fs.existsSync(flatPath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(fs.readFileSync(flatPath, 'utf8'));
          return;
        }
      } else {
        const notFoundPath = path.join(distDir, '404.html');
        if (fs.existsSync(notFoundPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Robots-Tag', 'noindex, follow');
          res.end(fs.readFileSync(notFoundPath, 'utf8'));
          return;
        }
      }
    }

    // Dev server HTML serving with genuine 404s and /admin noindex headers
    if (devServer && typeof devServer.transformIndexHtml === 'function') {
      try {
        const rawHtml = fs.readFileSync(
          path.resolve(currentDir, 'index.html'),
          'utf8'
        );
        const transformed = await devServer.transformIndexHtml(rawUrl, rawHtml);
        if (!isKnownRoute) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Robots-Tag', 'noindex, follow');
          res.end(transformed);
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        if (isAdminRoute(cleanPath)) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        res.end(transformed);
        return;
      } catch {
        // fall through
      }
    }

    if (!isKnownRoute) {
      res.statusCode = 404;
    }

    next();
  });
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'seo-and-r2-endpoints',
        configureServer(server) {
          attachApiMiddlewares(server.middlewares, false, server);
        },
        configurePreviewServer(server) {
          attachApiMiddlewares(server.middlewares, true);
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 2500,
    },
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
