import { useEffect } from 'react';
import { BreadcrumbItem } from '../types';

export const LONG_TAIL_2026_KEYWORDS: string[] = [
  'Wal Kathawa',
  'walkathawa',
  'Sinhala Wal Katha',
  'සිංහල වැල කතා',
  'සිංහල වල් කතා',
  'Wela Katha',
  'Wala Katha',
  'Welakathaa',
  'Wal katha 2026',
  'Amma Wal Katha',
  'Wife Wal Katha',
  'Akka Wal Katha',
  'Aunty Wal Katha',
  'Spa Kathawa',
  'Sinhala Sex Stories',
  'SL Wal Zone',
  'Aluth Wal Katha',
];

export const DEFAULT_SEO_KEYWORDS: string[] = [
  ...LONG_TAIL_2026_KEYWORDS,
  'අම්මා වල් කතා 2026',
  'සිංහල වල් කතා 2026',
  'අලුත් වැල කතා 2026',
  'පවුලේ වල් කතා 2026',
  'Wal Katha',
  'wala katha',
  'wela katha',
  'walkatha9',
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

export const WALAKATHA_STANDARD_CATEGORIES: string[] = [
  'අම්ම පුතා',
  'වයිෆ් හෝ GF',
  'සහෝදර/සහෝදරී',
  'තාත්ත දුව',
  'පවුලේ අන් අය සමග',
  'සම ලිංගික',
  'වැඩිමහල් බාල',
  'වෙනත්',
];

export const SEO_LIMITS = {
  TITLE_MAX: 90,
  DESCRIPTION_MAX: 220,
} as const;

export function formatNaturalSeoTitle(rawTitle: string): string {
  const clean = rawTitle.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'Wal Kathawa - Sinhala Wal Katha, Wela Katha & Wala Katha 2026 | සිංහල වල් කතා';
  }
  const hasBrand =
    clean.toLowerCase().includes('wal kathawa') ||
    clean.toLowerCase().includes('walkathawa');
  return hasBrand ? clean : `${clean} | Wal Kathawa`;
}

export function formatNaturalSeoDescription(rawDescription: string): string {
  const clean = rawDescription.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'Wal Kathawa (walkathawa.com) - 2026 අලුත්ම සිංහල වල් කතා, සිංහල වැල කතා, අම්මා වල් කතා, පවුලේ කතා, Read the latest Sinhala Wal Katha, Wela Katha, Wala Katha, Welakathaa, and Aluth Sinhala Sex Stories daily.';
  }
  return clean;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
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
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
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
    const fullDescription = formatNaturalSeoDescription(description);
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

    const setMeta = (
      selector: string,
      attr: 'name' | 'property',
      key: string,
      content: string
    ) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setLink = (
      selector: string,
      rel: string,
      href: string,
      hreflang?: string
    ) => {
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

    setMeta('meta[name="description"]', 'name', 'description', fullDescription);
    setMeta('meta[name="keywords"]', 'name', 'keywords', mergedKeywords);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    setMeta('meta[name="language"]', 'name', 'language', 'Sinhala, English');
    setMeta('meta[name="rating"]', 'name', 'rating', 'adult');
    setMeta(
      'meta[name="RATING"]',
      'name',
      'RATING',
      'RTA-5042-1996-1400-1577-RTA'
    );

    const resolvedOgTitle =
      ogTitle ||
      (cleanPath === '/'
        ? 'Wal Kathawa - Sinhala Wal Katha & Wela Katha | සිංහල වල් කතා'
        : fullTitle);
    const resolvedOgDescription =
      ogDescription ||
      (cleanPath === '/'
        ? 'දිනපතා අලුත්ම සිංහල වල් කතා සහ වැල කතා කියවන්න. Read daily updated Sinhala Wal Katha, Wela Katha, and episodic stories on Wal Kathawa.'
        : fullDescription);

    const resolvedTwitterTitle =
      twitterTitle ||
      (cleanPath === '/'
        ? 'Wal Kathawa - Sinhala Wal Katha & Wela Katha'
        : fullTitle);
    const resolvedTwitterDescription =
      twitterDescription ||
      (cleanPath === '/'
        ? 'Read the latest Sinhala Wal Katha (සිංහල වල් කතා) and Wela Katha stories updated daily on walkathawa.com.'
        : fullDescription);

    setMeta('meta[property="og:title"]', 'property', 'og:title', resolvedOgTitle);
    setMeta(
      'meta[property="og:description"]',
      'property',
      'og:description',
      resolvedOgDescription
    );
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Wal Kathawa');
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'si_LK');
    setMeta('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);

    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', resolvedTwitterTitle);
    setMeta(
      'meta[name="twitter:description"]',
      'name',
      'twitter:description',
      resolvedTwitterDescription
    );
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedOgImage);

    setLink('link[rel="canonical"]', 'canonical', canonicalUrl);
    setLink(
      'link[rel="alternate"][hreflang="si-LK"]',
      'alternate',
      canonicalUrl,
      'si-LK'
    );
    setLink(
      'link[rel="alternate"][hreflang="x-default"]',
      'alternate',
      canonicalUrl,
      'x-default'
    );

    // Structured Data (JSON-LD): WebSite + SearchAction + CollectionPage + BreadcrumbList + BlogPosting
    const graph: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'Wal Kathawa',
        alternateName: [
          'Sinhala Wal Katha',
          'Wela Katha',
          'සිංහල වල් කතා',
          'Walkathawa.com',
        ],
        url: `${origin}/`,
        inLanguage: ['si-LK', 'en'],
        description: fullDescription,
        keywords: mergedKeywords,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://walkathawa.com/?s={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ];

    if (ogType === 'website') {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collectionpage`,
        url: canonicalUrl,
        name: fullTitle,
        description: fullDescription,
        inLanguage: 'si-LK',
        isPartOf: {
          '@id': `${origin}/#website`,
        },
      });
    }

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
        '@type': 'BlogPosting',
        '@id': `${canonicalUrl}#article`,
        headline: fullTitle,
        description: fullDescription,
        image: [
          {
            '@type': 'ImageObject',
            url: resolvedOgImage,
            width: 1200,
            height: 750,
          },
        ],
        articleSection: articleSection || 'Sinhala Wal Katha',
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
          '@type': 'Organization',
          name: 'Wal Kathawa',
          url: `${origin}/`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Wal Kathawa',
          url: `${origin}/`,
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
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
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
