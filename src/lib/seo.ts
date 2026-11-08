import { useEffect } from 'react';
import { BreadcrumbItem } from '../types';

export const SITE_ORIGIN = 'https://walkathawa.com';
export const SITE_NAME = 'Wal Kathawa';
export const DEFAULT_HOMEPAGE_TITLE =
  'Sinhala Wal Katha – Aluth Wela Katha Daily | Wal Kathawa';
export const DEFAULT_HOMEPAGE_DESCRIPTION =
  '2026 අලුත්ම සිංහල වල් කතා, සිංහල වැල කතා, අම්මා වල් කතා සහ පවුලේ කතා දිනපතා කියවන්න. Read new Sinhala Wal Katha and Wela Katha stories on Wal Kathawa.';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/aistudio/Untitled_Design_62137426.png`;

export interface BreadcrumbEntry extends BreadcrumbItem {
  name?: string;
  path?: string;
}

export interface UseSeoOptions {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  noindex?: boolean;
  breadcrumbs?: BreadcrumbEntry[];
  jsonLdEntities?: Record<string, unknown>[];
}

/**
 * Splits a string into Unicode grapheme clusters using Intl.Segmenter so Sinhala
 * combining vowel signs (ා, ැ, ි, ු, ෙ, ්, ZWJ) are never split mid-character.
 */
export function splitGraphemes(text: string): string[] {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('si', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(clean), (s) => s.segment);
  }
  return Array.from(clean);
}

/**
 * Sinhala-safe truncation to 150–160 characters (default target 155 graphemes) with an ellipsis.
 * Never splits a Sinhala grapheme cluster and never returns an empty description.
 */
export function truncateSinhalaDescription(
  rawText?: string,
  fallbackOrMax: string | number = DEFAULT_HOMEPAGE_DESCRIPTION,
  maxGraphemes = 155
): string {
  const limit =
    typeof fallbackOrMax === 'number' ? fallbackOrMax : maxGraphemes;
  const fallback =
    typeof fallbackOrMax === 'string'
      ? fallbackOrMax
      : DEFAULT_HOMEPAGE_DESCRIPTION;

  const source = String(rawText || '')
    .replace(/#+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const effectiveText = source.length >= 20 ? source : fallback;
  const graphemes = splitGraphemes(effectiveText);

  if (graphemes.length <= limit) {
    return graphemes.join('');
  }

  const sliced = graphemes.slice(0, limit).join('');
  const lastSpace = sliced.lastIndexOf(' ');
  if (lastSpace >= 120) {
    return `${sliced.slice(0, lastSpace).replace(/[.,;:!?-]+$/, '')}…`;
  }
  return `${sliced.replace(/[.,;:!?-]+$/, '')}…`;
}

/**
 * Normalizes a pathname or URL into a self-referencing canonical URL.
 * Strips query string and hash, and enforces no trailing slash except "/".
 */
export function normalizeCanonicalUrl(
  pathOrUrl?: string,
  origin: string = SITE_ORIGIN
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');

  let pathname = '/';
  if (pathOrUrl) {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      try {
        const parsed = new URL(pathOrUrl);
        pathname = parsed.pathname;
      } catch {
        pathname = pathOrUrl;
      }
    } else {
      pathname = pathOrUrl.split('?')[0].split('#')[0];
    }
  } else if (typeof window !== 'undefined') {
    pathname = window.location.pathname;
  }

  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, '');
  }

  return `${cleanOrigin}${pathname}`;
}

/**
 * Builds the site-wide Organization and WebSite JSON-LD entities.
 * SearchAction points to /search?q={search_term_string} to avoid conflicting with Disallow: /?s= in robots.txt.
 */
export function buildSiteWideJsonLd(): Record<string, unknown>[] {
  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_OG_IMAGE,
      width: 512,
      height: 512,
    },
    sameAs: [`${SITE_ORIGIN}/`],
  };

  const webSiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    alternateName: [
      'Sinhala Wal Katha',
      'Wela Katha',
      'සිංහල වල් කතා',
      'walkathawa.com',
    ],
    url: `${SITE_ORIGIN}/`,
    inLanguage: ['si-LK', 'en'],
    publisher: {
      '@id': `${SITE_ORIGIN}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return [organizationSchema, webSiteSchema];
}

export function buildBreadcrumbJsonLd(
  breadcrumbs?: BreadcrumbEntry[],
  fallbackCanonicalUrl?: string
): Record<string, unknown> | null {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => {
      const itemLabel = crumb.label || crumb.name || 'Page';
      const itemPath = crumb.href || crumb.path || fallbackCanonicalUrl || '/';
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: itemLabel,
        item: normalizeCanonicalUrl(itemPath, SITE_ORIGIN),
      };
    }),
  };
}

export function buildBlogPostingJsonLd(params: {
  title: string;
  description: string;
  canonicalUrl?: string;
  slug?: string;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  category?: string;
  wordCount?: number;
}): Record<string, unknown> {
  const pathOrUrl =
    params.canonicalUrl || (params.slug ? `/posts/${params.slug}` : '/');
  const postUrl = normalizeCanonicalUrl(pathOrUrl, SITE_ORIGIN);
  const resolvedImage = params.image
    ? params.image.startsWith('http')
      ? params.image.replace(/^http:\/\//i, 'https://')
      : `${SITE_ORIGIN}${params.image.startsWith('/') ? params.image : `/${params.image}`}`
    : DEFAULT_OG_IMAGE;
  const pubTime = params.publishedTime || new Date().toISOString();
  const modTime = params.modifiedTime || pubTime;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${postUrl}#article`,
    headline: params.title,
    description: truncateSinhalaDescription(params.description, 155),
    image: {
      '@type': 'ImageObject',
      url: resolvedImage,
      width: 1200,
      height: 750,
    },
    datePublished: pubTime,
    dateModified: modTime,
    author: {
      '@type': 'Person',
      name: params.authorName || 'Wal Kathawa Editorial',
      url: `${SITE_ORIGIN}/about`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    inLanguage: 'si-LK',
    articleSection: params.category || 'Sinhala Wal Katha',
    ...(params.wordCount && params.wordCount > 0
      ? { wordCount: params.wordCount }
      : {}),
  };
}

export function buildCollectionPageJsonLd(params: {
  name: string;
  description: string;
  canonicalUrl?: string;
  path?: string;
  posts: Array<{
    title: string;
    slug: string;
    excerpt?: string;
    publishedTime?: string;
    createdAt?: Date | string;
  }>;
}): Record<string, unknown> {
  const pageUrl = normalizeCanonicalUrl(
    params.canonicalUrl || params.path || '/',
    SITE_ORIGIN
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#collectionpage`,
    name: params.name,
    description: truncateSinhalaDescription(params.description, 155),
    url: pageUrl,
    inLanguage: 'si-LK',
    isPartOf: {
      '@id': `${SITE_ORIGIN}/#website`,
    },
    hasPart: params.posts.slice(0, 30).map((p) => {
      const datePublished =
        p.publishedTime ||
        (p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : typeof p.createdAt === 'string'
          ? p.createdAt
          : undefined);
      return {
        '@type': 'BlogPosting',
        headline: p.title,
        url: normalizeCanonicalUrl(`/posts/${p.slug}`, SITE_ORIGIN),
        ...(datePublished ? { datePublished } : {}),
      };
    }),
  };
}

/**
 * Primary per-page SEO hook (`useSeo`).
 * Writes directly to document.head using native <meta>, <link>, and one <script type="application/ld+json"> per entity.
 */
export function useSeo({
  title,
  description,
  canonical,
  image,
  imageWidth,
  imageHeight,
  type = 'website',
  publishedTime,
  modifiedTime,
  section,
  noindex = false,
  breadcrumbs = [],
  jsonLdEntities = [],
}: UseSeoOptions): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const cleanTitle = String(title || DEFAULT_HOMEPAGE_TITLE)
      .replace(/\s+/g, ' ')
      .trim();
    const cleanDescription = truncateSinhalaDescription(
      description,
      DEFAULT_HOMEPAGE_DESCRIPTION,
      155
    );

    const activeOrigin =
      typeof window !== 'undefined' &&
      window.location.origin &&
      window.location.origin.includes('walkathawa.com')
        ? window.location.origin
        : SITE_ORIGIN;

    const canonicalPathOrUrl =
      canonical ||
      (typeof window !== 'undefined' ? window.location.pathname : '/');
    const resolvedCanonical = normalizeCanonicalUrl(
      canonicalPathOrUrl,
      activeOrigin
    );

    const resolvedImage = image
      ? image.startsWith('http')
        ? image.replace(/^http:\/\//i, 'https://')
        : `${SITE_ORIGIN}${image.startsWith('/') ? image : `/${image}`}`
      : DEFAULT_OG_IMAGE;

    const resolvedWidth = String(imageWidth || 1200);
    const resolvedHeight = String(imageHeight || 750);

    document.title = cleanTitle;

    // Remove any legacy <meta name="keywords"> tag if present
    const existingKeywords = document.head.querySelector('meta[name="keywords"]');
    if (existingKeywords) {
      existingKeywords.remove();
    }

    const upsertMeta = (
      attr: 'name' | 'property',
      key: string,
      content: string
    ) => {
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${key}"]`
      );
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const removeMeta = (attr: 'name' | 'property', key: string) => {
      const el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (el) el.remove();
    };

    const upsertLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let el = document.head.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        if (hreflang) {
          el.setAttribute('hreflang', hreflang);
        }
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    upsertMeta('name', 'description', cleanDescription);
    upsertMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // Canonical & Hreflang alternates (si-LK, en, x-default)
    upsertLink('canonical', resolvedCanonical);
    upsertLink('alternate', resolvedCanonical, 'si-LK');
    upsertLink('alternate', resolvedCanonical, 'en');
    upsertLink('alternate', resolvedCanonical, 'x-default');

    // OpenGraph
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'si_LK');
    upsertMeta('property', 'og:title', cleanTitle);
    upsertMeta('property', 'og:description', cleanDescription);
    upsertMeta('property', 'og:url', resolvedCanonical);
    upsertMeta('property', 'og:image', resolvedImage);
    upsertMeta('property', 'og:image:width', resolvedWidth);
    upsertMeta('property', 'og:image:height', resolvedHeight);

    if (type === 'article') {
      if (publishedTime) {
        upsertMeta('property', 'article:published_time', publishedTime);
      }
      if (modifiedTime || publishedTime) {
        upsertMeta(
          'property',
          'article:modified_time',
          modifiedTime || publishedTime || ''
        );
      }
      if (section) {
        upsertMeta('property', 'article:section', section);
      }
    } else {
      removeMeta('property', 'article:published_time');
      removeMeta('property', 'article:modified_time');
      removeMeta('property', 'article:section');
    }

    // Twitter Cards
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', '@walkathawa');
    upsertMeta('name', 'twitter:creator', '@walkathawa');
    upsertMeta('name', 'twitter:title', cleanTitle);
    upsertMeta('name', 'twitter:description', cleanDescription);
    upsertMeta('name', 'twitter:image', resolvedImage);

    // Structured Data: One <script type="application/ld+json"> per entity type, no duplicates
    document.head
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((node) => node.remove());

    const allEntities: Record<string, unknown>[] = [...buildSiteWideJsonLd()];

    // Every non-home page gets BreadcrumbList
    const isHomePage = resolvedCanonical === `${SITE_ORIGIN}/`;
    if (!isHomePage) {
      const breadcrumbEntity = buildBreadcrumbJsonLd(
        breadcrumbs,
        resolvedCanonical
      );
      if (breadcrumbEntity) {
        allEntities.push(breadcrumbEntity);
      }
    }

    for (const entity of jsonLdEntities) {
      if (entity && typeof entity === 'object') {
        allEntities.push(entity);
      }
    }

    allEntities.forEach((entity, idx) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.setAttribute(
        'data-entity-type',
        String(entity['@type'] || `entity-${idx}`)
      );
      script.textContent = JSON.stringify(entity);
      document.head.appendChild(script);
    });
  }, [
    title,
    description,
    canonical,
    image,
    imageWidth,
    imageHeight,
    type,
    publishedTime,
    modifiedTime,
    section,
    noindex,
    JSON.stringify(breadcrumbs),
    JSON.stringify(jsonLdEntities),
  ]);
}
