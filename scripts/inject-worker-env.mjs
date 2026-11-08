import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distWorkerPath = path.resolve(__dirname, '../dist/_worker.js');
const redirectsFilePath = path.resolve(__dirname, '../public/_redirects');

async function run() {
  try {
    let workerCode = await fs.readFile(distWorkerPath, 'utf8');

    // Parse 301 redirect rules from public/_redirects and inject into dist/_worker.js
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

    // Inject Cloudflare Pages R2 environment variables if present
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
    console.log('Configured dist/_worker.js with 301 redirects and environment.');
  } catch (err) {
    console.warn('Skipping dist/_worker.js post-build step:', err.message);
  }
}

run();
