import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';
import sitemapHandler from './api/sitemap.js';
import robotsHandler from './api/robots.js';
import r2Handler from './api/r2.js';
import { getTaxonomySlug } from './src/lib/slugs';

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

function loadSeoData() {
  try {
    const raw = fs.readFileSync(
      path.resolve(__dirname, 'src/data/prerenderedData.json'),
      'utf8'
    );
    return JSON.parse(raw);
  } catch {
    return { posts: [], categories: [], collections: [] };
  }
}

function attachApiMiddlewares(middlewares: any) {
  middlewares.use(async (req: any, res: any, next: any) => {
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0];
    const cleanPath =
      pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

    if (cleanPath === '/sitemap.xml' || cleanPath === '/api/sitemap') {
      const wrappedRes = {
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        status: (code: number) => {
          res.statusCode = code;
          return {
            send: (body: string | Buffer) => res.end(body),
            end: () => res.end(),
          };
        },
      };
      await sitemapHandler(req, wrappedRes);
      return;
    }
    if (cleanPath === '/robots.txt' || cleanPath === '/api/robots') {
      const wrappedRes = {
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        status: (code: number) => {
          res.statusCode = code;
          return {
            send: (body: string | Buffer) => res.end(body),
            end: () => res.end(),
          };
        },
      };
      robotsHandler(req, wrappedRes);
      return;
    }
    if (cleanPath === '/api/r2') {
      const wrappedRes = {
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        status: (code: number) => {
          res.statusCode = code;
          return {
            send: (body: string | Buffer) => res.end(body),
            end: () => res.end(),
          };
        },
      };
      await r2Handler(req, wrappedRes);
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
    const decodedPath = decodeURIComponent(cleanPath);

    // Handle 301 Redirects for legacy post IDs & encoded Sinhala category/collection URLs
    if (decodedPath.startsWith('/posts/')) {
      const seg = decodedPath.slice('/posts/'.length);
      const matchedPost = (seoData.posts || []).find(
        (p: any) => p.slug === seg || p.id === seg || p.legacySlug === seg
      );
      if (matchedPost && seg !== matchedPost.slug) {
        res.statusCode = 301;
        res.setHeader('Location', `/posts/${matchedPost.slug}`);
        res.end();
        return;
      }
      if (!matchedPost && (seoData.posts || []).length > 0) {
        res.statusCode = 404;
      }
      next();
      return;
    }

    if (decodedPath.startsWith('/categories/')) {
      const seg = decodedPath.slice('/categories/'.length);
      const matchedCat = (seoData.categories || []).find(
        (c: string) =>
          getTaxonomySlug(c) === seg.toLowerCase() ||
          c.toLowerCase() === seg.toLowerCase()
      );
      if (matchedCat) {
        const canonicalSlug = getTaxonomySlug(matchedCat);
        if (seg !== canonicalSlug) {
          res.statusCode = 301;
          res.setHeader('Location', `/categories/${canonicalSlug}`);
          res.end();
          return;
        }
      } else if ((seoData.categories || []).length > 0) {
        res.statusCode = 404;
      }
      next();
      return;
    }

    if (decodedPath.startsWith('/collections/')) {
      const seg = decodedPath.slice('/collections/'.length);
      const matchedCol = (seoData.collections || []).find(
        (c: string) =>
          getTaxonomySlug(c) === seg.toLowerCase() ||
          c.toLowerCase() === seg.toLowerCase()
      );
      if (matchedCol) {
        const canonicalSlug = getTaxonomySlug(matchedCol);
        if (seg !== canonicalSlug) {
          res.statusCode = 301;
          res.setHeader('Location', `/collections/${canonicalSlug}`);
          res.end();
          return;
        }
      } else if ((seoData.collections || []).length > 0) {
        res.statusCode = 404;
      }
      next();
      return;
    }

    // Set HTTP 404 status on unmatched top-level routes
    if (!STATIC_KNOWN_PATHS.has(cleanPath)) {
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
          attachApiMiddlewares(server.middlewares);
        },
        configurePreviewServer(server) {
          attachApiMiddlewares(server.middlewares);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
