import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import sitemapHandler from './api/sitemap.js';
import robotsHandler from './api/robots.js';
import r2Handler from './api/r2.js';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'seo-and-r2-endpoints-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split('?')[0];
            if (url === '/sitemap.xml' || url === '/api/sitemap') {
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
            if (url === '/robots.txt' || url === '/api/robots') {
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
            if (url === '/api/r2') {
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
            next();
          });
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
