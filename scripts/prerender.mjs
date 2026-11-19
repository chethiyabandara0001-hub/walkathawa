import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { getTaxonomySlug } from '../api/sitemap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const ssrTempDir = path.resolve(rootDir, '.ssr-temp');
const ORIGIN = 'https://walkathawa.com';
const DEFAULT_IMAGE = `${ORIGIN}/assets/aistudio/Untitled_Design_62137426.png`;

function splitGraphemes(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('si', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(clean), (s) => s.segment);
  }
  return Array.from(clean);
}

function truncateSinhalaDescription(raw, maxChars = 155) {
  const clean = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'දිනපතා අලුත් සිංහල වල් කතා සහ වැල කතා කියවන්න. Read daily updated Sinhala Wal Katha and episodic stories on Wal Kathawa.';
  }
  if (clean.length <= maxChars) {
    return clean;
  }
  const budget = Math.max(10, maxChars - 1);
  const graphemes = splitGraphemes(clean);
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

function buildStoryMetaDescription(post) {
  const primary = String(post.excerpt || '').replace(/\s+/g, ' ').trim();
  const body = String(post.content || '').replace(/\s+/g, ' ').trim();
  const source = primary.length >= 40 ? primary : body || primary;
  if (source) {
    return truncateSinhalaDescription(source, 155);
  }
  const catPrefix = post.category ? `${post.category} — ` : '';
  return truncateSinhalaDescription(
    `${post.title} | ${catPrefix}සිංහල වල් කතා කියවන්න Wal Kathawa හිදී.`,
    155
  );
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

function resolveHttpsImage(img) {
  if (!img) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(img)) {
    return img.replace(/^http:\/\//i, 'https://');
  }
  return `${ORIGIN}${img.startsWith('/') ? img : `/${img}`}`;
}

function buildSiteWideJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${ORIGIN}/#organization`,
      name: 'Wal Kathawa',
      url: `${ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE,
        width: 512,
        height: 512,
      },
      sameAs: [`${ORIGIN}/`],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      name: 'Wal Kathawa',
      alternateName: [
        'Sinhala Wal Katha',
        'Wela Katha',
        'සිංහල වල් කතා',
        'walkathawa.com',
        'www.walkathawa.com',
      ],
      url: `${ORIGIN}/`,
      inLanguage: ['si-LK', 'en'],
      publisher: {
        '@id': `${ORIGIN}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${ORIGIN}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

function buildBreadcrumbJsonLd(breadcrumbs, canonicalUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.label,
      item: crumb.href ? `${ORIGIN}${crumb.href}` : canonicalUrl,
    })),
  };
}

function buildBlogPostingJsonLd(post, description, canonicalUrl) {
  const imageUrl = resolveHttpsImage(post.coverImage);
  const words = String(post.content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    headline: post.title,
    description,
    image: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: 1200,
      height: 750,
    },
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Person',
      name: 'Wal Kathawa Editorial',
      url: `${ORIGIN}/about`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${ORIGIN}/#organization`,
      name: 'Wal Kathawa',
      url: `${ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    inLanguage: 'si-LK',
    articleSection: post.category || 'Sinhala Wal Katha',
    ...(words > 0 ? { wordCount: words } : {}),
  };
}

function buildCollectionPageJsonLd(name, description, canonicalUrl, memberPosts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${canonicalUrl}#collectionpage`,
    url: canonicalUrl,
    name,
    description,
    inLanguage: 'si-LK',
    isPartOf: {
      '@id': `${ORIGIN}/#website`,
    },
    hasPart: memberPosts.slice(0, 30).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${ORIGIN}/posts/${p.slug}`,
      datePublished: p.createdAt,
    })),
  };
}

function injectHeadAndRootHtml(templateHtml, rootHtml, meta) {
  const canonicalUrl =
    meta.canonicalPath === '/'
      ? `${ORIGIN}/`
      : `${ORIGIN}${meta.canonicalPath.replace(/\/+$/, '')}`;
  const ogImage = resolveHttpsImage(meta.image);
  const robotsContent = meta.noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  let html = templateHtml;

  // Replace #root inner HTML
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${rootHtml}</div>`
  );

  // Replace <title>
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtmlText(meta.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(meta.description)}" />`
  );

  // Replace meta robots
  html = html.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${escapeHtmlAttr(robotsContent)}" />`
  );

  // Replace canonical & hreflang links
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

  // Replace Open Graph tags
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${escapeHtmlAttr(meta.type || 'website')}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />`
  );

  // Inject article-specific meta tags if og:type === 'article'
  let articleMetaHtml = '';
  if (meta.type === 'article') {
    if (meta.publishedTime) {
      articleMetaHtml += `\n    <meta property="article:published_time" content="${escapeHtmlAttr(
        meta.publishedTime
      )}" />`;
    }
    if (meta.modifiedTime) {
      articleMetaHtml += `\n    <meta property="article:modified_time" content="${escapeHtmlAttr(
        meta.modifiedTime
      )}" />`;
    }
    if (meta.section) {
      articleMetaHtml += `\n    <meta property="article:section" content="${escapeHtmlAttr(
        meta.section
      )}" />`;
    }
  }
  if (articleMetaHtml) {
    html = html.replace(
      /(<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>)/i,
      `$1${articleMetaHtml}`
    );
  }

  // Replace JSON-LD scripts (one script tag per entity type, no duplicates)
  const allJsonLdEntities = [...buildSiteWideJsonLd(), ...(meta.jsonLdEntities || [])];
  const jsonLdScriptsHtml = allJsonLdEntities
    .map((entity) => {
      const eType = String(entity['@type'] || 'Thing');
      return `    <script type="application/ld+json" data-seo-jsonld="true" data-entity-type="${escapeHtmlAttr(
        eType
      )}">${JSON.stringify(entity)}</script>`;
    })
    .join('\n');

  html = html.replace(
    /\s*<!-- Site-wide JSON-LD[\s\S]*?<!-- END Site-wide JSON-LD -->/i,
    `\n    <!-- JSON-LD Structured Data (One script per entity type) -->\n${jsonLdScriptsHtml}\n    <!-- END Site-wide JSON-LD -->`
  );

  return html;
}

async function writeRouteHtml(routePath, htmlContent) {
  if (routePath === '/') {
    await fs.writeFile(path.join(distDir, 'index.html'), htmlContent, 'utf8');
    return;
  }
  if (routePath === '/404.html') {
    await fs.writeFile(path.join(distDir, '404.html'), htmlContent, 'utf8');
    return;
  }
  // Write flat .html files (e.g. dist/posts.html, dist/posts/janu-akka.html)
  // so non-trailing-slash URLs serve HTTP 200 directly without 308 trailing-slash redirects.
  const cleanRel = routePath.replace(/^\/+|\/+$/g, '');
  const targetFile = path.join(distDir, `${cleanRel}.html`);
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.writeFile(targetFile, htmlContent, 'utf8');
}

async function bundleSsrEntry() {
  await fs.mkdir(ssrTempDir, { recursive: true });
  const outfile = path.join(ssrTempDir, 'entry-server.mjs');
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/entry-server.tsx')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile,
    jsx: 'automatic',
    logLevel: 'silent',
    packages: 'external',
  });
  return outfile;
}

async function runPrerender() {
  const templateHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
  const rawData = await fs.readFile(
    path.join(rootDir, 'src/data/prerenderedData.json'),
    'utf8'
  );
  const seoData = JSON.parse(rawData);
  const posts = Array.isArray(seoData.posts) ? seoData.posts : [];
  const categories = Array.isArray(seoData.categories) ? seoData.categories : [];
  const collections = Array.isArray(seoData.collections) ? seoData.collections : [];

  const ssrOutfile = await bundleSsrEntry();
  const ssrEntryUrl = pathToFileURL(ssrOutfile).href;
  const { renderRouteHtml } = await import(ssrEntryUrl);

  const routesToPrerender = [];

  // 1. Homepage (/)
  const homeDesc = truncateSinhalaDescription(
    'දිනපතා අලුත් වන සිංහල වල් කතා, වැල කතා සහ කතා මාලා කියවන්න. Read the latest Sinhala Wal Katha & Wela Katha daily on Wal Kathawa.',
    155
  );
  routesToPrerender.push({
    url: '/',
    output: '/',
    meta: {
      title: 'Sinhala Wal Katha – Aluth Wela Katha Daily | Wal Kathawa',
      description: homeDesc,
      canonicalPath: '/',
      type: 'website',
      jsonLdEntities: [
        buildCollectionPageJsonLd(
          'Sinhala Wal Katha — සිංහල වල් කතා සහ අලුත් වැල කතා',
          homeDesc,
          `${ORIGIN}/`,
          posts
        ),
      ],
    },
  });

  // 2. All Stories (/posts)
  const postsDesc = truncateSinhalaDescription(
    'සියලුම සිංහල වල් කතා සහ අලුත් වැල කතා එකතුව. Browse the complete archive of Sinhala Wal Katha, Wela Katha, and serialized stories on Wal Kathawa.',
    155
  );
  routesToPrerender.push({
    url: '/posts',
    output: '/posts',
    meta: {
      title: 'All Sinhala Wal Katha Stories | Wal Kathawa',
      description: postsDesc,
      canonicalPath: '/posts',
      type: 'website',
      jsonLdEntities: [
        buildBreadcrumbJsonLd(
          [
            { label: 'Home', href: '/' },
            { label: 'Stories', href: '/posts' },
          ],
          `${ORIGIN}/posts`
        ),
        buildCollectionPageJsonLd(
          'All Sinhala Wal Katha Stories — සියලුම සිංහල වල් කතා',
          postsDesc,
          `${ORIGIN}/posts`,
          posts
        ),
      ],
    },
  });

  // 3. Categories Index (/categories)
  const catsDesc = truncateSinhalaDescription(
    'සිංහල වල් කතා සහ වැල කතා වර්ගීකරණ (Categories). Browse all Sinhala Wal Katha categories on Wal Kathawa.',
    155
  );
  routesToPrerender.push({
    url: '/categories',
    output: '/categories',
    meta: {
      title: 'Sinhala Wal Katha Categories – කතා වර්ගීකරණ | Wal Kathawa',
      description: catsDesc,
      canonicalPath: '/categories',
      type: 'website',
      jsonLdEntities: [
        buildBreadcrumbJsonLd(
          [
            { label: 'Home', href: '/' },
            { label: 'Categories', href: '/categories' },
          ],
          `${ORIGIN}/categories`
        ),
        buildCollectionPageJsonLd(
          'Sinhala Wal Katha Categories — කතා වර්ගීකරණ',
          catsDesc,
          `${ORIGIN}/categories`,
          posts
        ),
      ],
    },
  });

  // 4. Collections Index (/collections)
  const colsDesc = truncateSinhalaDescription(
    'සියලුම සිංහල වල් කතා එකතු (Collections) කියවන්න. Browse all multi-part Sinhala Wal Katha & Wela Katha series on Wal Kathawa.',
    155
  );
  routesToPrerender.push({
    url: '/collections',
    output: '/collections',
    meta: {
      title: 'Sinhala Wal Katha Collections – කතා එකතු | Wal Kathawa',
      description: colsDesc,
      canonicalPath: '/collections',
      type: 'website',
      jsonLdEntities: [
        buildBreadcrumbJsonLd(
          [
            { label: 'Home', href: '/' },
            { label: 'Collections', href: '/collections' },
          ],
          `${ORIGIN}/collections`
        ),
        buildCollectionPageJsonLd(
          'Sinhala Wal Katha Collections — කතා එකතු',
          colsDesc,
          `${ORIGIN}/collections`,
          posts
        ),
      ],
    },
  });

  // 5. Static Legal & Editorial Pages (/privacy-policy, /terms-and-conditions, /about, /contact, /search, /404.html)
  routesToPrerender.push(
    {
      url: '/privacy-policy',
      output: '/privacy-policy',
      meta: {
        title: 'Privacy Policy | Wal Kathawa',
        description: truncateSinhalaDescription(
          'Privacy Policy for Wal Kathawa (walkathawa.com) covering data storage, cookies, reader comments, and Firebase security.',
          155
        ),
        canonicalPath: '/privacy-policy',
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Privacy Policy', href: '/privacy-policy' },
            ],
            `${ORIGIN}/privacy-policy`
          ),
        ],
      },
    },
    {
      url: '/terms-and-conditions',
      output: '/terms-and-conditions',
      meta: {
        title: 'Terms and Conditions | Wal Kathawa',
        description: truncateSinhalaDescription(
          'Terms and Conditions governing the use of Wal Kathawa (walkathawa.com), intellectual property, adult content rules, and reader comments.',
          155
        ),
        canonicalPath: '/terms-and-conditions',
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Terms and Conditions', href: '/terms-and-conditions' },
            ],
            `${ORIGIN}/terms-and-conditions`
          ),
        ],
      },
    },
    {
      url: '/about',
      output: '/about',
      meta: {
        title: 'About Wal Kathawa – Sinhala Story Archive | Wal Kathawa',
        description: truncateSinhalaDescription(
          'Learn about Wal Kathawa (walkathawa.com), Sri Lanka’s digital library for Sinhala Wal Katha, Wela Katha, and serialized Sinhala fiction.',
          155
        ),
        canonicalPath: '/about',
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
            ],
            `${ORIGIN}/about`
          ),
        ],
      },
    },
    {
      url: '/contact',
      output: '/contact',
      meta: {
        title: 'Contact Us – Wal Kathawa Editorial Team | Wal Kathawa',
        description: truncateSinhalaDescription(
          'Contact the Wal Kathawa (walkathawa.com) editorial and moderation team for story submissions, copyright inquiries, or feedback.',
          155
        ),
        canonicalPath: '/contact',
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Contact', href: '/contact' },
            ],
            `${ORIGIN}/contact`
          ),
        ],
      },
    },
    {
      url: '/search',
      output: '/search',
      meta: {
        title: 'Search Sinhala Wal Katha Stories | Wal Kathawa',
        description: truncateSinhalaDescription(
          'සිංහල වල් කතා සහ අලුත් වැල කතා සොයන්න. Search the Wal Kathawa Sinhala story archive by title, category, or collection.',
          155
        ),
        canonicalPath: '/search',
        type: 'website',
        noindex: true,
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Search', href: '/search' },
            ],
            `${ORIGIN}/search`
          ),
        ],
      },
    },
    {
      url: '/404-not-found',
      output: '/404.html',
      meta: {
        title: 'Page Not Found (404) | Wal Kathawa',
        description: truncateSinhalaDescription(
          'සොයන ලද පිටුව හමු නොවීය (404 Page Not Found). Return to Wal Kathawa to read the latest Sinhala Wal Katha and Wela Katha stories.',
          155
        ),
        canonicalPath: '/404',
        type: 'website',
        noindex: true,
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: '404 Not Found' },
            ],
            `${ORIGIN}/404`
          ),
        ],
      },
    }
  );

  // 6. Every Category Slug (/categories/:slug)
  const categorySlugMap = new Map();
  for (const p of posts) {
    if (p.category && p.categorySlug) {
      categorySlugMap.set(p.category, p.categorySlug);
    }
  }
  const KNOWN_TAX = {
    'අම්ම පුතා': 'amma-putha',
    'වයිෆ් හෝ gf': 'wife-ho-gf',
    'සහෝදර/සහෝදරී': 'sahodara-sahodari',
    'තාත්ත දුව': 'thaththa-duwa',
    'පවුලේ අන් අය සමග': 'pawule-an-aya-samaga',
    'සම ලිංගික': 'sama-lingika',
    'වැඩිමහල් බාල': 'wadimahal-bala',
    'වෙනත්': 'wenath',
  };
  for (const cat of categories) {
    const catSlug = categorySlugMap.get(cat) || getTaxonomySlug(cat);
    const catPath = `/categories/${catSlug}`;
    const catPosts = posts.filter(
      (p) => p.category && p.category.toLowerCase() === cat.toLowerCase()
    );
    const catDesc = truncateSinhalaDescription(
      `${cat} සිංහල වල් කතා සහ අලුත්ම වැල කතා එකතුව. Read the latest ${cat} Sinhala Wal Katha and Wela Katha stories on Wal Kathawa.`,
      155
    );
    routesToPrerender.push({
      url: catPath,
      output: catPath,
      meta: {
        title: `${cat} Wal Katha | Wal Kathawa`,
        description: catDesc,
        canonicalPath: catPath,
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Categories', href: '/categories' },
              { label: cat, href: catPath },
            ],
            `${ORIGIN}${catPath}`
          ),
          buildCollectionPageJsonLd(
            `${cat} Wal Katha — සිංහල වල් කතා`,
            catDesc,
            `${ORIGIN}${catPath}`,
            catPosts
          ),
        ],
      },
    });
  }

  // 7. Every Collection Slug (/collections/:slug)
  const collectionSlugMap = new Map();
  for (const p of posts) {
    if (p.collection && p.collectionSlug) {
      collectionSlugMap.set(p.collection, p.collectionSlug);
    }
  }
  for (const col of collections) {
    const colSlug = collectionSlugMap.get(col) || getTaxonomySlug(col);
    const colPath = `/collections/${colSlug}`;
    const colPosts = posts.filter(
      (p) => p.collection && p.collection.toLowerCase() === col.toLowerCase()
    );
    const colDesc = truncateSinhalaDescription(
      `${col} සියලුම කොටස් කියවන්න. Read all episodes of ${col} Sinhala Wal Katha series on Wal Kathawa.`,
      155
    );
    routesToPrerender.push({
      url: colPath,
      output: colPath,
      meta: {
        title: `${col} Wal Katha | Wal Kathawa`,
        description: colDesc,
        canonicalPath: colPath,
        type: 'website',
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Collections', href: '/collections' },
              { label: col, href: colPath },
            ],
            `${ORIGIN}${colPath}`
          ),
          buildCollectionPageJsonLd(
            `${col} Wal Katha — සියලුම කොටස්`,
            colDesc,
            `${ORIGIN}${colPath}`,
            colPosts
          ),
        ],
      },
    });
  }

  // 8. Every Post Slug (/posts/:slug)
  for (const post of posts) {
    const postPath = `/posts/${post.slug}`;
    const postDesc = buildStoryMetaDescription(post);
    const catLabel = post.category || 'වෙනත්';
    const catSlug = post.categorySlug || getTaxonomySlug(catLabel);

    routesToPrerender.push({
      url: postPath,
      output: postPath,
      meta: {
        title: `${post.title} | Wal Kathawa`,
        description: postDesc,
        canonicalPath: postPath,
        type: 'article',
        image: post.coverImage,
        publishedTime: post.createdAt,
        modifiedTime: post.updatedAt || post.createdAt,
        section: catLabel,
        jsonLdEntities: [
          buildBreadcrumbJsonLd(
            [
              { label: 'Home', href: '/' },
              { label: 'Stories', href: '/posts' },
              { label: catLabel, href: `/categories/${catSlug}` },
              { label: post.title, href: postPath },
            ],
            `${ORIGIN}${postPath}`
          ),
          buildBlogPostingJsonLd(post, postDesc, `${ORIGIN}${postPath}`),
        ],
      },
    });
  }

  // Render and write each route
  let renderedCount = 0;
  for (const item of routesToPrerender) {
    const rootHtml = renderRouteHtml(item.url);
    const fullHtml = injectHeadAndRootHtml(templateHtml, rootHtml, item.meta);
    await writeRouteHtml(item.output, fullHtml);
    renderedCount++;
  }

  // Clean up .ssr-temp
  await fs.rm(ssrTempDir, { recursive: true, force: true });

  console.log(`Prerendered ${renderedCount} static HTML routes into dist/.`);
}

runPrerender().catch((err) => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
