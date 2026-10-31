import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSitemapXml } from '../api/sitemap.js';
import { buildRobotsTxt } from '../api/robots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

async function run() {
  await fs.mkdir(publicDir, { recursive: true });
  const xml = await buildSitemapXml();
  const robots = buildRobotsTxt();

  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');
  console.log('Generated public/sitemap.xml and public/robots.txt for https://walkathawa.com');
}

run().catch((err) => {
  console.error('Failed to generate sitemap:', err);
});
