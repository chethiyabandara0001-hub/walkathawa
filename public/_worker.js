// Self-contained Cloudflare Workers / Pages entry point (dist/_worker.js)
// Zero external or relative imports so dist/ is 100% standalone.

const encoder = new TextEncoder();
const SITE_ORIGIN = 'https://walkathawa.com';
const CANONICAL_HOST = 'walkathawa.com';
const REDIRECT_SOURCE_HOSTS = new Set([
  'www.walkathawa.com',
  'walkathawa.site',
  'www.walkathawa.site',
]);
const DEFAULT_IMAGE = `${SITE_ORIGIN}/assets/aistudio/Untitled_Design_62137426.png`;
const DEFAULT_STATIC_LASTMOD = '2026-10-30';
const LEGACY_SEED_POST_IDS = new Set([
  'seed-1',
  'seed-2',
  'seed-3',
  'seed-4',
  'seed-5',
  'seed-6',
]);

// Populated at build time by scripts/inject-worker-env.mjs
const LEGACY_REDIRECTS = {};
const FIREBASE_PUBLIC_CONFIG = {};
const STATIC_ARCHIVE_INDEX = { categories: [], collections: [], posts: [] };

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /?s=

# Allow user-triggered AI search & browsing agents
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Agent
Allow: /

User-agent: MistralAI-User
Allow: /

User-agent: Kimi-User
Allow: /

User-agent: meta-externalfetcher
Allow: /

User-agent: FirecrawlAgent
Allow: /

# Disallow autonomous AI training crawlers & PerplexityBot
User-agent: PerplexityBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://walkathawa.com/sitemap.xml
`;

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
  ක: 'k', ඛ: 'kh', ග: 'g', ඝ: 'gh', ඞ: 'ng', ඟ: 'nga', ච: 'ch', ඡ: 'chh',
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
  let str = String(input).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
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

function getTaxonomySlug(name) {
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

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateSinhalaDescription(raw, maxChars = 155) {
  const clean = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'දිනපතා අලුත් සිංහල වල් කතා සහ වැල කතා කියවන්න. Read daily updated Sinhala Wal Katha and episodic stories on Wal Kathawa.';
  }
  if (clean.length <= maxChars) return clean;
  const budget = Math.max(10, maxChars - 1);
  let graphemes;
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('si', { granularity: 'grapheme' });
    graphemes = Array.from(segmenter.segment(clean), (s) => s.segment);
  } else {
    graphemes = Array.from(clean);
  }
  let acc = '';
  for (const g of graphemes) {
    if (acc.length + g.length > budget) break;
    acc += g;
  }
  const trimmed = acc.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  const boundarySafe =
    lastSpace > budget * 0.65 ? trimmed.slice(0, lastSpace).trim() : trimmed;
  return `${boundarySafe.replace(/[.,;!?—–-]+$/g, '')}…`;
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

function getFirestoreRestBase(env = {}) {
  const projectId = String(
    env.FIREBASE_PROJECT_ID || FIREBASE_PUBLIC_CONFIG.projectId || ''
  ).trim();
  const apiKey = String(
    env.FIREBASE_API_KEY || FIREBASE_PUBLIC_CONFIG.apiKey || ''
  ).trim();
  const dbIdRaw = String(
    env.FIREBASE_DATABASE_ID || FIREBASE_PUBLIC_CONFIG.firestoreDatabaseId || '(default)'
  ).trim();
  const dbId = dbIdRaw || '(default)';
  if (!projectId || !apiKey) return null;
  return {
    base: `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/${encodeURIComponent(dbId)}/documents`,
    keyParam: `key=${encodeURIComponent(apiKey)}`,
  };
}

function buildSitemapXmlFromDataset({ posts = [], categories = [], collections = [] }) {
  const publishedPosts = posts.filter((p) => p && p.published !== false && p.slug);
  const latestPostLastmod =
    publishedPosts.length > 0
      ? publishedPosts
          .map((p) => toIsoDate(p.updatedAt || p.createdAt, DEFAULT_STATIC_LASTMOD))
          .sort()
          .reverse()[0]
      : DEFAULT_STATIC_LASTMOD;

  const entries = [
    { loc: `${SITE_ORIGIN}/`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/posts`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_ORIGIN}/categories`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/collections`, lastmod: latestPostLastmod, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/about`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_ORIGIN}/contact`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_ORIGIN}/privacy-policy`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.4' },
    { loc: `${SITE_ORIGIN}/terms-and-conditions`, lastmod: DEFAULT_STATIC_LASTMOD, changefreq: 'monthly', priority: '0.4' },
  ];

  const seenLocs = new Set(entries.map((e) => e.loc));

  const mergedCategories = Array.from(
    new Set([
      ...categories.map((c) => String(c || '').trim()).filter(Boolean),
      ...publishedPosts.map((p) => String(p.category || '').trim()).filter(Boolean),
    ])
  ).sort();

  for (const cat of mergedCategories) {
    const loc = `${SITE_ORIGIN}/categories/${getTaxonomySlug(cat)}`;
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
    const loc = `${SITE_ORIGIN}/collections/${getTaxonomySlug(col)}`;
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
    const loc = `${SITE_ORIGIN}/posts/${post.slug}`;
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

async function fetchLiveFirestoreSitemap(env, fetchFn) {
  const fb = getFirestoreRestBase(env);
  if (!fb) return null;

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
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const [postsResp, taxResp] = await Promise.all([
      fetchFn(`${fb.base}/posts?pageSize=300&${maskParams}&${fb.keyParam}`, {
        signal: controller.signal,
      }),
      fetchFn(`${fb.base}/settings/taxonomy?${fb.keyParam}`, {
        signal: controller.signal,
      }).catch(() => null),
    ]);

    if (!postsResp || !postsResp.ok) return null;

    const allDocs = [];
    let pageJson = await postsResp.json();
    if (Array.isArray(pageJson.documents)) {
      allDocs.push(...pageJson.documents);
    }

    let pageLoops = 0;
    while (pageJson.nextPageToken && pageLoops < 10) {
      pageLoops++;
      const nextResp = await fetchFn(
        `${fb.base}/posts?pageSize=300&pageToken=${encodeURIComponent(
          pageJson.nextPageToken
        )}&${maskParams}&${fb.keyParam}`,
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

    const livePosts = allDocs
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

    const deletedSet = new Set(deletedPostIds);
    const liveIds = new Set(livePosts.map((p) => p.id));
    const liveSlugs = new Set(livePosts.map((p) => p.slug));
    const livePublished = livePosts.filter(
      (p) => p.published !== false && !deletedSet.has(p.id)
    );

    const mergedPosts = initialArchiveSeeded
      ? livePublished
      : [
          ...livePublished,
          ...(STATIC_ARCHIVE_INDEX.posts || []).filter(
            (p) =>
              p.published !== false &&
              !deletedSet.has(p.id) &&
              !liveIds.has(p.id) &&
              !liveSlugs.has(p.slug)
          ),
        ];

    return buildSitemapXmlFromDataset({
      posts: mergedPosts,
      categories: initialArchiveSeeded
        ? categories
        : [...(STATIC_ARCHIVE_INDEX.categories || []), ...categories],
      collections: initialArchiveSeeded
        ? collections
        : [...(STATIC_ARCHIVE_INDEX.collections || []), ...collections],
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDynamicFirestorePostBySlug(slug, env, fetchFn) {
  const fb = getFirestoreRestBase(env);
  if (!fb || !slug) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    // 1. Try direct document lookup by ID (new posts use postId = slug)
    const directResp = await fetchFn(
      `${fb.base}/posts/${encodeURIComponent(slug)}?${fb.keyParam}`,
      { signal: controller.signal }
    );
    let docObj = null;
    if (directResp && directResp.ok) {
      docObj = await directResp.json();
    } else {
      // 2. Fallback to structured query where slug == :slug
      const queryResp = await fetchFn(`${fb.base}:runQuery?${fb.keyParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'posts' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slug },
              },
            },
            limit: 1,
          },
        }),
      });
      if (queryResp && queryResp.ok) {
        const rows = await queryResp.json();
        if (Array.isArray(rows) && rows[0]?.document) {
          docObj = rows[0].document;
        }
      }
    }

    if (!docObj || !docObj.fields) return null;
    const fields = docObj.fields;
    if (parseFirestoreField(fields.published) === false) return null;

    const id = String(docObj.name || '').split('/').pop() || slug;
    const title = String(parseFirestoreField(fields.title) || '').trim();
    if (!title) return null;
    const postSlug = String(parseFirestoreField(fields.slug) || slug).trim();
    const content = String(parseFirestoreField(fields.content) || '').trim();
    const excerpt = String(parseFirestoreField(fields.excerpt) || '').trim();
    const category = String(parseFirestoreField(fields.category) || '').trim();
    const collectionName = String(parseFirestoreField(fields.collection) || '').trim();
    const images = parseFirestoreField(fields.images);
    const coverImage =
      String(parseFirestoreField(fields.coverImage) || '').trim() ||
      (Array.isArray(images) && images[0] ? String(images[0]) : DEFAULT_IMAGE);
    const createdAt =
      parseFirestoreField(fields.createdAt) ||
      docObj.createTime ||
      new Date().toISOString();
    const updatedAt =
      parseFirestoreField(fields.updatedAt) || docObj.updateTime || createdAt;

    return {
      id,
      slug: postSlug,
      title,
      excerpt,
      content,
      category,
      collection: collectionName,
      coverImage,
      createdAt,
      updatedAt,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function renderDynamicStoryHtml(shellHtml, post) {
  const canonicalUrl = `${SITE_ORIGIN}/posts/${post.slug}`;
  const title = `${post.title} | Wal Kathawa`;
  const primaryDesc = (post.excerpt || '').replace(/\s+/g, ' ').trim();
  const bodyDesc = (post.content || '').replace(/\s+/g, ' ').trim();
  const description = truncateSinhalaDescription(
    primaryDesc.length >= 40 ? primaryDesc : bodyDesc || primaryDesc || post.title,
    155
  );
  const ogImage = /^https?:\/\//i.test(post.coverImage)
    ? post.coverImage.replace(/^http:\/\//i, 'https://')
    : DEFAULT_IMAGE;
  const catLabel = post.category || 'වෙනත්';
  const catSlug = getTaxonomySlug(catLabel);
  const words = bodyDesc ? bodyDesc.split(/\s+/).filter(Boolean).length : 0;

  const jsonLdScripts = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: 'Wal Kathawa',
      url: `${SITE_ORIGIN}/`,
      logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 512, height: 512 },
      sameAs: [`${SITE_ORIGIN}/`],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_ORIGIN}/#website`,
      name: 'Wal Kathawa',
      alternateName: ['Sinhala Wal Katha', 'Wela Katha', 'සිංහල වල් කතා', 'walkathawa.com'],
      url: `${SITE_ORIGIN}/`,
      inLanguage: ['si-LK', 'en'],
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Stories', item: `${SITE_ORIGIN}/posts` },
        { '@type': 'ListItem', position: 3, name: catLabel, item: `${SITE_ORIGIN}/categories/${catSlug}` },
        { '@type': 'ListItem', position: 4, name: post.title, item: canonicalUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${canonicalUrl}#article`,
      headline: post.title,
      description,
      image: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 750 },
      datePublished: post.createdAt,
      dateModified: post.updatedAt || post.createdAt,
      author: { '@type': 'Person', name: 'Wal Kathawa Editorial', url: `${SITE_ORIGIN}/about` },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Wal Kathawa',
        url: `${SITE_ORIGIN}/`,
        logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 512, height: 512 },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      inLanguage: 'si-LK',
      articleSection: catLabel,
      ...(words > 0 ? { wordCount: words } : {}),
    },
  ]
    .map(
      (entity) =>
        `    <script type="application/ld+json" data-seo-jsonld="true" data-entity-type="${escapeHtmlAttr(
          entity['@type']
        )}">${JSON.stringify(entity)}</script>`
    )
    .join('\n');

  const paragraphsHtml = (post.content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtmlText(p)}</p>`)
    .join('\n');

  const rootContent = `<main><article><h1>${escapeHtmlText(post.title)}</h1><p>${escapeHtmlText(
    description
  )}</p><div>${paragraphsHtml}</div></article></main>`;

  let html = shellHtml;
  if (/<div id="root">[\s\S]*<\/div>\s*<\/body>/i.test(html)) {
    html = html.replace(
      /<div id="root">[\s\S]*<\/div>(\s*<\/body>)/i,
      `<div id="root">${rootContent}</div>$1`
    );
  } else {
    html = html.replace(
      /<div id="root">[\s\S]*?<\/div>(\s*<script)/i,
      `<div id="root">${rootContent}</div>$1`
    );
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`
  );
  html = html.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="si-LK"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="si-LK" href="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="article" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />`
  );
  html = html.replace(
    /\s*<!-- (?:Site-wide )?JSON-LD[\s\S]*?<!-- END Site-wide JSON-LD -->/i,
    `\n    <!-- JSON-LD Structured Data (One script per entity type) -->\n${jsonLdScripts}\n    <!-- END Site-wide JSON-LD -->`
  );

  return html;
}

async function sha256Hex(bytes) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    typeof message === 'string' ? encoder.encode(message) : message
  );
  return new Uint8Array(sig);
}

async function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const kSecret = encoder.encode(`AWS4${secretAccessKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getR2Config(env = {}) {
  const accountId = String(env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = String(env.R2_BUCKET_NAME || '').trim();
  let publicUrl = String(env.R2_PUBLIC_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
    publicUrl = `https://${publicUrl}`;
  }

  const nativeBucketBinding =
    env.R2_BUCKET || env.BUCKET || env.WALKATHAWA || null;

  const isConfigured = Boolean(
    nativeBucketBinding ||
      (accountId &&
        accessKeyId &&
        secretAccessKey &&
        bucketName &&
        !accountId.startsWith('YOUR_') &&
        !accessKeyId.startsWith('YOUR_') &&
        !secretAccessKey.startsWith('YOUR_'))
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    nativeBucketBinding,
    isConfigured,
  };
}

async function signedR2Request({
  method,
  objectKey,
  bodyBytes = new Uint8Array(0),
  contentType = '',
  cacheControl = '',
  config,
}) {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = config;
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const encodedKey = objectKey
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/');
  const canonicalUri = `/${encodeRfc3986(bucketName)}/${encodedKey}`;
  const canonicalQueryString = '';

  const payloadHash = await sha256Hex(bodyBytes);

  const headersToSign = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  if (contentType) headersToSign['content-type'] = contentType;
  if (cacheControl) headersToSign['cache-control'] = cacheControl;

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${String(headersToSign[k]).trim()}\n`)
    .join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(encoder.encode(canonicalRequest));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const sigBytes = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders = {
    Authorization: authorizationHeader,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (contentType) fetchHeaders['Content-Type'] = contentType;
  if (cacheControl) fetchHeaders['Cache-Control'] = cacheControl;

  const endpointUrl = `https://${host}${canonicalUri}`;

  return fetch(endpointUrl, {
    method,
    headers: fetchHeaders,
    body:
      method === 'GET' || method === 'HEAD' || method === 'DELETE'
        ? undefined
        : bodyBytes,
  });
}

function extractKeyFromUrlOrKey(input, publicUrl) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (trimmed.startsWith('posts/')) return trimmed;

  try {
    if (trimmed.includes('/api/r2?key=')) {
      const qs = trimmed.split('/api/r2?key=')[1];
      return decodeURIComponent(qs.split('&')[0]);
    }
    if (publicUrl && trimmed.startsWith(publicUrl)) {
      return trimmed.slice(publicUrl.length).replace(/^\/+/, '');
    }
    const parsed = new URL(trimmed);
    const pathClean = parsed.pathname.replace(/^\/+/, '');
    if (pathClean.startsWith('posts/')) {
      return decodeURIComponent(pathClean);
    }
  } catch {
    // ignore URL parse error
  }
  return '';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleR2Request(request, env) {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const config = getR2Config(env);

  if (method === 'GET') {
    const urlObj = new URL(request.url);
    const key = urlObj.searchParams.get('key') || '';

    if (!key) {
      return new Response(
        JSON.stringify({
          configured: config.isConfigured,
          bucket:
            config.bucketName ||
            (config.nativeBucketBinding ? 'bound-r2-bucket' : null),
          publicUrl: config.publicUrl || null,
          hasPublicUrl: Boolean(config.publicUrl),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({
          error:
            'Cloudflare R2 credentials are not configured in Cloudflare Workers environment variables.',
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.get === 'function'
      ) {
        const obj = await config.nativeBucketBinding.get(key);
        if (!obj) {
          return new Response('Image not found in R2', {
            status: 404,
            headers: corsHeaders,
          });
        }
        const headers = new Headers(corsHeaders);
        obj.writeHttpMetadata(headers);
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(obj.body, { status: 200, headers });
      }

      const r2Resp = await signedR2Request({
        method: 'GET',
        objectKey: key,
        config,
      });

      if (!r2Resp.ok) {
        return new Response('Image not found in R2', {
          status: r2Resp.status,
          headers: corsHeaders,
        });
      }

      const contentType = r2Resp.headers.get('content-type') || 'image/webp';
      return new Response(r2Resp.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Failed to fetch from R2',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (method === 'POST') {
    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({
          error:
            'Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not set.',
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      const body = await request.json();
      let {
        fileName = 'story.webp',
        contentType = 'image/webp',
        base64Data = '',
        sourceUrl = '',
        customKey = '',
      } = body;

      let bodyBytes;

      if (sourceUrl && /^https?:\/\//i.test(String(sourceUrl).trim())) {
        const cleanSourceUrl = String(sourceUrl).trim();
        if (config.publicUrl && cleanSourceUrl.startsWith(config.publicUrl)) {
          return new Response(
            JSON.stringify({
              url: cleanSourceUrl,
              key: extractKeyFromUrlOrKey(cleanSourceUrl, config.publicUrl),
            }),
            {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8',
              },
            }
          );
        }

        const remoteResp = await fetch(cleanSourceUrl);
        if (!remoteResp.ok) {
          throw new Error(
            `Failed to fetch remote image from URL (HTTP ${remoteResp.status}).`
          );
        }
        contentType =
          remoteResp.headers.get('content-type')?.split(';')[0].trim() ||
          'image/jpeg';
        const arrBuf = await remoteResp.arrayBuffer();
        bodyBytes = new Uint8Array(arrBuf);
      } else {
        const rawStr = String(base64Data || '');
        if (rawStr.startsWith('data:')) {
          const match = rawStr.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            contentType = match[1];
            bodyBytes = base64ToUint8Array(match[2]);
          }
        }
        if (!bodyBytes) {
          const cleanBase64 = rawStr.includes(',')
            ? rawStr.split(',')[1]
            : rawStr;
          if (!cleanBase64) {
            return new Response(
              JSON.stringify({ error: 'Missing image data.' }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json; charset=utf-8',
                },
              }
            );
          }
          bodyBytes = base64ToUint8Array(cleanBase64);
        }
      }

      const ext =
        contentType === 'image/jpeg'
          ? 'jpg'
          : contentType === 'image/png'
          ? 'png'
          : contentType === 'image/gif'
          ? 'gif'
          : 'webp';

      const safeBaseName =
        String(fileName)
          .replace(/\.[^/.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 60) || 'image';

      const randBytes = new Uint8Array(4);
      crypto.getRandomValues(randBytes);
      const uniqueSuffix = Array.from(randBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const objectKey = customKey
        ? String(customKey).replace(/^\/+/, '')
        : `posts/${Date.now()}-${uniqueSuffix}-${safeBaseName}.${ext}`;
      const cacheControl = 'public, max-age=31536000, immutable';

      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.put === 'function'
      ) {
        await config.nativeBucketBinding.put(objectKey, bodyBytes, {
          httpMetadata: {
            contentType,
            cacheControl,
          },
        });
      } else {
        const r2Resp = await signedR2Request({
          method: 'PUT',
          objectKey,
          bodyBytes,
          contentType,
          cacheControl,
          config,
        });

        if (!r2Resp.ok) {
          const errText = await r2Resp.text().catch(() => '');
          return new Response(
            JSON.stringify({
              error: `Cloudflare R2 upload failed (HTTP ${r2Resp.status}). ${errText.slice(
                0,
                200
              )}`,
            }),
            {
              status: 502,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8',
              },
            }
          );
        }
      }

      const imageUrl = config.publicUrl
        ? `${config.publicUrl}/${objectKey}`
        : `${SITE_ORIGIN}/api/r2?key=${encodeURIComponent(objectKey)}`;

      return new Response(
        JSON.stringify({
          url: imageUrl,
          key: objectKey,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to upload image to R2.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  }

  if (method === 'DELETE') {
    if (!config.isConfigured) {
      return new Response(
        JSON.stringify({ deleted: false, reason: 'R2 not configured' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    try {
      const body = await request.json();
      const targetKey = extractKeyFromUrlOrKey(
        body.key || body.url || '',
        config.publicUrl
      );

      if (!targetKey) {
        return new Response(
          JSON.stringify({ deleted: false, reason: 'Not an R2 object key' }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      if (
        config.nativeBucketBinding &&
        typeof config.nativeBucketBinding.delete === 'function'
      ) {
        await config.nativeBucketBinding.delete(targetKey);
        return new Response(
          JSON.stringify({ deleted: true, key: targetKey }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      const r2Resp = await signedR2Request({
        method: 'DELETE',
        objectKey: targetKey,
        config,
      });

      return new Response(
        JSON.stringify({
          deleted: r2Resp.ok || r2Resp.status === 204,
          key: targetKey,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to delete image from R2.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

function resolveCanonicalPath(rawPathname) {
  const cleanPathname =
    rawPathname === '/' ? '/' : rawPathname.replace(/\/+$/, '') || '/';
  let decodedPathname = cleanPathname;
  try {
    decodedPathname = decodeURIComponent(cleanPathname);
  } catch {
    // keep raw path if malformed encoding
  }
  const legacyTarget =
    LEGACY_REDIRECTS[cleanPathname] || LEGACY_REDIRECTS[decodedPathname];
  return legacyTarget || cleanPathname;
}

export default {
  async fetch(request, env = {}, ctx) {
    try {
      const fetchFn = typeof env.FETCH_FN === 'function' ? env.FETCH_FN : fetch;
      const edgeCache =
        typeof caches !== 'undefined' && caches && caches.default
          ? caches.default
          : null;
      const url = new URL(request.url);
      const hostname = url.hostname.toLowerCase();
      const pathname = url.pathname;
      const method = request.method.toUpperCase();

      // 1. Permanent 1-to-1 301 Redirects from old domains (walkathawa.site, www.walkathawa.site)
      //    and www.walkathawa.com -> https://walkathawa.com (single-hop, preserving exact path + query)
      if (REDIRECT_SOURCE_HOSTS.has(hostname)) {
        const finalPath = resolveCanonicalPath(pathname);
        const target = `${SITE_ORIGIN}${finalPath}${url.search}`;
        return Response.redirect(target, 301);
      }

      // 2. Cloudflare R2 API endpoint (/api/r2)
      if (pathname === '/api/r2' || pathname.startsWith('/api/r2/')) {
        return await handleR2Request(request, env);
      }

      // 3. Sitemap cache revalidation webhook (/api/sitemap-revalidate)
      if (pathname === '/api/sitemap-revalidate') {
        if (method === 'OPTIONS') {
          return new Response(null, { status: 200, headers: corsHeaders });
        }
        if (method !== 'POST') {
          return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
        if (edgeCache) {
          const cacheKey = new Request(`${SITE_ORIGIN}/sitemap.xml`, { method: 'GET' });
          await edgeCache.delete(cacheKey).catch(() => {});
        }
        if (env.CLOUDFLARE_DEPLOY_HOOK_URL) {
          const hookCall = fetchFn(env.CLOUDFLARE_DEPLOY_HOOK_URL, {
            method: 'POST',
          }).catch(() => {});
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(hookCall);
          }
        }
        return new Response(JSON.stringify({ ok: true, revalidated: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }

      // 4. Single-hop 301 canonicalization for trailing slashes & legacy redirects
      const hasTrailingSlash = pathname.length > 1 && pathname.endsWith('/');
      const cleanPathname =
        pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/';
      const resolvedPath = resolveCanonicalPath(pathname);

      if (hasTrailingSlash || resolvedPath !== cleanPathname) {
        const destUrl = new URL(`${resolvedPath}${url.search}`, url.origin).toString();
        return Response.redirect(destUrl, 301);
      }

      // 5. robots.txt
      if (cleanPathname === '/robots.txt') {
        const headers = {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'Access-Control-Allow-Origin': '*',
        };
        if (method === 'HEAD') {
          return new Response(null, { status: 200, headers });
        }
        return new Response(ROBOTS_TXT, { status: 200, headers });
      }

      // 6. Dynamic edge-cached /sitemap.xml synchronized with Firestore
      if (cleanPathname === '/sitemap.xml') {
        const cacheKey = new Request(`${SITE_ORIGIN}/sitemap.xml`, { method: 'GET' });
        if (edgeCache) {
          const cached = await edgeCache.match(cacheKey);
          if (cached) {
            if (method === 'HEAD') {
              return new Response(null, { status: 200, headers: cached.headers });
            }
            return cached;
          }
        }

        const xmlHeaders = {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Access-Control-Allow-Origin': '*',
        };

        let xmlBody = await fetchLiveFirestoreSitemap(env, fetchFn);
        if (!xmlBody && env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
          const staticResp = await env.ASSETS.fetch(
            new Request(new URL('/sitemap.xml', url.origin).toString())
          );
          if (staticResp && staticResp.ok) {
            xmlBody = await staticResp.text();
          }
        }
        if (!xmlBody) {
          xmlBody = buildSitemapXmlFromDataset(STATIC_ARCHIVE_INDEX);
        }

        const response = new Response(xmlBody, { status: 200, headers: xmlHeaders });
        if (edgeCache) {
          const putPromise = edgeCache.put(cacheKey, response.clone()).catch(() => {});
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(putPromise);
          } else {
            await putPromise;
          }
        }
        if (method === 'HEAD') {
          return new Response(null, { status: 200, headers: xmlHeaders });
        }
        return response;
      }

      // 7. Static assets & flat prerendered HTML via Cloudflare ASSETS binding
      if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        const hasFileExtension = /\.[a-z0-9]{2,8}$/i.test(cleanPathname);

        // Allow client-side /admin route to load SPA shell with 200 OK & noindex header
        if (cleanPathname === '/admin' || cleanPathname.startsWith('/admin/')) {
          const indexResp = await env.ASSETS.fetch(
            new Request(new URL('/index.html', url.origin).toString())
          );
          if (indexResp && indexResp.ok) {
            return new Response(method === 'HEAD' ? null : indexResp.body, {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                'X-Robots-Tag': 'noindex, nofollow',
              },
            });
          }
        }

        // Direct flat-file lookup for extensionless routes (/posts -> /posts.html, /posts/janu-akka -> /posts/janu-akka.html)
        if (!hasFileExtension) {
          const targetAssetPath =
            cleanPathname === '/' ? '/index.html' : `${cleanPathname}.html`;
          const htmlResp = await env.ASSETS.fetch(
            new Request(new URL(targetAssetPath, url.origin).toString())
          );
          if (htmlResp && htmlResp.status === 200) {
            const headers = new Headers(htmlResp.headers);
            headers.set('Content-Type', 'text/html; charset=utf-8');
            return new Response(method === 'HEAD' ? null : htmlResp.body, {
              status: 200,
              headers,
            });
          }
        } else {
          // Static files with extensions (/assets/*, /fonts/*, /sitemaps/*, etc.)
          const assetResponse = await env.ASSETS.fetch(request);
          if (assetResponse && assetResponse.status !== 404) {
            if (cleanPathname.startsWith('/sitemaps/')) {
              const xmlHeaders = new Headers(assetResponse.headers);
              xmlHeaders.set('Content-Type', 'application/xml; charset=utf-8');
              xmlHeaders.set('Cache-Control', 'public, max-age=300, s-maxage=300');
              return new Response(method === 'HEAD' ? null : assetResponse.body, {
                status: assetResponse.status,
                headers: xmlHeaders,
              });
            }
            return assetResponse;
          }
        }

        // 8. Dynamic SSR fallback for newly published Firestore stories not yet in static build
        if (cleanPathname.startsWith('/posts/')) {
          const slug = cleanPathname.slice('/posts/'.length);
          if (slug && !slug.includes('/')) {
            const dynamicPost = await fetchDynamicFirestorePostBySlug(slug, env, fetchFn);
            if (dynamicPost) {
              const shellResp = await env.ASSETS.fetch(
                new Request(new URL('/index.html', url.origin).toString())
              );
              if (shellResp && shellResp.ok) {
                const shellHtml = await shellResp.text();
                const rendered = renderDynamicStoryHtml(shellHtml, dynamicPost);
                const headers = {
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'public, max-age=60, s-maxage=300',
                };
                return new Response(method === 'HEAD' ? null : rendered, {
                  status: 200,
                  headers,
                });
              }
            }
          }
        }

        // 9. Genuine HTTP 404 with static 404.html for all unknown/deleted paths
        const notFoundResp = await env.ASSETS.fetch(
          new Request(new URL('/404.html', url.origin).toString())
        );
        if (notFoundResp && notFoundResp.ok) {
          const headers = {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Robots-Tag': 'noindex, follow',
          };
          if (method === 'HEAD') {
            return new Response(null, { status: 404, headers });
          }
          return new Response(notFoundResp.body, {
            status: 404,
            headers,
          });
        }
      }

      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, follow' },
      });
    } catch (err) {
      return new Response(
        `Internal Server Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }
  },
};
