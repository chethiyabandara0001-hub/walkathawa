import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distWorkerPath = path.resolve(__dirname, '../dist/_worker.js');
const redirectsFilePath = path.resolve(__dirname, '../public/_redirects');
const firebaseConfigPath = path.resolve(__dirname, '../firebase-applet-config.json');
const prerenderedDataPath = path.resolve(__dirname, '../src/data/prerenderedData.json');

async function run() {
  try {
    let workerCode = await fs.readFile(distWorkerPath, 'utf8');

    // 1. Parse 301 redirect rules from public/_redirects and inject into dist/_worker.js
    try {
      const rawRedirects = await fs.readFile(redirectsFilePath, 'utf8');
      const redirects = {};

      for (const line of rawRedirects.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const fromPath = parts[0];
          const toPath = parts[1];
          redirects[fromPath] = toPath;
          try {
            redirects[decodeURIComponent(fromPath)] = toPath;
          } catch {
            // ignore decode error
          }
        }
      }

      workerCode = workerCode.replace(
        'const LEGACY_REDIRECTS = {};',
        `const LEGACY_REDIRECTS = ${JSON.stringify(redirects)};`
      );
    } catch (e) {
      console.warn('Could not inject legacy redirects into worker:', e.message);
    }

    // 2. Inject public Firebase client identifiers (no private credentials) for dynamic Firestore sitemap & SSR fallback
    try {
      const rawFb = await fs.readFile(firebaseConfigPath, 'utf8');
      const fb = JSON.parse(rawFb);
      const publicFirebaseConfig = {
        projectId: String(fb.projectId || ''),
        apiKey: String(fb.apiKey || ''),
        firestoreDatabaseId: String(fb.firestoreDatabaseId || '(default)'),
      };
      workerCode = workerCode.replace(
        'const FIREBASE_PUBLIC_CONFIG = {};',
        `const FIREBASE_PUBLIC_CONFIG = ${JSON.stringify(publicFirebaseConfig)};`
      );
    } catch (e) {
      console.warn('Could not inject Firebase public config into worker:', e.message);
    }

    // 3. Inject lightweight static archive index (metadata only, no story body) for dynamic sitemap merging
    try {
      const rawData = await fs.readFile(prerenderedDataPath, 'utf8');
      const parsed = JSON.parse(rawData);
      const lightweightIndex = {
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        collections: Array.isArray(parsed.collections) ? parsed.collections : [],
        posts: Array.isArray(parsed.posts)
          ? parsed.posts
              .filter((p) => p && p.published !== false && p.slug)
              .map((p) => ({
                id: String(p.id || ''),
                slug: String(p.slug || ''),
                category: String(p.category || ''),
                collection: String(p.collection || ''),
                published: true,
                createdAt: p.createdAt || '',
                updatedAt: p.updatedAt || p.createdAt || '',
              }))
          : [],
      };
      workerCode = workerCode.replace(
        'const STATIC_ARCHIVE_INDEX = { categories: [], collections: [], posts: [] };',
        `const STATIC_ARCHIVE_INDEX = ${JSON.stringify(lightweightIndex)};`
      );
    } catch (e) {
      console.warn('Could not inject static archive index into worker:', e.message);
    }

    // 4. Inject Cloudflare Pages R2 environment variables if present
    if (process.env.CF_PAGES || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CI) {
      const fallbackEnv = {
        R2_ACCOUNT_ID: (process.env.R2_ACCOUNT_ID || '').trim(),
        R2_ACCESS_KEY_ID: (process.env.R2_ACCESS_KEY_ID || '').trim(),
        R2_SECRET_ACCESS_KEY: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
        R2_BUCKET_NAME: (process.env.R2_BUCKET_NAME || '').trim(),
        R2_PUBLIC_URL: (process.env.R2_PUBLIC_URL || '').trim(),
      };

      workerCode = workerCode.replace(
        'function getR2Config(env = {}) {',
        `const BUILD_ENV = ${JSON.stringify(fallbackEnv)};\nfunction getR2Config(rawEnv = {}) {\n  const env = { ...BUILD_ENV, ...rawEnv };`
      );
    }

    await fs.writeFile(distWorkerPath, workerCode, 'utf8');
    console.log(
      'Configured dist/_worker.js with 301 redirects, public Firebase config, and archive index.'
    );
  } catch (err) {
    console.warn('Skipping dist/_worker.js post-build step:', err.message);
  }
}

run();
