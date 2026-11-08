export const ADMIN_EMAIL = 'chethiyabandara0001@gmail.com';
export const POSTS_PER_PAGE = 30;

export const VALIDATION_LIMITS = {
  POST_TITLE_MAX: 300,
  POST_SLUG_MAX: 60,
  POST_EXCERPT_MAX: 1000,
  POST_CONTENT_MAX: 150000,
  POST_CATEGORY_MAX: 100,
  POST_COLLECTION_MAX: 100,
  POST_IMAGE_MAX_CHARS: 2048,
  POST_IMAGES_MAX_COUNT: 20,
  COMMENT_AUTHOR_MAX: 100,
  COMMENT_CONTENT_MAX: 5000,
  ID_REGEX: /^[a-zA-Z0-9_-]{1,128}$/,
} as const;

export interface StoryPost {
  id: string;
  title: string;
  slug: string;
  legacySlug?: string;
  excerpt: string;
  content: string;
  category: string;
  categorySlug?: string;
  collection: string;
  collectionSlug?: string;
  coverImage: string;
  images: string[];
  authorEmail: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  isSeed?: boolean;
}

export interface StoryComment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
