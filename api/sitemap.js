import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ORIGIN = 'https://walkathawa.com';
const DEFAULT_STATIC_LASTMOD = '2026-10-30';
const CACHE_TTL_MS = 5 * 60 * 1000;
const LEGACY_SEED_POST_IDS = new Set([
  'seed-1',
  'seed-2',
  'seed-3',
  'seed-4',
  'seed-5',
  'seed-6',
]);

let cachedSitemap = {
  xml: '',
  expiresAt: 0,
};

export function invalidateSitemapCache() {
  cachedSitemap = { xml: '', expiresAt: 0 };
}

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

const SINHALA_INDEPENDENT_VOWELS = {
  අ: 'a', ආ: 'aa', ඇ: 'ae', ඈ: 'aae', ඉ: 'i', ඊ: 'ii', උ: 'u', ඌ: 'uu',
  ඍ: 'ri', ඎ: 'rii', ඏ: 'li', ඐ: 'lii', එ: 'e', ඒ: 'ee', ඓ: 'ai', ඔ: 'o', ඕ: 'oo', ඖ: 'au',
};

const SINHALA_CONSONANTS = {
  ක: 'k', ඛ: 'kh', ග: 'g', ඝ: 'gh', ඞ: 'ng', ඟ: 'nga', ච: 'ch', ඡ: 'chh', ჯ: 'j',
  ජ: 'j', ඣ: 'jh', ඤ: 'ny', ඥ: 'gn', ඦ: 'nja', ට: 't', ඨ: 'th', ඩ: 'd', ඪ: 'dh',
  ණ: 'n', ඬ: 'nda', ත: 'th', ථ: 'thh', ද: 'd', ධ: 'dh', න: 'n', ඳ: 'nda',
  ප: 'p', ඵ: 'ph', බ: 'b', භ: 'bh', ම: 'm', ඹ: 'mba', ය: 'y', ර: 'r', ල: 'l',
  ව: 'w', ශ: 'sh', ෂ: 'sh', ස: 's', හ: 'h', ළ: 'l', ෆ: 'f',
};

const SINHALA_VOWEL_SIGNS = {
  '\u0DCA': '', '\u0DCF': 'a', '\u0DD0': 'ae', '\u0DD1': 'aae', '\u0DD2': 'i',
  '\u0DD3': 'ii', '\u0DD4': 'u', '\u0DD6': 'uu', '\u0DD8': 'ri', '\u0DD9': 'e',
  '\u0DDA': 'ee', '\u0DDB': 'ai', '\u0DDC': 'o', '\u0DDD': 'oo', '\u0DDE': 'au',
  '\u0DDF': 'li', '\u0DF2': 'rii', '\u0DF3': 'lii',
};

const SINHALA_MISC_SIGNS = { '\u0D82': 'n', '\u0D83': 'h' };

const SINHALA_WORD_DICTIONARY = {
  අම්මාගේ: 'ammage', අම්මයි: 'ammai', අම්මා: 'amma', අම්ම: 'amma', පුතා: 'putha',
  පුතයි: 'puthai', අක්කාගේ: 'akkage', අක්කා: 'akka', අක්ක: 'akka', නංගිගේ: 'nangige',
  නංගි: 'nangi', නංගී: 'nangi', මල්ලි: 'malli', වයිෆ්ගේ: 'wifege', වයිෆ්: 'wife',
  බිරිඳ: 'birinda', තාත්තා: 'thaththa', තාත්ත: 'thaththa', දුව: 'duwa', පවුලේ: 'paule',
  සහෝදර: 'sahodara', සහෝදරී: 'sahodari', සමලිංගික: 'samalingika', වැඩිමහල්: 'wadimahal',
  බාල: 'bala', වෙනත්: 'wenath', සමග: 'samaga', අන්: 'an', අය: 'aya', හෝ: 'ho',
  මගේ: 'mage', කෙල්ල: 'kella', සිංහල: 'sinhala', වල්: 'wal', වැල: 'wela', කතා: 'katha',
  කතාව: 'kathawa', කොටස: 'kotasa', කොටස්: 'kotas', සියලුම: 'siyaluma', චිත්‍ර: 'chithra',
  අලුත්: 'aluth', රස: 'rasa', ගෙදර: 'gedara', එහා: 'eha', කැම්පස්: 'campus',
  ඇන්ටි: 'aunty', නැන්දා: 'nanda', මාමා: 'mama', සීයා: 'seeya', හොර: 'hora',
  ටීචර්: 'teacher', ස්පා: 'spa',
};

function romanizeSinhala(input) {
  if (!input) return '';
  let str = String(input)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  const sortedWords = Object.keys(SINHALA_WORD_DICTIONARY).sort(
    (a, b) => b.length - a.length
  );
  for (const siWord of sortedWords) {
    if (str.includes(siWord)) {
      str = str.split(siWord).join(` ${SINHALA_WORD_DICTIONARY[siWord]} `);
    }
  }
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

export function getTaxonomySlug(name) {
  const clean = String(name || '').trim();
  if (!clean) return 'all';
  const lower = clean.toLowerCase();
  if (KNOWN_TAXONOMY_SLUGS[lower]) return KNOWN_TAXONOMY_SLUGS[lower];
  const romanized = romanizeSinhala(clean)
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return romanized.slice(0, 60).replace(/-+$/g, '') || 'sinhala-wal-katha';
}

function toIsoDate(value, fallback = DEFAULT_STATIC_LASTMOD) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().split('T')[0];
}

function parseFirestoreField(field) {
  if (!field || typeof field !== 'object') return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('arrayValue' in field) {
    const vals = field.arrayValue?.values;
    return Array.isArray(vals) ? vals.map(parseFirestoreField) : [];
  }
  return undefined;
}

export function buildSitemapXmlFromDataset({
  posts = [],
  categories = [],
  collections = [],
  origin = ORIGIN,
}) {
  const publishedPosts = posts.filter((p) => p && p.published !== false && p.slug);
  const latestPostLastmod =
    publishedPosts.length > 0
      ? publishedPosts
          .map((p) => toIsoDate(p.updatedAt || p.createdAt, DEFAULT_STATIC_LASTMOD))
          .sort()
          .reverse()[0]
      : DEFAULT_STATIC_LASTMOD;

  const entries = [
    { loc: `${origin}/`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '1.0' },
    { loc: `${origin}/posts`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.9' },
    { loc: `${origin}/categories`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${origin}/collections`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${origin}/about`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${origin}/contact`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${origin}/privacy-policy`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.4' },
    { loc: `${origin}/terms-and-conditions`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.4' },
  ];

  const seenLocs = new Set(entries.map((e) => e.loc));

  const mergedCategories = Array.from(
    new Set([
      ...categories.map((c) => String(c || '').trim()).filter(Boolean),
      ...publishedPosts.map((p) => String(p.category || '').trim()).filter(Boolean),
    ])
  ).sort();

  for (const cat of mergedCategories) {
    const catSlug = getTaxonomySlug(cat);
    const loc = `${origin}/categories/${catSlug}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);
    const catPosts = publishedPosts.filter(
      (p) => String(p.category || '').trim().toLowerCase() === cat.toLowerCase()
    );
    const catLastmod =
      catPosts.length > 0
        ? catPosts
            .map((p) => toIsoDate(p.updatedAt || p.createdAt, DEFAULT_STATIC_LASTMOD))
            .sort()
            .reverse()[0]
        : latestPostLastmod;
    entries.push({ loc, lastmod: catLastmod, changefreq: 'daily', priority: '0.8' });
  }

  const mergedCollections = Array.from(
    new Set([
      ...collections.map((c) => String(c || '').trim()).filter(Boolean),
      ...publishedPosts.map((p) => String(p.collection || '').trim()).filter(Boolean),
    ])
  ).sort();

  for (const col of mergedCollections) {
    const colSlug = getTaxonomySlug(col);
    const loc = `${origin}/collections/${colSlug}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);
    const colPosts = publishedPosts.filter(
      (p) => String(p.collection || '').trim().toLowerCase() === col.toLowerCase()
    );
    const colLastmod =
      colPosts.length > 0
        ? colPosts
            .map((p) => toIsoDate(p.updatedAt || p.createdAt, DEFAULT_STATIC_LASTMOD))
            .sort()
            .reverse()[0]
        : latestPostLastmod;
    entries.push({ loc, lastmod: colLastmod, changefreq: 'daily', priority: '0.8' });
  }

  for (const post of publishedPosts) {
    const loc = `${origin}/posts/${post.slug}`;
    if (seenLocs.has(loc)) continue;
    seenLocs.add(loc);
    entries.push({
      loc,
      lastmod: toIsoDate(post.updatedAt || post.createdAt, latestPostLastmod),
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

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

export async function fetchLiveFirestoreSitemapData(firebaseConfig, fetchFn = fetch) {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey) return null;
  const dbId =
    firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId !== '(default)'
      ? firebaseConfig.firestoreDatabaseId
      : '(default)';

  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(dbId)}/documents`;
  const keyParam = `key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  const maskParams = [
    'slug',
    'title',
    'category',
    'collection',
    'published',
    'createdAt',
    'updatedAt',
  ]
    .map((f) => `mask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const [postsResp, taxResp] = await Promise.all([
      fetchFn(`${base}/posts?pageSize=300&${maskParams}&${keyParam}`, {
        signal: controller.signal,
      }),
      fetchFn(`${base}/settings/taxonomy?${keyParam}`, {
        signal: controller.signal,
      }).catch(() => null),
    ]);

    if (!postsResp || !postsResp.ok) {
      return null;
    }

    const allDocs = [];
    let pageJson = await postsResp.json();
    if (Array.isArray(pageJson.documents)) {
      allDocs.push(...pageJson.documents);
    }

    let pageLoops = 0;
    while (pageJson.nextPageToken && pageLoops < 10) {
      pageLoops++;
      const nextResp = await fetchFn(
        `${base}/posts?pageSize=300&pageToken=${encodeURIComponent(
          pageJson.nextPageToken
        )}&${maskParams}&${keyParam}`,
        { signal: controller.signal }
      );
      if (!nextResp.ok) break;
      pageJson = await nextResp.json();
      if (Array.isArray(pageJson.documents)) {
        allDocs.push(...pageJson.documents);
      }
    }

    let categories = [];
    let collections = [];
    let deletedPostIds = [];
    let initialArchiveSeeded = false;

    if (taxResp && taxResp.ok) {
      const taxJson = await taxResp.json();
      const fields = taxJson?.fields || {};
      const parsedCats = parseFirestoreField(fields.categories);
      const parsedCols = parseFirestoreField(fields.collections);
      const parsedDeleted = parseFirestoreField(fields.deletedPostIds);
      if (Array.isArray(parsedCats)) categories = parsedCats.filter(Boolean);
      if (Array.isArray(parsedCols)) collections = parsedCols.filter(Boolean);
      if (Array.isArray(parsedDeleted)) deletedPostIds = parsedDeleted.filter(Boolean);
      initialArchiveSeeded = Boolean(parseFirestoreField(fields.initialArchiveSeeded));
    }

    const posts = allDocs
      .map((docItem) => {
        const id = String(docItem.name || '').split('/').pop() || '';
        if (!id || LEGACY_SEED_POST_IDS.has(id)) return null;
        const fields = docItem.fields || {};
        const title = String(parseFirestoreField(fields.title) || '');
        const rawSlug = String(parseFirestoreField(fields.slug) || '').trim();
        const slug = rawSlug || getTaxonomySlug(title || id);
        const publishedRaw = parseFirestoreField(fields.published);
        return {
          id,
          slug,
          title,
          category: String(parseFirestoreField(fields.category) || '').trim(),
          collection: String(parseFirestoreField(fields.collection) || '').trim(),
          published: publishedRaw !== false,
          createdAt: parseFirestoreField(fields.createdAt) || docItem.createTime,
          updatedAt:
            parseFirestoreField(fields.updatedAt) ||
            docItem.updateTime ||
            parseFirestoreField(fields.createdAt),
        };
      })
      .filter(Boolean);

    return {
      posts,
      categories,
      collections,
      deletedPostIds,
      initialArchiveSeeded,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function buildSitemapXml({ fetchFn = fetch, bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && cachedSitemap.xml && cachedSitemap.expiresAt > now) {
    return cachedSitemap.xml;
  }

  let snapshot = { posts: [], categories: [], collections: [] };
  try {
    const rawSnapshot = await fs.readFile(
      path.resolve(__dirname, '../src/data/prerenderedData.json'),
      'utf8'
    );
    snapshot = JSON.parse(rawSnapshot);
  } catch {
    // ignore
  }

  try {
    const rawConfig = await fs.readFile(
      path.resolve(__dirname, '../firebase-applet-config.json'),
      'utf8'
    );
    const firebaseConfig = JSON.parse(rawConfig);
    const liveData = await fetchLiveFirestoreSitemapData(firebaseConfig, fetchFn);

    if (liveData) {
      const deletedSet = new Set(liveData.deletedPostIds || []);
      const liveIds = new Set(liveData.posts.map((p) => p.id));
      const liveSlugs = new Set(liveData.posts.map((p) => p.slug));
      const livePublished = liveData.posts.filter(
        (p) => p.published !== false && !deletedSet.has(p.id)
      );

      const mergedPosts = liveData.initialArchiveSeeded
        ? livePublished
        : [
            ...livePublished,
            ...(snapshot.posts || []).filter(
              (p) =>
                p.published !== false &&
                !deletedSet.has(p.id) &&
                !liveIds.has(p.id) &&
                !liveSlugs.has(p.slug)
            ),
          ];

      const xml = buildSitemapXmlFromDataset({
        posts: mergedPosts,
        categories: liveData.initialArchiveSeeded
          ? liveData.categories
          : [...(snapshot.categories || []), ...(liveData.categories || [])],
        collections: liveData.initialArchiveSeeded
          ? liveData.collections
          : [...(snapshot.collections || []), ...(liveData.collections || [])],
      });

      cachedSitemap = { xml, expiresAt: now + CACHE_TTL_MS };
      return xml;
    }
  } catch {
    // Fallback to static sitemap
  }

  const candidatePaths = [
    path.resolve(__dirname, '../dist/sitemap.xml'),
    path.resolve(__dirname, '../public/sitemap.xml'),
  ];

  for (const filePath of candidatePaths) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      if (content && (content.includes('<urlset') || content.includes('<sitemapindex'))) {
        cachedSitemap = { xml: content, expiresAt: now + CACHE_TTL_MS };
        return content;
      }
    } catch {
      // Try next path
    }
  }

  const fallbackXml = buildSitemapXmlFromDataset({
    posts: snapshot.posts || [],
    categories: snapshot.categories || [],
    collections: snapshot.collections || [],
  });
  cachedSitemap = { xml: fallbackXml, expiresAt: now + CACHE_TTL_MS };
  return fallbackXml;
}

export default async function handler(req, res) {
  const xml = await buildSitemapXml();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.status(200).send(xml);
}
