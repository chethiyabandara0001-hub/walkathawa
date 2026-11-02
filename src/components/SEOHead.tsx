import { useEffect } from 'react';
import { BreadcrumbItem } from '../types';

export const LONG_TAIL_2026_KEYWORDS: string[] = [
  'අම්මා වල් කතා 2026',
  'සිංහල වල් කතා 2026',
  'අලුත් වැල කතා 2026',
  'පවුලේ වල් කතා 2026',
  'අක්කා මල්ලි වල් කතා 2026',
  'කැම්පස් වල් කතා 2026',
  'රසම වල් කතා 2026',
  'සිංහල චිත්‍ර කතා 2026',
  'අලුත්ම සිංහල වල් කතා 2026',
  'නංගි වල් කතා 2026',
];

export const DEFAULT_SEO_KEYWORDS: string[] = [
  ...LONG_TAIL_2026_KEYWORDS,
  'Wal Katha',
  'wala katha',
  'wela katha',
  'walkatha9',
  'සිංහල වැල කතා',
  'sinhala wal katha',
  'Wela kathaa',
  'Sex Katha',
  'Sex Stories',
  'Wal Stories',
  'Sinhala Sex',
  'Sinhala Porn',
  'Free Download',
  'Sri Lanka',
  'new wela katha',
  'wal katha 9',
  'sinhala wela katha',
  'wal Katha sinhalen',
  'Ammai Puthai',
  'Paule wela Katha',
  'Sinhala wal wala wela katha',
  'amma katha',
  'family katha',
  'suparima katha',
  'walma',
  'wal katha kari katha',
  'eha gedara',
  'akka katha',
  'malli katha',
  'seeya katha',
  'husband katha',
  'wife katha',
  'hora katha',
  'New Wal Katha blogs',
  'wal chithra katha',
  'wal katha free',
  'sinhala sex katha',
  'sinhala wal katha blog',
  'nangita hukala',
  'campus',
  'amma malli',
  'akka',
  'birinda',
  'wife lingika paula',
  'rasama',
  'rasa wal katha',
  'wal katha fb',
  'වල් කතා',
  'වැල කතා',
];

export const SEO_LIMITS = {
  TITLE_MAX: 60,
  DESCRIPTION_MAX: 158,
} as const;

/**
 * Formats an SEO title naturally and strictly within 60 characters,
 * avoiding keyword stuffing while preserving brand identity.
 */
export function formatNaturalSeoTitle(rawTitle: string): string {
  const clean = rawTitle.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'walkathawa — සිංහල වල් කතා 2026 | Sinhala Wal Katha';
  }

  const suffix = ' | walkathawa';
  const hasBrand = clean.toLowerCase().includes('walkathawa');
  const candidate = hasBrand ? clean : `${clean}${suffix}`;

  if (candidate.length <= SEO_LIMITS.TITLE_MAX) {
    return candidate;
  }

  // If adding suffix exceeds 60 chars, see if clean title alone fits <= 60 chars
  if (!hasBrand && clean.length <= SEO_LIMITS.TITLE_MAX - suffix.length) {
    return `${clean}${suffix}`;
  }

  const maxCore = hasBrand
    ? SEO_LIMITS.TITLE_MAX - 1
    : SEO_LIMITS.TITLE_MAX - suffix.length - 1;
  const sliced = clean.slice(0, Math.max(20, maxCore));
  const lastSpace = sliced.lastIndexOf(' ');
  const naturalCore =
    lastSpace > 15 ? sliced.slice(0, lastSpace).trim() : sliced.trim();

  return hasBrand ? `${naturalCore}…` : `${naturalCore}…${suffix}`;
}

/**
 * Formats a meta description naturally and strictly under 160 characters (max 158),
 * avoiding repetitive keyword lists.
 */
export function formatNaturalSeoDescription(rawDescription: string): string {
  const clean = rawDescription.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return '2026 අලුත්ම සිංහල වල් කතා, අම්මා වල් කතා 2026, පවුලේ කතා සහ චිත්‍ර කතා කියවන්න walkathawa වෙතින්. දිනපතා අලුත් වන සිංහල කතා එකතුව.';
  }
  if (clean.length <= SEO_LIMITS.DESCRIPTION_MAX) {
    return clean;
  }
  const sliced = clean.slice(0, SEO_LIMITS.DESCRIPTION_MAX - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const naturalText =
    lastSpace > 80 ? sliced.slice(0, lastSpace).trim() : sliced.trim();
  return `${naturalText}…`;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  wordCount?: number;
  breadcrumbs?: BreadcrumbItem[];
  keywords?: string[];
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  canonicalPath = '/',
  ogImage = '/assets/aistudio/Untitled_Design_62137426.png',
  ogType = 'website',
  publishedTime,
  modifiedTime,
  articleSection,
  wordCount,
  breadcrumbs = [],
  keywords = [],
  noindex = false,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = formatNaturalSeoTitle(title);
    const naturalDescription = formatNaturalSeoDescription(description);
    document.title = fullTitle;

    const origin = 'https://walkathawa.com';

    const cleanPath = canonicalPath.startsWith('/')
      ? canonicalPath
      : `/${canonicalPath}`;
    const canonicalUrl = `${origin}${cleanPath}`;
    const resolvedOgImage = ogImage.startsWith('http')
      ? ogImage.replace(/^http:\/\//i, 'https://')
      : `${origin}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`;

    const mergedKeywords = Array.from(
      new Set([
        ...keywords.map((k) => k.trim()).filter(Boolean),
        ...DEFAULT_SEO_KEYWORDS,
      ])
    ).join(', ');

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', naturalDescription);
    setMeta('meta[name="keywords"]', 'name', 'keywords', mergedKeywords);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', naturalDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', naturalDescription);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedOgImage);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Structured Data (JSON-LD) for Google Search Console Indexing (WebSite + BreadcrumbList + Article/BlogPosting)
    const graph: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'walkathawa',
        alternateName: [
          'සිංහල වල් කතා 2026',
          'අම්මා වල් කතා 2026',
          'Sinhala Wal Katha',
          'සිංහල වැල කතා',
        ],
        url: origin,
        inLanguage: ['si-LK', 'en'],
        description: naturalDescription,
        keywords: mergedKeywords,
      },
    ];

    if (breadcrumbs.length > 0) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: crumb.label,
          item: crumb.href ? `${origin}${crumb.href}` : canonicalUrl,
        })),
      });
    }

    if (ogType === 'article') {
      graph.push({
        '@context': 'https://schema.org',
        '@type': ['BlogPosting', 'Article'],
        '@id': `${canonicalUrl}#article`,
        headline: title.slice(0, 110),
        description: naturalDescription,
        image: [
          {
            '@type': 'ImageObject',
            url: resolvedOgImage,
            width: 1200,
            height: 750,
          },
        ],
        articleSection: articleSection || 'සිංහල කතා',
        ...(wordCount && wordCount > 0 ? { wordCount } : {}),
        keywords: mergedKeywords,
        inLanguage: 'si-LK',
        isAccessibleForFree: true,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        datePublished: publishedTime || new Date().toISOString(),
        dateModified: modifiedTime || publishedTime || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: 'walkathawa Editorial',
          url: origin,
        },
        publisher: {
          '@type': 'Organization',
          name: 'walkathawa',
          url: origin,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/assets/aistudio/Untitled_Design_62137426.png`,
            width: 512,
            height: 512,
          },
        },
      });
    }

    let scriptEl = document.head.querySelector<HTMLScriptElement>(
      'script[data-seo-jsonld="true"]'
    );
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.setAttribute('data-seo-jsonld', 'true');
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(graph);
  }, [
    title,
    description,
    canonicalPath,
    ogImage,
    ogType,
    publishedTime,
    modifiedTime,
    articleSection,
    wordCount,
    breadcrumbs,
    keywords,
    noindex,
  ]);

  return null;
}
