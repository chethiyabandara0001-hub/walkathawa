import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  ADMIN_EMAIL,
  StoryPost,
  VALIDATION_LIMITS,
} from '../types';
import { INITIAL_STORIES } from '../data/initialStories';
import { generateSafeId, slugifyTitle } from '../utils/imageUtils';

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
  seedInitialStoriesToFirestore: () => Promise<void>;
  categories: string[];
  collections: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firestorePosts, setFirestorePosts] = useState<StoryPost[]>([]);
  const [siteInitialized, setSiteInitialized] = useState<boolean | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const autoSeedTriggered = useRef(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monolith_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('monolith_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen to /settings/site_state so we know if initial stories were already migrated/seeded
  useEffect(() => {
    const stateDocRef = doc(db, 'settings', 'site_state');
    const unsubscribe = onSnapshot(
      stateDocRef,
      (snap) => {
        if (snap.exists() && snap.data()?.initialized === true) {
          setSiteInitialized(true);
        } else {
          setSiteInitialized(false);
        }
      },
      () => {
        setSiteInitialized(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const postsPath = 'posts';
    const q = query(collection(db, postsPath), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: StoryPost[] = snapshot.docs.map((docSnap) => {
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

          return {
            id: docSnap.id,
            title: String(data.title || 'Untitled Story'),
            slug: String(data.slug || docSnap.id),
            excerpt: String(data.excerpt || ''),
            content: String(data.content || ''),
            category: String(data.category || 'General'),
            collection: String(data.collection || 'Archive'),
            coverImage: String(data.coverImage || imgs[0] || ''),
            images: imgs,
            authorEmail: String(data.authorEmail || ADMIN_EMAIL),
            published: data.published !== false,
            createdAt,
            updatedAt,
            isSeed: false,
          };
        });
        setFirestorePosts(loaded);
        setLoadingPosts(false);
      },
      (error) => {
        setLoadingPosts(false);
        handleFirestoreError(error, OperationType.LIST, postsPath);
      }
    );

    return () => unsubscribe();
  }, []);

  const isAdmin = Boolean(
    user &&
      user.email &&
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Automatically migrate starter stories into Firestore the first time admin logs in
  // so the admin can immediately edit or delete any starter story as a real Firestore document.
  useEffect(() => {
    if (
      isAdmin &&
      !loadingPosts &&
      siteInitialized === false &&
      firestorePosts.length === 0 &&
      !autoSeedTriggered.current
    ) {
      autoSeedTriggered.current = true;
      seedInitialStoriesToFirestore().catch((err) => {
        console.error('Auto-seed error:', err);
      });
    }
  }, [isAdmin, loadingPosts, siteInitialized, firestorePosts.length]);

  const rawPosts: StoryPost[] =
    firestorePosts.length > 0 || siteInitialized === true
      ? firestorePosts
      : INITIAL_STORIES.map((s) => ({ ...s, published: true }));

  // Public gallery shows only published posts (newest first)
  const posts: StoryPost[] = rawPosts.filter((p) => p.published !== false);

  // Admin sees all posts (including drafts)
  const allPostsForAdmin: StoryPost[] = rawPosts;

  const categories = Array.from(
    new Set(posts.map((p) => p.category.trim()).filter(Boolean))
  ).sort();

  const collections = Array.from(
    new Set(posts.map((p) => p.collection.trim()).filter(Boolean))
  ).sort();

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const ensureSeededBeforeMutation = async (excludePostId?: string) => {
    if (siteInitialized === false && firestorePosts.length === 0 && user?.email) {
      for (const story of INITIAL_STORIES) {
        if (story.id === excludePostId) continue;
        await setDoc(doc(db, 'posts', story.id), {
          title: story.title,
          slug: story.slug,
          excerpt: story.excerpt,
          content: story.content,
          category: story.category,
          collection: story.collection,
          coverImage: story.coverImage,
          images: story.images,
          authorEmail: user.email,
          published: true,
          createdAt: Timestamp.fromDate(story.createdAt),
          updatedAt: serverTimestamp(),
        });
      }
      await setDoc(doc(db, 'settings', 'site_state'), {
        initialized: true,
        updatedAt: serverTimestamp(),
      });
    }
  };

  const createPost = async (input: CreatePostInput): Promise<string> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can create posts.`);
    }

    await ensureSeededBeforeMutation();

    const cleanTitle = input.title.trim().slice(0, VALIDATION_LIMITS.POST_TITLE_MAX);
    const cleanCategory = (input.category.trim() || 'Stories').slice(
      0,
      VALIDATION_LIMITS.POST_CATEGORY_MAX
    );
    const cleanCollection = (input.collection.trim() || 'Featured').slice(
      0,
      VALIDATION_LIMITS.POST_COLLECTION_MAX
    );
    const cleanContent = input.content.trim().slice(0, VALIDATION_LIMITS.POST_CONTENT_MAX);
    const cleanExcerpt = (
      input.excerpt.trim() || cleanContent.slice(0, 180)
    ).slice(0, VALIDATION_LIMITS.POST_EXCERPT_MAX);

    const validImages = input.images
      .map((img) => img.trim())
      .filter((img) => img.length > 0 && img.length <= VALIDATION_LIMITS.POST_IMAGE_MAX_CHARS)
      .slice(0, VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT);

    if (!cleanTitle) throw new Error('Title is required.');
    if (!cleanContent) throw new Error('Story content is required.');
    if (validImages.length === 0) throw new Error('At least one image is required.');

    const slug = slugifyTitle(cleanTitle);
    const postId = slug.slice(0, 120) || generateSafeId('post');
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
      await setDoc(doc(db, 'settings', 'site_state'), {
        initialized: true,
        updatedAt: serverTimestamp(),
      });
      return postId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updatePost = async (input: UpdatePostInput): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can update posts.`);
    }

    await ensureSeededBeforeMutation();

    const cleanTitle = input.title.trim().slice(0, VALIDATION_LIMITS.POST_TITLE_MAX);
    const cleanCategory = (input.category.trim() || 'Stories').slice(
      0,
      VALIDATION_LIMITS.POST_CATEGORY_MAX
    );
    const cleanCollection = (input.collection.trim() || 'Featured').slice(
      0,
      VALIDATION_LIMITS.POST_COLLECTION_MAX
    );
    const cleanContent = input.content.trim().slice(0, VALIDATION_LIMITS.POST_CONTENT_MAX);
    const cleanExcerpt = (
      input.excerpt.trim() || cleanContent.slice(0, 180)
    ).slice(0, VALIDATION_LIMITS.POST_EXCERPT_MAX);

    const validImages = input.images
      .map((img) => img.trim())
      .filter((img) => img.length > 0 && img.length <= VALIDATION_LIMITS.POST_IMAGE_MAX_CHARS)
      .slice(0, VALIDATION_LIMITS.POST_IMAGES_MAX_COUNT);

    if (!cleanTitle) throw new Error('Title is required.');
    if (!cleanContent) throw new Error('Story content is required.');
    if (validImages.length === 0) throw new Error('At least one image is required.');

    const cleanSlug =
      input.slug && VALIDATION_LIMITS.ID_REGEX.test(input.slug)
        ? input.slug.slice(0, VALIDATION_LIMITS.POST_SLUG_MAX)
        : slugifyTitle(cleanTitle);

    const existingPost = allPostsForAdmin.find((p) => p.id === input.id);
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

    await ensureSeededBeforeMutation(postId);

    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      await setDoc(doc(db, 'settings', 'site_state'), {
        initialized: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const seedInitialStoriesToFirestore = async (): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can seed stories.`);
    }
    for (const story of INITIAL_STORIES) {
      const path = `posts/${story.id}`;
      try {
        await setDoc(doc(db, 'posts', story.id), {
          title: story.title,
          slug: story.slug,
          excerpt: story.excerpt,
          content: story.content,
          category: story.category,
          collection: story.collection,
          coverImage: story.coverImage,
          images: story.images,
          authorEmail: user.email,
          published: true,
          createdAt: Timestamp.fromDate(story.createdAt),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
    await setDoc(doc(db, 'settings', 'site_state'), {
      initialized: true,
      updatedAt: serverTimestamp(),
    });
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
        seedInitialStoriesToFirestore,
        categories,
        collections,
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
