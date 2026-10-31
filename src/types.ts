export interface StoryPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  collection: string;
  coverImage: string;
  images: string[];
  authorEmail: string;
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

export const VALIDATION_LIMITS = {
  POST_TITLE_MAX: 200,
  POST_SLUG_MAX: 200,
  POST_EXCERPT_MAX: 600,
  POST_CONTENT_MAX: 100000,
  POST_CATEGORY_MAX: 80,
  POST_COLLECTION_MAX: 80,
  POST_IMAGE_MAX_CHARS: 750000,
  POST_IMAGES_MAX_COUNT: 10,
  COMMENT_AUTHOR_MAX: 80,
  COMMENT_CONTENT_MAX: 2000,
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
} as const;

export const ADMIN_EMAIL = 'chethiyabandara0001@gmail.com';
export const POSTS_PER_PAGE = 30; // 3 columns x 10 rows per page
