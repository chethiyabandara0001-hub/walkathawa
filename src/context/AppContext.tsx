import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseConfig,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  ADMIN_EMAIL,
  StoryPost,
  VALIDATION_LIMITS,
} from '../types';
import {
  LEGACY_SEED_POST_IDS,
  LEGACY_DEFAULT_CATEGORIES,
  LEGACY_DEFAULT_COLLECTIONS,
} from '../data/initialStories';
import prerenderedSnapshot from '../data/prerenderedData.json';
import {
  deleteImageFromR2,
  generateSafeId,
  isR2StoredUrl,
  transferImageToR2,
} from '../utils/imageUtils';
import {
  deduplicateSlug,
  getTaxonomySlug,
  isOpaqueOrLegacySlug,
  toRomanizedSlug,
} from '../lib/slugs';

export interface CreatePostInput {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  collection: string;
  images: string[];
  published?: boolean;
}

export interface UpdatePostInput extends CreatePostInput {
  id: string;
  slug: string;
}

interface RawPrerenderedPost {
  id: string;
  title: string;
  slug?: string;
  legacySlug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  categorySlug?: string;
  collection?: string;
  collectionSlug?: string;
  coverImage?: string;
  images?: string[];
  authorEmail?: string;
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function hydratePrerenderedPosts(rawPosts: RawPrerenderedPost[]): StoryPost[] {
  if (!Array.isArray(rawPosts) || rawPosts.length === 0) return [];
  const usedSlugs = new Set<string>();

  // Sort oldest-first when assigning deduplicated slugs so earlier stories always keep the base slug
  const sortedByCreatedAsc = [...rawPosts].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tA - tB;
  });

  const slugById = new Map<string, string>();
  for (const item of sortedByCreatedAsc) {
    const existingSlug = String(item.slug || '').trim();
    if (
      existingSlug &&
      !isOpaqueOrLegacySlug(existingSlug, item.id) &&
      !usedSlugs.has(existingSlug)
    ) {
      usedSlugs.add(existingSlug);
      slugById.set(item.id, existingSlug);
    } else {
      const romanized = deduplicateSlug(item.title || item.id, usedSlugs, 60);
      slugById.set(item.id, romanized);
    }
  }

  return rawPosts.map((item) => {
    const cat = String(item.category || '').trim();
    const col = String(item.collection || '').trim();
    const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : createdAt;
    const imgs =
      Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : item.coverImage
        ? [item.coverImage]
        : [];
    const computedSlug = slugById.get(item.id) || toRomanizedSlug(item.title || item.id, 60);

    return {
      id: String(item.id),
      title: String(item.title || 'Untitled Story'),
      slug: computedSlug,
      legacySlug: String(item.legacySlug || item.slug || item.id),
      excerpt: String(item.excerpt || ''),
      content: String(item.content || ''),
      category: cat,
      categorySlug: item.categorySlug || (cat ? getTaxonomySlug(cat) : ''),
      collection: col,
      collectionSlug: item.collectionSlug || (col ? getTaxonomySlug(col) : ''),
      coverImage: String(item.coverImage || imgs[0] || ''),
      images: imgs,
      authorEmail: String(item.authorEmail || ADMIN_EMAIL),
      published: item.published !== false,
      createdAt,
      updatedAt,
      isSeed: false,
    };
  });
}

const INITIAL_PRERENDERED_POSTS = hydratePrerenderedPosts(
  (prerenderedSnapshot?.posts as RawPrerenderedPost[]) || []
);
const INITIAL_PRERENDERED_CATEGORIES: string[] = Array.isArray(
  prerenderedSnapshot?.categories
)
  ? prerenderedSnapshot.categories.map((c) => String(c).trim()).filter(Boolean)
  : [];
const INITIAL_PRERENDERED_COLLECTIONS: string[] = Array.isArray(
  prerenderedSnapshot?.collections
)
  ? prerenderedSnapshot.collections.map((c) => String(c).trim()).filter(Boolean)
  : [];

interface AppContextType {
  user: User | null;
  isAdmin: boolean;
  authReady: boolean;
  posts: StoryPost[];
  allPostsForAdmin: StoryPost[];
  firestorePostsCount: number;
  loadingPosts: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<string>;
  updatePost: (input: UpdatePostInput) => Promise<void>;
  togglePublishPost: (post: StoryPost) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  categories: string[];
  collections: string[];
  resolveCategoryFromParam: (param?: string) => {
    matched: string | undefined;
    canonicalSlug: string | undefined;
    needsRedirect: boolean;
  };
  resolveCollectionFromParam: (param?: string) => {
    matched: string | undefined;
    canonicalSlug: string | undefined;
    needsRedirect: boolean;
  };
  addCategory: (categoryName: string) => Promise<void>;
  removeCategory: (categoryName: string) => Promise<void>;
  addCollection: (collectionName: string) => Promise<void>;
  removeCollection: (collectionName: string) => Promise<void>;
  adminEmails: string[];
  addAdminEmail: (email: string) => Promise<void>;
  removeAdminEmail: (email: string) => Promise<void>;
  syncArchiveToFirestore: () => Promise<number>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<StoryPost[]>(
    INITIAL_PRERENDERED_POSTS
  );
  const [customCategories, setCustomCategories] = useState<string[]>(
    INITIAL_PRERENDERED_CATEGORIES
  );
  const [customCollections, setCustomCollections] = useState<string[]>(
    INITIAL_PRERENDERED_COLLECTIONS
  );
  const [adminEmails, setAdminEmails] = useState<string[]>([
    ADMIN_EMAIL.toLowerCase(),
  ]);
  const [legacyCleaned, setLegacyCleaned] = useState<boolean>(true);
  const [archiveSeeded, setArchiveSeeded] = useState<boolean>(false);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(
    INITIAL_PRERENDERED_POSTS.length === 0
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const autoSeedTriggered = useRef(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monolith_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('monolith_theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen to /settings/admin for Firestore-stored Admin Configuration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const adminConfigRef = doc(db, 'settings', 'admin');
    const unsubscribe = onSnapshot(
      adminConfigRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawEmails = Array.isArray(data?.adminEmails)
            ? data.adminEmails
                .map((e: unknown) => String(e).trim().toLowerCase())
                .filter(Boolean)
            : [];
          const merged = Array.from(
            new Set([ADMIN_EMAIL.toLowerCase(), ...rawEmails])
          );
          setAdminEmails(merged);
        }
      },
      () => {
        // Keep default ADMIN_EMAIL if offline or uninitialized
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to /settings/taxonomy for admin-created categories and collections
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const taxonomyRef = doc(db, 'settings', 'taxonomy');
    const unsubscribe = onSnapshot(
      taxonomyRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const cleanedFlag = data?.legacyDefaultsRemoved !== false;
          setLegacyCleaned(cleanedFlag);
          setArchiveSeeded(Boolean(data?.initialArchiveSeeded));

          if (Array.isArray(data?.categories) && data.categories.length > 0) {
            const rawCats = data.categories
              .map((c: unknown) => String(c).trim())
              .filter(Boolean);
            setCustomCategories(
              cleanedFlag
                ? rawCats
                : rawCats.filter((c) => !LEGACY_DEFAULT_CATEGORIES.includes(c))
            );
          }

          if (Array.isArray(data?.collections) && data.collections.length > 0) {
            const rawCols = data.collections
              .map((c: unknown) => String(c).trim())
              .filter(Boolean);
            setCustomCollections(
              cleanedFlag
                ? rawCols
                : rawCols.filter((c) => !LEGACY_DEFAULT_COLLECTIONS.includes(c))
            );
          }
        }
      },
      () => {
        // Keep prerendered fallback categories/collections on error
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const postsPath = 'posts';
    const q = query(collection(db, postsPath), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rawDocs = snapshot.docs
          .filter((docSnap) => !LEGACY_SEED_POST_IDS.includes(docSnap.id))
          .map((docSnap) => {
            const data = docSnap.data();
            const createdAt =
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date();
            const updatedAt =
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : createdAt;
            const imgs: string[] =
              Array.isArray(data.images) && data.images.length > 0
                ? data.images
                : data.coverImage
                ? [data.coverImage]
                : [];

            const rawCat = String(data.category || '').trim();
            const rawCol = String(data.collection || '').trim();
            const category =
              LEGACY_DEFAULT_CATEGORIES.includes(rawCat) && !legacyCleaned
                ? ''
                : rawCat;
            const col =
              LEGACY_DEFAULT_COLLECTIONS.includes(rawCol) && !legacyCleaned
                ? ''
                : rawCol;

            return {
              id: docSnap.id,
              title: String(data.title || 'Untitled Story'),
              rawSlug: String(data.slug || docSnap.id),
              legacySlug: String(data.legacySlug || data.slug || docSnap.id),
              excerpt: String(data.excerpt || ''),
              content: String(data.content || ''),
              category,
              collection: col,
              coverImage: String(data.coverImage || imgs[0] || ''),
              images: imgs,
              authorEmail: String(data.authorEmail || ADMIN_EMAIL),
              published: data.published !== false,
              createdAt,
              updatedAt,
            };
          });

        // Deterministic romanized slug assignment (oldest first so slugs never shift)
        const usedSlugs = new Set<string>();
        const ascDocs = [...rawDocs].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        const slugById = new Map<string, string>();
        for (const d of ascDocs) {
          if (
            d.rawSlug &&
            !isOpaqueOrLegacySlug(d.rawSlug, d.id) &&
            !usedSlugs.has(d.rawSlug)
          ) {
            usedSlugs.add(d.rawSlug);
            slugById.set(d.id, d.rawSlug);
          } else {
            const computed = deduplicateSlug(d.title || d.id, usedSlugs, 60);
            slugById.set(d.id, computed);
          }
        }

        const loaded: StoryPost[] = rawDocs.map((d) => ({
          id: d.id,
          title: d.title,
          slug: slugById.get(d.id) || toRomanizedSlug(d.title, 60),
          legacySlug: d.legacySlug,
          excerpt: d.excerpt,
          content: d.content,
          category: d.category,
          categorySlug: d.category ? getTaxonomySlug(d.category) : '',
          collection: d.collection,
          collectionSlug: d.collection ? getTaxonomySlug(d.collection) : '',
          coverImage: d.coverImage,
          images: d.images,
          authorEmail: d.authorEmail,
          published: d.published,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          isSeed: false,
        }));

        if (loaded.length > 0 || archiveSeeded) {
          setFirestorePosts(loaded);
        } else if (INITIAL_PRERENDERED_POSTS.length > 0) {
          setFirestorePosts(INITIAL_PRERENDERED_POSTS);
        }
        setLoadingPosts(false);
      },
      () => {
        // Keep initial archive posts loaded if Firestore database is not yet initialized
        setLoadingPosts(false);
      }
    );

    return () => unsubscribe();
  }, [legacyCleaned, archiveSeeded]);

  const isAdmin = Boolean(
    user &&
      user.email &&
      adminEmails.some(
        (email) => email.toLowerCase() === user.email!.toLowerCase()
      )
  );

  const syncArchiveToFirestore = async (): Promise<number> => {
    const sourcePosts =
      firestorePosts.length > 0 ? firestorePosts : INITIAL_PRERENDERED_POSTS;
    let syncedCount = 0;

    for (const post of sourcePosts) {
      const imgs =
        post.images && post.images.length > 0
          ? post.images
          : post.coverImage
          ? [post.coverImage]
          : [];
      await setDoc(
        doc(db, 'posts', post.id),
        {
          title: post.title,
          slug: post.slug,
          legacySlug: post.legacySlug || post.id,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          collection: post.collection,
          coverImage: post.coverImage || imgs[0] || '',
          images: imgs,
          authorEmail: post.authorEmail || ADMIN_EMAIL,
          published: post.published !== false,
          createdAt: Timestamp.fromDate(post.createdAt),
          updatedAt: Timestamp.fromDate(post.updatedAt),
        },
        { merge: true }
      );
      syncedCount++;
    }

    const mergedCategories = Array.from(
      new Set([
        ...INITIAL_PRERENDERED_CATEGORIES,
        ...customCategories,
        ...sourcePosts.map((p) => p.category.trim()).filter(Boolean),
      ])
    ).sort();

    const mergedCollections = Array.from(
      new Set([
        ...INITIAL_PRERENDERED_COLLECTIONS,
        ...customCollections,
        ...sourcePosts.map((p) => p.collection.trim()).filter(Boolean),
      ])
    ).sort();

    await setDoc(
      doc(db, 'settings', 'taxonomy'),
      {
        categories: mergedCategories,
        collections: mergedCollections,
        legacyDefaultsRemoved: true,
        initialArchiveSeeded: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'settings', 'admin'),
      {
        primaryAdminEmail: ADMIN_EMAIL,
        adminEmails: Array.from(
          new Set([
            ADMIN_EMAIL.toLowerCase(),
            ...adminEmails.map((e) => e.toLowerCase()),
            ...(user?.email ? [user.email.toLowerCase()] : []),
          ])
        ),
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (user?.uid && user?.email) {
      await setDoc(
        doc(db, 'admins', user.uid),
        {
          email: user.email.toLowerCase(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    setArchiveSeeded(true);
    return syncedCount;
  };

  // Automatically sync initial stories, categories, collections, and admin configuration into advance-sandbox-gmzf6 Firestore when admin is signed in and database has not been seeded yet
  useEffect(() => {
    if (isAdmin && !archiveSeeded && !autoSeedTriggered.current) {
      autoSeedTriggered.current = true;
      syncArchiveToFirestore().catch((err) => {
        console.warn('Auto-sync archive to Firestore notice:', err);
      });
    }
  }, [isAdmin, archiveSeeded]);

  const posts: StoryPost[] = useMemo(
    () => firestorePosts.filter((p) => p.published !== false),
    [firestorePosts]
  );
  const allPostsForAdmin: StoryPost[] = firestorePosts;

  // Categories and collections come strictly from admin-managed taxonomy and active user posts
  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...customCategories,
          ...allPostsForAdmin.map((p) => p.category.trim()).filter(Boolean),
        ])
      ).sort(),
    [customCategories, allPostsForAdmin]
  );

  const collections = useMemo(
    () =>
      Array.from(
        new Set([
          ...customCollections,
          ...allPostsForAdmin.map((p) => p.collection.trim()).filter(Boolean),
        ])
      ).sort(),
    [customCollections, allPostsForAdmin]
  );

  const resolveCategoryFromParam = (param?: string) => {
    if (!param) {
      return { matched: undefined, canonicalSlug: undefined, needsRedirect: false };
    }
    const decoded = decodeURIComponent(param).trim();
    const matched = categories.find(
      (cat) =>
        getTaxonomySlug(cat) === decoded.toLowerCase() ||
        cat.toLowerCase() === decoded.toLowerCase()
    );
    if (!matched) {
      return { matched: undefined, canonicalSlug: undefined, needsRedirect: false };
    }
    const canonicalSlug = getTaxonomySlug(matched);
    return {
      matched,
      canonicalSlug,
      needsRedirect: decoded !== canonicalSlug,
    };
  };

  const resolveCollectionFromParam = (param?: string) => {
    if (!param) {
      return { matched: undefined, canonicalSlug: undefined, needsRedirect: false };
    }
    const decoded = decodeURIComponent(param).trim();
    const matched = collections.find(
      (col) =>
        getTaxonomySlug(col) === decoded.toLowerCase() ||
        col.toLowerCase() === decoded.toLowerCase()
    );
    if (!matched) {
      return { matched: undefined, canonicalSlug: undefined, needsRedirect: false };
    }
    const canonicalSlug = getTaxonomySlug(matched);
    return {
      matched,
      canonicalSlug,
      needsRedirect: decoded !== canonicalSlug,
    };
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const addCategory = async (categoryName: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can add categories.`);
    }
    const clean = categoryName
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_CATEGORY_MAX);
    if (!clean) return;

    const nextCategories = Array.from(new Set([...categories, clean])).sort();
    const path = 'settings/taxonomy';
    try {
      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          categories: nextCategories,
          collections,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeCategory = async (categoryName: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can remove categories.`);
    }
    const nextCategories = categories.filter(
      (c) => c.toLowerCase() !== categoryName.toLowerCase()
    );
    const path = 'settings/taxonomy';
    try {
      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          categories: nextCategories,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const matchingPosts = allPostsForAdmin.filter(
        (p) => p.category.toLowerCase() === categoryName.toLowerCase()
      );
      for (const post of matchingPosts) {
        await setDoc(
          doc(db, 'posts', post.id),
          { category: '', updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addCollection = async (collectionName: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can add collections.`);
    }
    const clean = collectionName
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_COLLECTION_MAX);
    if (!clean) return;

    const nextCollections = Array.from(new Set([...collections, clean])).sort();
    const path = 'settings/taxonomy';
    try {
      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          categories,
          collections: nextCollections,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeCollection = async (collectionName: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can remove collections.`);
    }
    const nextCollections = collections.filter(
      (c) => c.toLowerCase() !== collectionName.toLowerCase()
    );
    const path = 'settings/taxonomy';
    try {
      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          collections: nextCollections,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      const matchingPosts = allPostsForAdmin.filter(
        (p) => p.collection.toLowerCase() === collectionName.toLowerCase()
      );
      for (const post of matchingPosts) {
        await setDoc(
          doc(db, 'posts', post.id),
          { collection: '', updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addAdminEmail = async (email: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin can update admin configuration.`);
    }
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    const nextEmails = Array.from(new Set([...adminEmails, clean]));
    const path = 'settings/admin';
    try {
      await setDoc(
        doc(db, 'settings', 'admin'),
        {
          primaryAdminEmail: ADMIN_EMAIL,
          adminEmails: nextEmails,
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeAdminEmail = async (email: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin can update admin configuration.`);
    }
    const clean = email.trim().toLowerCase();
    if (clean === ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Primary admin email cannot be removed.');
    }
    const nextEmails = adminEmails.filter((e) => e.toLowerCase() !== clean);
    const path = 'settings/admin';
    try {
      await setDoc(
        doc(db, 'settings', 'admin'),
        {
          primaryAdminEmail: ADMIN_EMAIL,
          adminEmails: nextEmails,
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const ensureAllImagesStoredInR2 = async (rawImages: string[]): Promise<string[]> => {
    const sliced = rawImages
      .map((img) => img.trim())
      .filter((img) => img.length > 0)
      .slice(0, VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT);

    const storedLinks: string[] = [];
    for (let i = 0; i < sliced.length; i++) {
      const candidate = sliced[i];
      const storedUrl = isR2StoredUrl(candidate)
        ? candidate
        : await transferImageToR2(candidate, `story-image-${i + 1}.webp`);
      if (storedUrl.length > VALIDATION_LIMITS.POST_IMAGE_MAX_CHARS) {
        throw new Error(
          'Image exceeds maximum allowed size for Firebase Storage / Firestore.'
        );
      }
      storedLinks.push(storedUrl);
    }
    return storedLinks;
  };

  const createPost = async (input: CreatePostInput): Promise<string> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can create posts.`);
    }

    const cleanTitle = input.title.trim().slice(0, VALIDATION_LIMITS.POST_TITLE_MAX);
    const cleanCategory = input.category
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_CATEGORY_MAX);
    const cleanCollection = input.collection
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_COLLECTION_MAX);
    const cleanContent = input.content.trim().slice(0, VALIDATION_LIMITS.POST_CONTENT_MAX);
    const cleanExcerpt = (
      input.excerpt.trim() || cleanContent.slice(0, 180)
    ).slice(0, VALIDATION_LIMITS.POST_EXCERPT_MAX);

    if (!cleanTitle) throw new Error('Title is required.');
    if (!cleanContent) throw new Error('Story content is required.');

    const validImages = await ensureAllImagesStoredInR2(input.images);
    if (validImages.length === 0) throw new Error('At least one image is required.');

    const usedSlugs = new Set(allPostsForAdmin.map((p) => p.slug));
    const slug = deduplicateSlug(cleanTitle, usedSlugs, 60);
    const postId = slug || generateSafeId('post');
    const path = `posts/${postId}`;

    try {
      await setDoc(doc(db, 'posts', postId), {
        title: cleanTitle,
        slug,
        excerpt: cleanExcerpt,
        content: cleanContent,
        category: cleanCategory,
        collection: cleanCollection,
        coverImage: validImages[0],
        images: validImages,
        authorEmail: user.email,
        published: input.published !== false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const nextCategories = cleanCategory
        ? Array.from(new Set([...categories, cleanCategory])).sort()
        : categories;
      const nextCollections = cleanCollection
        ? Array.from(new Set([...collections, cleanCollection])).sort()
        : collections;

      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          categories: nextCategories,
          collections: nextCollections,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return slug;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updatePost = async (input: UpdatePostInput): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can update posts.`);
    }

    const cleanTitle = input.title.trim().slice(0, VALIDATION_LIMITS.POST_TITLE_MAX);
    const cleanCategory = input.category
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_CATEGORY_MAX);
    const cleanCollection = input.collection
      .trim()
      .slice(0, VALIDATION_LIMITS.POST_COLLECTION_MAX);
    const cleanContent = input.content.trim().slice(0, VALIDATION_LIMITS.POST_CONTENT_MAX);
    const cleanExcerpt = (
      input.excerpt.trim() || cleanContent.slice(0, 180)
    ).slice(0, VALIDATION_LIMITS.POST_EXCERPT_MAX);

    if (!cleanTitle) throw new Error('Title is required.');
    if (!cleanContent) throw new Error('Story content is required.');

    const validImages = await ensureAllImagesStoredInR2(input.images);
    if (validImages.length === 0) throw new Error('At least one image is required.');

    const existingPost = allPostsForAdmin.find((p) => p.id === input.id);
    const usedSlugs = new Set(
      allPostsForAdmin.filter((p) => p.id !== input.id).map((p) => p.slug)
    );
    const cleanSlug =
      input.slug &&
      !isOpaqueOrLegacySlug(input.slug, input.id) &&
      !usedSlugs.has(input.slug)
        ? toRomanizedSlug(input.slug, 60)
        : deduplicateSlug(cleanTitle, usedSlugs, 60);

    const path = `posts/${input.id}`;

    try {
      await setDoc(
        doc(db, 'posts', input.id),
        {
          title: cleanTitle,
          slug: cleanSlug,
          excerpt: cleanExcerpt,
          content: cleanContent,
          category: cleanCategory,
          collection: cleanCollection,
          coverImage: validImages[0],
          images: validImages,
          authorEmail: existingPost?.authorEmail || user.email,
          published: input.published !== false,
          createdAt: existingPost?.createdAt
            ? Timestamp.fromDate(existingPost.createdAt)
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const nextCategories = cleanCategory
        ? Array.from(new Set([...categories, cleanCategory])).sort()
        : categories;
      const nextCollections = cleanCollection
        ? Array.from(new Set([...collections, cleanCollection])).sort()
        : collections;

      await setDoc(
        doc(db, 'settings', 'taxonomy'),
        {
          categories: nextCategories,
          collections: nextCollections,
          legacyDefaultsRemoved: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (existingPost?.images) {
        const removedImages = existingPost.images.filter(
          (oldUrl) => !validImages.includes(oldUrl)
        );
        await Promise.all(removedImages.map((url) => deleteImageFromR2(url)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const togglePublishPost = async (post: StoryPost): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can publish/unpublish posts.`);
    }
    await updatePost({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      collection: post.collection,
      images: post.images.length > 0 ? post.images : [post.coverImage],
      published: !post.published,
    });
  };

  const deletePost = async (postId: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can delete posts.`);
    }

    const targetPost = allPostsForAdmin.find((p) => p.id === postId);
    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      if (targetPost) {
        const urlsToDelete = Array.from(
          new Set([
            ...(targetPost.images || []),
            ...(targetPost.coverImage ? [targetPost.coverImage] : []),
          ])
        );
        await Promise.all(urlsToDelete.map((url) => deleteImageFromR2(url)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAdmin,
        authReady,
        posts,
        allPostsForAdmin,
        firestorePostsCount: firestorePosts.length,
        loadingPosts,
        theme,
        toggleTheme,
        signInWithGoogle,
        signOut,
        createPost,
        updatePost,
        togglePublishPost,
        deletePost,
        categories,
        collections,
        resolveCategoryFromParam,
        resolveCollectionFromParam,
        addCategory,
        removeCategory,
        addCollection,
        removeCollection,
        adminEmails,
        addAdminEmail,
        removeAdminEmail,
        syncArchiveToFirestore,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
