import React, { createContext, useContext, useEffect, useState } from 'react';
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
  updateDoc,
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

interface CreatePostInput {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  collection: string;
  images: string[];
}

interface UpdatePostInput extends CreatePostInput {
  id: string;
  slug: string;
}

interface AppContextType {
  user: User | null;
  isAdmin: boolean;
  authReady: boolean;
  posts: StoryPost[];
  firestorePostsCount: number;
  loadingPosts: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<string>;
  updatePost: (input: UpdatePostInput) => Promise<void>;
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
  const [loadingPosts, setLoadingPosts] = useState(true);
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
            createdAt,
            updatedAt,
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
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      user.emailVerified
  );

  // Combine Firestore posts (newest first) or fall back to INITIAL_STORIES when Firestore has 0 posts
  const posts: StoryPost[] =
    firestorePosts.length > 0 ? firestorePosts : INITIAL_STORIES;

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

  const createPost = async (input: CreatePostInput): Promise<string> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can create posts.`);
    }

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
        createdAt: serverTimestamp(),
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

    const path = `posts/${input.id}`;
    try {
      await updateDoc(doc(db, 'posts', input.id), {
        title: cleanTitle,
        slug: cleanSlug,
        excerpt: cleanExcerpt,
        content: cleanContent,
        category: cleanCategory,
        collection: cleanCollection,
        coverImage: validImages[0],
        images: validImages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deletePost = async (postId: string): Promise<void> => {
    if (!user || !isAdmin) {
      throw new Error(`Only verified admin (${ADMIN_EMAIL}) can delete posts.`);
    }
    const path = `posts/${postId}`;
    try {
      await deleteDoc(doc(db, 'posts', postId));
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAdmin,
        authReady,
        posts,
        firestorePostsCount: firestorePosts.length,
        loadingPosts,
        theme,
        toggleTheme,
        signInWithGoogle,
        signOut,
        createPost,
        updatePost,
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
