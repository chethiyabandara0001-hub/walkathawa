import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SITE_ORIGIN,
  normalizeCanonicalUrl,
  truncateSinhalaDescription,
  buildStoryMetaDescription,
} from './seo.ts';
import {
  getTaxonomySlug,
  LEGACY_CATEGORY_SLUG_REDIRECTS,
  LEGACY_COLLECTION_SLUG_REDIRECTS,
} from './slugs.ts';
import {
  buildSitemapXml,
  invalidateSitemapCache,
  getTaxonomySlug as sitemapGetTaxonomySlug,
} from '../../api/sitemap.js';
import { buildRobotsTxt } from '../../api/robots.js';

const rootDir = path.resolve(import.meta.dirname, '../..');

test('SITE_ORIGIN and normalizeCanonicalUrl enforce https://walkathawa.com without trailing slashes', () => {
  assert.equal(SITE_ORIGIN, 'https://walkathawa.com');
  assert.equal(normalizeCanonicalUrl('/'), 'https://walkathawa.com/');
  assert.equal(normalizeCanonicalUrl(''), 'https://walkathawa.com/');
  assert.equal(
    normalizeCanonicalUrl('/posts/janu-akka/'),
    'https://walkathawa.com/posts/janu-akka'
  );
  assert.equal(
    normalizeCanonicalUrl('https://www.walkathawa.site/posts/janu-akka/'),
    'https://walkathawa.com/posts/janu-akka'
  );
  assert.equal(
    normalizeCanonicalUrl('https://www.walkathawa.com/categories/akka-malli/?page=2'),
    'https://walkathawa.com/categories/akka-malli'
  );
});

test('truncateSinhalaDescription and buildStoryMetaDescription stay <= 155 UTF-16 chars for all archived stories', async () => {
  const raw = await fs.readFile(
    path.join(rootDir, 'src/data/prerenderedData.json'),
    'utf8'
  );
  const data = JSON.parse(raw);
  assert.ok(Array.isArray(data.posts) && data.posts.length > 0);

  for (const post of data.posts) {
    const desc = buildStoryMetaDescription(post);
    assert.ok(
      desc.length > 20 && desc.length <= 155,
      `Description for "${post.slug}" has invalid length ${desc.length}: ${desc}`
    );
    assert.ok(
      !/[\u0DCA-\u0DDF\u0DF2-\u0DF3]…$/.test(desc) || desc.length <= 155,
      `Description for "${post.slug}" should stay within 155 chars`
    );
  }

  const longInput = 'අම්මාගේ ආදරය සහ පවුලේ රහස් කතා '.repeat(12);
  const truncated = truncateSinhalaDescription(longInput, 155);
  assert.ok(truncated.length <= 155, `Expected <=155 chars, got ${truncated.length}`);
  assert.ok(truncated.endsWith('…'));
});

test('Slug parity holds between src/lib/slugs.ts, api/sitemap.js, and prerenderedData.json', async () => {
  const raw = await fs.readFile(
    path.join(rootDir, 'src/data/prerenderedData.json'),
    'utf8'
  );
  const data = JSON.parse(raw);

  for (const cat of data.categories) {
    assert.equal(
      getTaxonomySlug(cat),
      sitemapGetTaxonomySlug(cat),
      `Category slug mismatch for "${cat}"`
    );
  }
  for (const col of data.collections) {
    assert.equal(
      getTaxonomySlug(col),
      sitemapGetTaxonomySlug(col),
      `Collection slug mismatch for "${col}"`
    );
  }
  for (const post of data.posts) {
    if (post.category && post.categorySlug) {
      assert.equal(getTaxonomySlug(post.category), post.categorySlug);
    }
    if (post.collection && post.collectionSlug) {
      assert.equal(getTaxonomySlug(post.collection), post.collectionSlug);
    }
  }

  // Verify the 5 previously mismatched legacy taxonomy slugs map to current canonical slugs
  assert.equal(LEGACY_CATEGORY_SLUG_REDIRECTS['iskole-mis'], 'iskolee-mis');
  assert.equal(LEGACY_CATEGORY_SLUG_REDIRECTS['mage-kalla'], 'mage-kaaella');
  assert.equal(LEGACY_COLLECTION_SLUG_REDIRECTS['amathithumee'], 'aemathithumii');
  assert.equal(LEGACY_COLLECTION_SLUG_REDIRECTS['nuwanige-sellam'], 'nuwanigee-sellam');
  assert.equal(
    LEGACY_COLLECTION_SLUG_REDIRECTS['wife-ge-nuwaraeliye-trip-eka'],
    'wife-ge-nuwaraeliyee-trip-eka'
  );
});

test('robots.txt references https://walkathawa.com/sitemap.xml and allows public pages', () => {
  const txt = buildRobotsTxt();
  assert.match(txt, /Sitemap:\s*https:\/\/walkathawa\.com\/sitemap\.xml/);
  assert.doesNotMatch(txt, /walkathawa\.site/);
  assert.match(txt, /Allow:\s*\//);
  assert.match(txt, /Disallow:\s*\/admin/);
});

test('Dynamic Firestore sitemap sync includes newly published stories and excludes unpublished/deleted stories', async () => {
  invalidateSitemapCache();

  const mockFetch = async (url: string) => {
    if (url.includes('/documents/posts')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          documents: [
            {
              name: 'projects/test/databases/(default)/documents/posts/aluth-kathawa-2026',
              fields: {
                title: { stringValue: 'අලුත් කතාව 2026' },
                slug: { stringValue: 'aluth-kathawa-2026' },
                category: { stringValue: 'අම්ම පුතා' },
                collection: { stringValue: '' },
                published: { booleanValue: true },
                createdAt: { timestampValue: '2026-11-18T10:00:00.000Z' },
                updatedAt: { timestampValue: '2026-11-19T12:00:00.000Z' },
              },
            },
            {
              name: 'projects/test/databases/(default)/documents/posts/draft-secret-story',
              fields: {
                title: { stringValue: 'Draft Story' },
                slug: { stringValue: 'draft-secret-story' },
                category: { stringValue: 'වෙනත්' },
                published: { booleanValue: false },
                createdAt: { timestampValue: '2026-11-19T12:00:00.000Z' },
                updatedAt: { timestampValue: '2026-11-19T12:00:00.000Z' },
              },
            },
          ],
        }),
      };
    }
    if (url.includes('/documents/settings/taxonomy')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          fields: {
            categories: { arrayValue: { values: [{ stringValue: 'අම්ම පුතා' }] } },
            collections: { arrayValue: { values: [] } },
            deletedPostIds: { arrayValue: { values: [{ stringValue: 'story-deleted-id' }] } },
            initialArchiveSeeded: { booleanValue: false },
          },
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  const xml = await buildSitemapXml({
    fetchFn: mockFetch as unknown as typeof fetch,
    bypassCache: true,
  });

  assert.ok(xml.includes('<loc>https://walkathawa.com/</loc>'));
  assert.ok(xml.includes('<loc>https://walkathawa.com/posts/aluth-kathawa-2026</loc>'));
  assert.ok(xml.includes('<lastmod>2026-11-19</lastmod>'));
  assert.ok(!xml.includes('draft-secret-story'), 'Unpublished draft must not be in sitemap');
  assert.ok(!xml.includes('/admin'), 'Admin route must not be in sitemap');
  assert.ok(!xml.includes('walkathawa.site'), 'No .site URLs allowed in sitemap');
  invalidateSitemapCache();
});

test('Compiled Cloudflare Worker (dist/_worker.js) handles redirects, flat HTML 200s, dynamic sitemap, dynamic SSR, and 404s', async () => {
  const distDir = path.join(rootDir, 'dist');
  const workerPath = path.join(distDir, '_worker.js');

  let workerExists = true;
  try {
    await fs.access(workerPath);
  } catch {
    workerExists = false;
  }
  if (!workerExists) {
    return; // Skip if dist/ has not been built yet
  }

  const workerMod = await import(pathToFileURL(workerPath).href);
  const worker = workerMod.default;

  const mockAssets = {
    async fetch(req: Request) {
      const u = new URL(req.url);
      const rel = u.pathname.replace(/^\/+/, '');
      const fullPath = path.join(distDir, rel);
      try {
        const body = await fs.readFile(fullPath);
        const ct = fullPath.endsWith('.xml')
          ? 'application/xml; charset=utf-8'
          : fullPath.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : 'application/octet-stream';
        return new Response(body, { status: 200, headers: { 'Content-Type': ct } });
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    },
  };

  const mockFirestoreFetch = async (url: string) => {
    if (url.includes('/documents/posts/live-new-story')) {
      return new Response(
        JSON.stringify({
          name: 'projects/test/databases/(default)/documents/posts/live-new-story',
          fields: {
            title: { stringValue: 'නව සිංහල කතාව' },
            slug: { stringValue: 'live-new-story' },
            excerpt: { stringValue: 'මෙය අලුතින් පළ කළ සිංහල කතාවකි.' },
            content: { stringValue: 'පළමු ඡේදය මෙහි ඇත.\n\nදෙවන ඡේදය මෙහි ඇත.' },
            category: { stringValue: 'අම්ම පුතා' },
            published: { booleanValue: true },
            createdAt: { timestampValue: '2026-11-19T08:00:00.000Z' },
            updatedAt: { timestampValue: '2026-11-19T08:00:00.000Z' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('/documents/posts?')) {
      return new Response(
        JSON.stringify({
          documents: [
            {
              name: 'projects/test/databases/(default)/documents/posts/live-new-story',
              fields: {
                title: { stringValue: 'නව සිංහල කතාව' },
                slug: { stringValue: 'live-new-story' },
                category: { stringValue: 'අම්ම පුතා' },
                published: { booleanValue: true },
                createdAt: { timestampValue: '2026-11-19T08:00:00.000Z' },
                updatedAt: { timestampValue: '2026-11-19T08:00:00.000Z' },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  const env = { ASSETS: mockAssets, FETCH_FN: mockFirestoreFetch };

  // 1. Old .site domain 1-to-1 single-hop 301 redirects
  const rSiteRoot = await worker.fetch(new Request('https://www.walkathawa.site/'), env);
  assert.equal(rSiteRoot.status, 301);
  assert.equal(rSiteRoot.headers.get('location'), 'https://walkathawa.com/');

  const rSiteStory = await worker.fetch(
    new Request('https://www.walkathawa.site/posts/janu-akka/'),
    env
  );
  assert.equal(rSiteStory.status, 301);
  assert.equal(
    rSiteStory.headers.get('location'),
    'https://walkathawa.com/posts/janu-akka'
  );

  const rSiteLegacyCat = await worker.fetch(
    new Request('https://walkathawa.site/categories/iskole-mis/'),
    env
  );
  assert.equal(rSiteLegacyCat.status, 301);
  assert.equal(
    rSiteLegacyCat.headers.get('location'),
    'https://walkathawa.com/categories/iskolee-mis'
  );

  // 2. Trailing slash removal on canonical host
  const rSlash = await worker.fetch(
    new Request('https://walkathawa.com/posts/janu-akka/'),
    env
  );
  assert.equal(rSlash.status, 301);
  assert.equal(rSlash.headers.get('location'), 'https://walkathawa.com/posts/janu-akka');

  // 3. Direct 200 OK on canonical flat-HTML pages (zero redirects!)
  for (const route of [
    '/',
    '/posts',
    '/categories',
    '/collections',
    '/categories/iskolee-mis',
    '/collections/aemathithumii',
    '/posts/janu-akka',
  ]) {
    const resp = await worker.fetch(new Request(`https://walkathawa.com${route}`), env);
    assert.equal(resp.status, 200, `Expected 200 for ${route}, got ${resp.status}`);
    const html = await resp.text();
    const expectedCanonical = `https://walkathawa.com${route}`;
    assert.ok(
      html.includes(`<link rel="canonical" href="${expectedCanonical}"`),
      `Missing exact canonical ${expectedCanonical} on ${route}`
    );
    assert.match(html, /<h1[\s>]/i, `Missing <h1> on ${route}`);
    assert.doesNotMatch(html, /ahuramazda\.org|brijmohan\.org/i);
    assert.doesNotMatch(html, /Page Not Found — පිටුව හමු නොවීය/);
  }

  // 4. Newly published Firestore story dynamically SSR'd with HTTP 200
  const rDynamic = await worker.fetch(
    new Request('https://walkathawa.com/posts/live-new-story'),
    env
  );
  assert.equal(rDynamic.status, 200);
  const dynamicHtml = await rDynamic.text();
  assert.ok(dynamicHtml.includes('<h1>නව සිංහල කතාව</h1>'));
  assert.ok(
    dynamicHtml.includes('<link rel="canonical" href="https://walkathawa.com/posts/live-new-story"')
  );
  assert.ok(dynamicHtml.includes('පළමු ඡේදය මෙහි ඇත.'));

  // 5. Nonexistent story returns genuine HTTP 404
  const r404 = await worker.fetch(
    new Request('https://walkathawa.com/posts/nonexistent-story-does-not-exist'),
    env
  );
  assert.equal(r404.status, 404);
  assert.equal(r404.headers.get('x-robots-tag'), 'noindex, follow');

  // 6. robots.txt & dynamic sitemap.xml
  const rRobots = await worker.fetch(new Request('https://walkathawa.com/robots.txt'), env);
  assert.equal(rRobots.status, 200);
  assert.ok((await rRobots.text()).includes('Sitemap: https://walkathawa.com/sitemap.xml'));

  const rSitemap = await worker.fetch(new Request('https://walkathawa.com/sitemap.xml'), env);
  assert.equal(rSitemap.status, 200);
  assert.match(rSitemap.headers.get('content-type') || '', /application\/xml/);
  const sitemapXml = await rSitemap.text();
  assert.ok(sitemapXml.includes('<loc>https://walkathawa.com/posts/live-new-story</loc>'));
  assert.ok(sitemapXml.includes('<loc>https://walkathawa.com/posts/janu-akka</loc>'));
  assert.ok(!sitemapXml.includes('walkathawa.site'));

  // 7. Sitemap revalidation webhook & /admin noindex
  const rReval = await worker.fetch(
    new Request('https://walkathawa.com/api/sitemap-revalidate', { method: 'POST' }),
    env
  );
  assert.equal(rReval.status, 200);

  const rAdmin = await worker.fetch(new Request('https://walkathawa.com/admin'), env);
  assert.equal(rAdmin.status, 200);
  assert.equal(rAdmin.headers.get('x-robots-tag'), 'noindex, nofollow');
});
