import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { buildRobotsTxt } from '../api/robots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const ORIGIN = 'https://walkathawa.com';

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateSitemapWithFirebaseSdk() {
  const today = new Date().toISOString().split('T')[0];
  const postUrls = [];
  const discoveredCategories = new Set();
  const discoveredCollections = new Set();

  try {
    const rawConfig = await fs.readFile(
      path.resolve(__dirname, '../firebase-applet-config.json'),
      'utf8'
    );
    const firebaseConfig = JSON.parse(rawConfig);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const [postsSnap, taxSnap] = await Promise.all([
      getDocs(collection(db, 'posts')).catch(() => null),
      getDoc(doc(db, 'settings', 'taxonomy')).catch(() => null),
    ]);

    if (taxSnap && taxSnap.exists()) {
      const data = taxSnap.data();
      if (Array.isArray(data?.categories)) {
        for (const c of data.categories) {
          if (String(c || '').trim()) discoveredCategories.add(String(c).trim());
        }
      }
      if (Array.isArray(data?.collections)) {
        for (const c of data.collections) {
          if (String(c || '').trim()) discoveredCollections.add(String(c).trim());
        }
      }
    }

    if (postsSnap) {
      postsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.published === false) return;

        const cat = String(data.category || '').trim();
        if (cat) discoveredCategories.add(cat);

        const col = String(data.collection || '').trim();
        if (col) discoveredCollections.add(col);

        const updatedDate =
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date();
        const lastmod = updatedDate.toISOString().split('T')[0] || today;

        postUrls.push({
          loc: `${ORIGIN}/posts/${encodeURIComponent(docSnap.id)}`,
          lastmod,
        });
      });
    }
  } catch (err) {
    console.warn('Sitemap Firestore warning:', err);
  }

  const staticEntries = [
    { loc: `${ORIGIN}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${ORIGIN}/posts`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${ORIGIN}/categories`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/collections`, lastmod: today, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/privacy-policy`, lastmod: today, changefreq: 'monthly', priority: '0.4' },
    {
      loc: `${ORIGIN}/terms-and-conditions`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.4',
    },
  ];

  const categoryEntries = Array.from(discoveredCategories).map((c) => ({
    loc: `${ORIGIN}/categories/${encodeURIComponent(c)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const collectionEntries = Array.from(discoveredCollections).map((c) => ({
    loc: `${ORIGIN}/collections/${encodeURIComponent(c)}`,
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  }));

  const postEntries = postUrls.map((p) => ({
    loc: p.loc,
    lastmod: p.lastmod,
    changefreq: 'weekly',
    priority: '0.9',
  }));

  const allEntries = [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...postEntries,
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

async function run() {
  await fs.mkdir(publicDir, { recursive: true });
  const xml = await generateSitemapWithFirebaseSdk();
  const robots = buildRobotsTxt();

  await fs.writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf8');
  await fs.writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');
  console.log('Generated public/sitemap.xml and public/robots.txt for https://walkathawa.com');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exit(0);
});
