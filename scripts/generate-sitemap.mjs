import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { buildRobotsTxt } from '../api/robots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const dataFilePath = path.resolve(__dirname, '../src/data/prerenderedData.json');
const ORIGIN = 'https://walkathawa.com';

const LEGACY_SEED_POST_IDS = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5', 'seed-6'];
const LEGACY_DEFAULT_CATEGORIES = [
  'Investigative',
  'Architecture',
  'Technology',
  'Culture',
  'Environment',
  'Maritime',
];
const LEGACY_DEFAULT_COLLECTIONS = [
  'The Concrete Horizons',
  'Northern Latitudes',
  'Signal & Silence',
];

const SINHALA_INDEPENDENT_VOWELS = {
  අ: 'a',
  ආ: 'aa',
  ඇ: 'ae',
  ඈ: 'aae',
  ඉ: 'i',
  ඊ: 'ii',
  උ: 'u',
  ඌ: 'uu',
  ඍ: 'ri',
  ඎ: 'rii',
  ඏ: 'li',
  ඐ: 'lii',
  එ: 'e',
  ඒ: 'ee',
  ඓ: 'ai',
  ඔ: 'o',
  ඕ: 'oo',
  ඖ: 'au',
};

const SINHALA_CONSONANTS = {
  ක: 'k',
  ඛ: 'kh',
  ග: 'g',
  ඝ: 'gh',
  ඞ: 'ng',
  ඟ: 'nga',
  ච: 'ch',
  ඡ: 'chh',
  ජ: 'j',
  ඣ: 'jh',
  ඤ: 'ny',
  ඥ: 'gn',
  ඦ: 'nja',
  ට: 't',
  ඨ: 'th',
  ඩ: 'd',
  ඪ: 'dh',
  ණ: 'n',
  ඬ: 'nda',
  ත: 'th',
  ථ: 'thh',
  ද: 'd',
  ධ: 'dh',
  න: 'n',
  ඳ: 'nda',
  ප: 'p',
  ඵ: 'ph',
  බ: 'b',
  භ: 'bh',
  ම: 'm',
  ඹ: 'mba',
  ය: 'y',
  ර: 'r',
  ල: 'l',
  ව: 'w',
  ශ: 'sh',
  ෂ: 'sh',
  ස: 's',
  හ: 'h',
  ළ: 'l',
  ෆ: 'f',
};

const SINHALA_VOWEL_SIGNS = {
  '\u0DCA': '',
  '\u0DCF': 'a',
  '\u0DD0': 'ae',
  '\u0DD1': 'aae',
  '\u0DD2': 'i',
  '\u0DD3': 'ii',
  '\u0DD4': 'u',
  '\u0DD6': 'uu',
  '\u0DD8': 'ri',
  '\u0DD9': 'e',
  '\u0DDA': 'ee',
  '\u0DDB': 'ai',
  '\u0DDC': 'o',
  '\u0DDD': 'oo',
  '\u0DDE': 'au',
  '\u0DDF': 'li',
  '\u0DF2': 'rii',
  '\u0DF3': 'lii',
};

const SINHALA_MISC_SIGNS = {
  '\u0D82': 'n',
  '\u0D83': 'h',
};

const KNOWN_TAXONOMY_SLUGS = {
  'අම්ම පුතා': 'amma-putha',
  'වයිෆ් හෝ gf': 'wife-ho-gf',
  'සහෝදර/සහෝදරී': 'sahodara-sahodari',
  'තාත්ත දුව': 'thaththa-duwa',
  'පවුලේ අන් අය සමග': 'pawule-an-aya-samaga',
  'සම ලිංගික': 'sama-lingika',
  'වැඩිමහල් බාල': 'wadimahal-bala',
  'වෙනත්': 'wenath',
};

function romanizeSinhala(input) {
  if (!input) return '';
  const str = String(input).normalize('NFC');
  let out = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = i + 1 < str.length ? str[i + 1] : '';

    if (SINHALA_INDEPENDENT_VOWELS[ch] !== undefined) {
      out += SINHALA_INDEPENDENT_VOWELS[ch];
      continue;
    }

    if (SINHALA_CONSONANTS[ch] !== undefined) {
      const base = SINHALA_CONSONANTS[ch];
      if (next && SINHALA_VOWEL_SIGNS[next] !== undefined) {
        out += base + SINHALA_VOWEL_SIGNS[next];
        i++;
      } else {
        out += base.endsWith('a') ? base : `${base}a`;
      }
      continue;
    }

    if (SINHALA_VOWEL_SIGNS[ch] !== undefined) {
      out += SINHALA_VOWEL_SIGNS[ch];
      continue;
    }

    if (SINHALA_MISC_SIGNS[ch] !== undefined) {
      out += SINHALA_MISC_SIGNS[ch];
      continue;
    }

    out += ch;
  }

  return out;
}

function toRomanizedSlug(input, maxLen = 60) {
  const romanized = romanizeSinhala(input)
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!romanized) return 'sinhala-wal-katha';

  if (romanized.length <= maxLen) return romanized;

  const sliced = romanized.slice(0, maxLen).replace(/-+$/g, '');
  const lastHyphen = sliced.lastIndexOf('-');
  if (lastHyphen >= 16) {
    return sliced.slice(0, lastHyphen);
  }
  return sliced || 'sinhala-wal-katha';
}

function deduplicateSlug(baseInput, usedSlugs, maxLen = 60) {
  const base = toRomanizedSlug(baseInput, maxLen);
  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }

  let counter = 2;
  while (counter < 10000) {
    const suffix = `-${counter}`;
    const trimmedBase = base
      .slice(0, Math.max(1, maxLen - suffix.length))
      .replace(/-+$/g, '');
    const candidate = `${trimmedBase}${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
    counter++;
  }

  const fallback = `${base.slice(0, 50)}-${Date.now().toString(36)}`;
  usedSlugs.add(fallback);
  return fallback;
}

function isOpaqueOrLegacySlug(slug, id) {
  if (!slug) return true;
  const s = String(slug).trim();
  if (!s) return true;
  if (/^(story|post)-\d{8,}$/i.test(s)) return true;
  if (/^\d+-[a-z0-9]{4,8}$/i.test(s)) return true;
  if (/^[a-z0-9]{18,}$/i.test(s) && !s.includes('-')) return true;
  if (/[^\x00-\x7F]/.test(s)) return true;
  if (id && s === id && (/^(story|post)-/i.test(s) || /^\d+-/.test(s))) {
    return true;
  }
  return false;
}

function getTaxonomySlug(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'all';
  const lower = clean.toLowerCase();
  if (KNOWN_TAXONOMY_SLUGS[lower]) {
    return KNOWN_TAXONOMY_SLUGS[lower];
  }
  return toRomanizedSlug(clean, 60);
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrlsetXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
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

function renderSitemapIndexXml(sitemaps) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sm) => `  <sitemap>
    <loc>${escapeXml(sm.loc)}</loc>
    <lastmod>${escapeXml(sm.lastmod)}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;
}

async function generateSeoDataAndSitemap() {
  const defaultStaticLastmod = '2026-10-30';
  const discoveredCategories = new Set();
  const discoveredCollections = new Set();
  const rawPosts = [];
  let legacyCleaned = true;

  let existingSnapshot = { posts: [], categories: [], collections: [] };
  try {
    const rawExisting = await fs.readFile(dataFilePath, 'utf8');
    existingSnapshot = JSON.parse(rawExisting);
  } catch {
    // ignore if file does not exist yet
  }

  try {
    const rawConfig = await fs.readFile(
      path.resolve(__dirname, '../firebase-applet-config.json'),
      'utf8'
    );
    const firebaseConfig = JSON.parse(rawConfig);
    const dbId =
      firebaseConfig.firestoreDatabaseId &&
      firebaseConfig.firestoreDatabaseId !== '(default)'
        ? firebaseConfig.firestoreDatabaseId
        : '(default)';

    const checkUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents/posts?key=${encodeURIComponent(
      firebaseConfig.apiKey
    )}&pageSize=1`;
    const checkResp = await fetch(checkUrl).catch(() => null);

    let postsSnap = null;
    let taxSnap = null;

    if (checkResp && checkResp.status !== 404) {
      const app = initializeApp(firebaseConfig);
      const db =
        dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);

      const withTimeout = (promise, ms = 3500) =>
        Promise.race([
          promise,
          new Promise((resolve) => setTimeout(() => resolve(null), ms)),
        ]);

      [postsSnap, taxSnap] = await Promise.all([
        withTimeout(getDocs(collection(db, 'posts')).catch(() => null)),
        withTimeout(getDoc(doc(db, 'settings', 'taxonomy')).catch(() => null)),
      ]);
    }

    if (taxSnap && typeof taxSnap.exists === 'function' && taxSnap.exists()) {
      const data = taxSnap.data();
      legacyCleaned = data?.legacyDefaultsRemoved !== false;
      if (Array.isArray(data?.categories)) {
        for (const c of data.categories) {
          const clean = String(c || '').trim();
          if (clean && (legacyCleaned || !LEGACY_DEFAULT_CATEGORIES.includes(clean))) {
            discoveredCategories.add(clean);
          }
        }
      }
      if (Array.isArray(data?.collections)) {
        for (const c of data.collections) {
          const clean = String(c || '').trim();
          if (clean && (legacyCleaned || !LEGACY_DEFAULT_COLLECTIONS.includes(clean))) {
            discoveredCollections.add(clean);
          }
        }
      }
    }

    if (postsSnap && typeof postsSnap.forEach === 'function') {
      postsSnap.forEach((docSnap) => {
        if (LEGACY_SEED_POST_IDS.includes(docSnap.id)) return;
        const data = docSnap.data();
        if (data.published === false) return;

        const rawCat = String(data.category || '').trim();
        const cat =
          LEGACY_DEFAULT_CATEGORIES.includes(rawCat) && !legacyCleaned ? '' : rawCat;
        if (cat) discoveredCategories.add(cat);

        const rawCol = String(data.collection || '').trim();
        const col =
          LEGACY_DEFAULT_COLLECTIONS.includes(rawCol) && !legacyCleaned ? '' : rawCol;
        if (col) discoveredCollections.add(col);

        const createdDate =
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date('2026-10-30T00:00:00.000Z');
        const updatedDate =
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : createdDate;

        const imgs =
          Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : data.coverImage
            ? [data.coverImage]
            : [];

        rawPosts.push({
          id: docSnap.id,
          title: String(data.title || 'Untitled Story'),
          rawSlug: String(data.slug || docSnap.id),
          legacySlug: String(data.legacySlug || data.slug || docSnap.id),
          excerpt: String(data.excerpt || ''),
          content: String(data.content || ''),
          category: cat,
          collection: col,
          coverImage: String(data.coverImage || imgs[0] || ''),
          images: imgs,
          authorEmail: String(data.authorEmail || 'chethiyabandara0001@gmail.com'),
          published: data.published !== false,
          createdAt: createdDate.toISOString(),
          updatedAt: updatedDate.toISOString(),
          createdTimeMs: createdDate.getTime(),
          updatedTimeMs: updatedDate.getTime(),
        });
      });
    }
  } catch (err) {
    console.warn('Firestore fetch warning during build:', err);
  }

  // If Firestore returned 0 posts (e.g. before initial sync in advance-sandbox-gmzf6), preserve existing archive
  if (rawPosts.length === 0 && Array.isArray(existingSnapshot.posts)) {
    for (const item of existingSnapshot.posts) {
      const createdDate = item.createdAt
        ? new Date(item.createdAt)
        : new Date('2026-10-30T00:00:00.000Z');
      const updatedDate = item.updatedAt
        ? new Date(item.updatedAt)
        : createdDate;
      const cat = String(item.category || '').trim();
      const col = String(item.collection || '').trim();
      if (cat) discoveredCategories.add(cat);
      if (col) discoveredCollections.add(col);
      const imgs =
        Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : item.coverImage
          ? [item.coverImage]
          : [];
      rawPosts.push({
        id: String(item.id),
        title: String(item.title || 'Untitled Story'),
        rawSlug: String(item.slug || item.id),
        legacySlug: String(item.legacySlug || item.slug || item.id),
        excerpt: String(item.excerpt || ''),
        content: String(item.content || ''),
        category: cat,
        collection: col,
        coverImage: String(item.coverImage || imgs[0] || ''),
        images: imgs,
        authorEmail: String(item.authorEmail || 'chethiyabandara0001@gmail.com'),
        published: item.published !== false,
        createdAt: createdDate.toISOString(),
        updatedAt: updatedDate.toISOString(),
        createdTimeMs: createdDate.getTime(),
        updatedTimeMs: updatedDate.getTime(),
      });
    }
  }

  if (discoveredCategories.size === 0 && Array.isArray(existingSnapshot.categories)) {
    for (const c of existingSnapshot.categories) {
      const clean = String(c || '').trim();
      if (clean) discoveredCategories.add(clean);
    }
  }

  if (discoveredCollections.size === 0 && Array.isArray(existingSnapshot.collections)) {
    for (const c of existingSnapshot.collections) {
      const clean = String(c || '').trim();
      if (clean) discoveredCollections.add(clean);
    }
  }

  // Assign deterministic romanized slugs (oldest-first so slugs never shift)
  const usedSlugs = new Set();
  const ascPosts = [...rawPosts].sort((a, b) => a.createdTimeMs - b.createdTimeMs);
  const slugById = new Map();

  for (const post of ascPosts) {
    if (
      post.rawSlug &&
      !isOpaqueOrLegacySlug(post.rawSlug, post.id) &&
      !usedSlugs.has(post.rawSlug)
    ) {
      usedSlugs.add(post.rawSlug);
      slugById.set(post.id, post.rawSlug);
    } else {
      const computed = deduplicateSlug(post.title || post.id, usedSlugs, 60);
      slugById.set(post.id, computed);
    }
  }

  // Sort newest-first for archive display
  const sortedPosts = [...rawPosts]
    .sort((a, b) => b.createdTimeMs - a.createdTimeMs)
    .map((p) => {
      const slug = slugById.get(p.id) || toRomanizedSlug(p.title || p.id, 60);
      const categorySlug = p.category ? getTaxonomySlug(p.category) : '';
      const collectionSlug = p.collection ? getTaxonomySlug(p.collection) : '';
      return {
        id: p.id,
        title: p.title,
        slug,
        legacySlug: p.legacySlug,
        excerpt: p.excerpt,
        content: p.content,
        category: p.category,
        categorySlug,
        collection: p.collection,
        collectionSlug,
        coverImage: p.coverImage,
        images: p.images,
        authorEmail: p.authorEmail,
        published: p.published,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

  const sortedCategories = Array.from(discoveredCategories).sort();
  const sortedCollections = Array.from(discoveredCollections).sort();

  // Save prerenderedData.json for synchronous React hydration & SSR prerender
  const prerenderPayload = {
    generatedAt: new Date().toISOString(),
    categories: sortedCategories,
    collections: sortedCollections,
    posts: sortedPosts,
  };
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(prerenderPayload, null, 2), 'utf8');

  // Compute accurate per-row lastmod
  const latestPostLastmod =
    sortedPosts.length > 0
      ? sortedPosts
          .map((p) => p.updatedAt.split('T')[0])
          .sort()
          .reverse()[0]
      : defaultStaticLastmod;

  const staticEntries = [
    { loc: `${ORIGIN}/`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '1.0' },
    { loc: `${ORIGIN}/posts`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.9' },
    { loc: `${ORIGIN}/categories`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/collections`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${ORIGIN}/about`, lastmod: defaultStaticLastmod, changefreq: 'monthly', priority: '0.5' },
    { loc: `${ORIGIN}/contact`, lastmod: defaultStaticLastmod, changefreq: 'monthly', priority: '0.5' },
    { loc: `${ORIGIN}/privacy-policy`, lastmod: defaultStaticLastmod, changefreq: 'monthly', priority: '0.4' },
    {
      loc: `${ORIGIN}/terms-and-conditions`,
      lastmod: defaultStaticLastmod,
      changefreq: 'monthly',
      priority: '0.4',
    },
  ];

  const categoryEntries = sortedCategories.map((cat) => {
    const catSlug = getTaxonomySlug(cat);
    const catPosts = sortedPosts.filter((p) => p.category === cat);
    const catLastmod =
      catPosts.length > 0
        ? catPosts
            .map((p) => p.updatedAt.split('T')[0])
            .sort()
            .reverse()[0]
        : latestPostLastmod;
    return {
      loc: `${ORIGIN}/categories/${catSlug}`,
      lastmod: catLastmod,
      changefreq: 'daily',
      priority: '0.8',
    };
  });

  const collectionEntries = sortedCollections.map((col) => {
    const colSlug = getTaxonomySlug(col);
    const colPosts = sortedPosts.filter((p) => p.collection === col);
    const colLastmod =
      colPosts.length > 0
        ? colPosts
            .map((p) => p.updatedAt.split('T')[0])
            .sort()
            .reverse()[0]
        : latestPostLastmod;
    return {
      loc: `${ORIGIN}/collections/${colSlug}`,
      lastmod: colLastmod,
      changefreq: 'daily',
      priority: '0.8',
    };
  });

  const postEntries = sortedPosts.map((p) => ({
    loc: `${ORIGIN}/posts/${p.slug}`,
    lastmod: p.updatedAt.split('T')[0] || latestPostLastmod,
    changefreq: 'weekly',
    priority: '0.9',
  }));

  const allEntries = [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...postEntries,
  ];

  // Emit sitemap index if total URLs > 2,000, otherwise single urlset
  await fs.mkdir(publicDir, { recursive: true });
  if (allEntries.length > 2000) {
    const sitemapsDir = path.join(publicDir, 'sitemaps');
    await fs.mkdir(sitemapsDir, { recursive: true });

    const nonPostEntries = [...staticEntries, ...categoryEntries, ...collectionEntries];
    await fs.writeFile(
      path.join(sitemapsDir, 'pages.xml'),
      renderUrlsetXml(nonPostEntries),
      'utf8'
    );

    const sitemapIndexItems = [
      { loc: `${ORIGIN}/sitemaps/pages.xml`, lastmod: latestPostLastmod },
    ];

    const chunkSize = 2000;
    for (let i = 0; i < postEntries.length; i += chunkSize) {
      const shardNum = Math.floor(i / chunkSize) + 1;
      const chunk = postEntries.slice(i, i + chunkSize);
      const shardName = `posts-${shardNum}.xml`;
      await fs.writeFile(
        path.join(sitemapsDir, shardName),
        renderUrlsetXml(chunk),
        'utf8'
      );
      const shardLastmod = chunk
        .map((c) => c.lastmod)
        .sort()
        .reverse()[0];
      sitemapIndexItems.push({
        loc: `${ORIGIN}/sitemaps/${shardName}`,
        lastmod: shardLastmod || latestPostLastmod,
      });
    }

    await fs.writeFile(
      path.join(publicDir, 'sitemap.xml'),
      renderSitemapIndexXml(sitemapIndexItems),
      'utf8'
    );
  } else {
    await fs.writeFile(
      path.join(publicDir, 'sitemap.xml'),
      renderUrlsetXml(allEntries),
      'utf8'
    );
  }

  // Generate public/robots.txt
  const robots = buildRobotsTxt();
  await fs.writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

  // Generate public/_redirects for 301 legacy post/category/collection slugs
  const redirectLines = [
    '# 301 Redirects for legacy post IDs and percent-encoded Sinhala category/collection URLs',
  ];
  for (const p of sortedPosts) {
    if (p.id && p.id !== p.slug) {
      redirectLines.push(`/posts/${p.id} /posts/${p.slug} 301`);
    }
    if (p.legacySlug && p.legacySlug !== p.slug && p.legacySlug !== p.id) {
      redirectLines.push(`/posts/${p.legacySlug} /posts/${p.slug} 301`);
    }
  }
  for (const cat of sortedCategories) {
    const catSlug = getTaxonomySlug(cat);
    const encoded = encodeURIComponent(cat);
    if (encoded !== catSlug) {
      redirectLines.push(`/categories/${encoded} /categories/${catSlug} 301`);
    }
  }
  for (const col of sortedCollections) {
    const colSlug = getTaxonomySlug(col);
    const encoded = encodeURIComponent(col);
    if (encoded !== colSlug) {
      redirectLines.push(`/collections/${encoded} /collections/${colSlug} 301`);
    }
  }
  await fs.writeFile(
    path.join(publicDir, '_redirects'),
    `${redirectLines.join('\n')}\n`,
    'utf8'
  );

  console.log(
    `Prepared ${sortedPosts.length} posts, ${sortedCategories.length} categories, ${sortedCollections.length} collections, sitemap.xml (${allEntries.length} URLs), robots.txt, and _redirects.`
  );
}

generateSeoDataAndSitemap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to generate SEO data and sitemap:', err);
    process.exit(0);
  });
