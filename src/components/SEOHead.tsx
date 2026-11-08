import { BreadcrumbItem } from '../types';
import {
  useSeo,
  truncateSinhalaDescription,
  buildBlogPostingJsonLd,
} from '../lib/seo';

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

export const DEFAULT_SEO_KEYWORDS: string[] = [...LONG_TAIL_2026_KEYWORDS];

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
  DESCRIPTION_MAX: 160,
} as const;

export function formatNaturalSeoTitle(rawTitle: string): string {
  const clean = rawTitle.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'Sinhala Wal Katha – Aluth Wela Katha Daily | Wal Kathawa';
  }
  const hasBrand =
    clean.toLowerCase().includes('wal kathawa') ||
    clean.toLowerCase().includes('walkathawa');
  return hasBrand ? clean : `${clean} | Wal Kathawa`;
}

export function formatNaturalSeoDescription(rawDescription: string): string {
  return truncateSinhalaDescription(rawDescription, 155);
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
  jsonLdEntities?: Record<string, unknown>[];
}

export function SEOHead({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = 'website',
  publishedTime,
  modifiedTime,
  articleSection,
  wordCount,
  breadcrumbs = [],
  noindex = false,
  jsonLdEntities = [],
}: SEOHeadProps) {
  const fullTitle = formatNaturalSeoTitle(title);
  const fullDescription = formatNaturalSeoDescription(description);

  const entities = [...jsonLdEntities];
  if (ogType === 'article' && entities.length === 0) {
    entities.push(
      buildBlogPostingJsonLd({
        title: title.replace(/\s*\|\s*Wal Kathawa$/i, ''),
        description: fullDescription,
        canonicalUrl: canonicalPath || '/',
        image: ogImage,
        publishedTime,
        modifiedTime,
        category: articleSection,
        wordCount,
      })
    );
  }

  useSeo({
    title: fullTitle,
    description: fullDescription,
    canonical: canonicalPath,
    image: ogImage,
    type: ogType,
    publishedTime,
    modifiedTime,
    section: articleSection,
    noindex,
    breadcrumbs,
    jsonLdEntities: entities,
  });

  return null;
}
