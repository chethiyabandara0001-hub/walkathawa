import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0113753106',
  appId: '1:345244709168:web:0e6d23f9967748220ed8f5',
  apiKey: 'AIzaSyBMLpiqVwnyt1t8tpgRrBA4lH7vGMTUx9M',
  authDomain: 'gen-lang-client-0113753106.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-3697506a-5277-42dc-9a15-7b72e6472d8f',
  storageBucket: 'gen-lang-client-0113753106.firebasestorage.app',
  messagingSenderId: '345244709168',
};

const ORIGIN = 'https://walkathawa.com';

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function buildSitemapXml() {
  const today = new Date().toISOString().split('T')[0];
  const postUrls = [];
  const discoveredCategories = new Set();
  const discoveredCollections = new Set();

  try {
    const app =
      getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);

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
          if (String(c || '').trim())
            discoveredCollections.add(String(c).trim());
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
    console.error('Firestore fetch warning in sitemap:', err);
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

export default async function handler(req, res) {
  const xml = await buildSitemapXml();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(xml);
}
