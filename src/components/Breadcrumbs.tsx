import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BreadcrumbItem } from '../types';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="py-3 mb-6 border-b border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400"
    >
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        className="flex flex-wrap items-center gap-1.5"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-1.5"
            >
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  itemProp="item"
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors whitespace-nowrap"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              ) : (
                <span
                  itemProp="name"
                  aria-current={isLast ? 'page' : undefined}
                  className="text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-[260px] sm:max-w-[420px]"
                >
                  {item.label}
                </span>
              )}
              <meta itemProp="position" content={String(index + 1)} />
              {!isLast && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
