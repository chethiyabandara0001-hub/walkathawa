import { useEffect } from 'react';
import { BreadcrumbItem } from '../types';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  breadcrumbs?: BreadcrumbItem[];
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
  breadcrumbs = [],
  noindex = false,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title.toLowerCase().includes('walkathawa')
      ? title
      : `${title} — walkathawa`;
    document.title = fullTitle;

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://ais-pre-ca6ojtarha2uogyhz5lcii-163749283160.asia-southeast1.run.app';

    const cleanPath = canonicalPath.startsWith('/')
      ? canonicalPath
      : `/${canonicalPath}`;
    const canonicalUrl = `${origin}${cleanPath}`;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Structured Data (JSON-LD) for Google Search Console Indexing (WebSite + BreadcrumbList + Article)
    const graph: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'walkathawa',
        url: origin,
        description:
          'Curated stories, collections, and categories published on walkathawa.',
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
        '@type': 'BlogPosting',
        headline: title,
        description,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        datePublished: publishedTime || new Date().toISOString(),
        dateModified: modifiedTime || publishedTime || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: 'walkathawa Admin',
        },
        publisher: {
          '@type': 'Organization',
          name: 'walkathawa',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/assets/aistudio/Untitled_Design_62137426.png`,
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
    breadcrumbs,
    noindex,
  ]);

  return null;
}
