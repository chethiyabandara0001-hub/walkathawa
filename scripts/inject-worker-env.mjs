import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distWorkerPath = path.resolve(__dirname, '../dist/_worker.js');

async function run() {
  try {
    let workerCode = await fs.readFile(distWorkerPath, 'utf8');

    // Only inject into dist/_worker.js when building on Cloudflare Pages / CI
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
      await fs.writeFile(distWorkerPath, workerCode, 'utf8');
      console.log('Configured dist/_worker.js with Cloudflare Pages environment.');
    }
  } catch (err) {
    console.warn('Skipping dist/_worker.js post-build step:', err.message);
  }
}

run();
