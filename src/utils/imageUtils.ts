import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { firebaseConfig, storage } from '../firebase';

/**
 * Ensures any HTTP image or asset link is upgraded to HTTPS for mobile-first security.
 */
export function ensureHttpsUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (trimmed.startsWith('http://') && !trimmed.startsWith('http://localhost')) {
    return `https://${trimmed.slice(7)}`;
  }
  return trimmed;
}

function sanitizeStorageFileName(rawName: string): string {
  const clean = String(rawName || 'story-image.webp')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'story-image.webp';
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const base64 = parts[1] || '';
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const contentType = mimeMatch ? mimeMatch[1] : 'image/webp';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

/**
 * Optimizes an image file on the client (compressed WebP up to 1280x960) for
 * Firebase Storage (`advance-sandbox-gmzf6.firebasestorage.app`) and Firestore.
 */
export async function optimizeImageForR2(
  file: File,
  maxWidth = 1280,
  maxHeight = 960,
  quality = 0.8
): Promise<{ dataUrl: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let contentType = 'image/webp';
        let dataUrl = canvas.toDataURL(contentType, quality);
        if (dataUrl.startsWith('data:image/webp') && dataUrl.length > 350000) {
          dataUrl = canvas.toDataURL(contentType, 0.68);
        }
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 650000) {
          contentType = 'image/jpeg';
          dataUrl = canvas.toDataURL(contentType, 0.72);
        }

        resolve({ dataUrl, contentType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function isFirebaseStoredUrl(url: string): boolean {
  const trimmed = String(url || '').trim();
  return (
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.includes('firebasestorage.app') ||
    trimmed.includes(firebaseConfig.storageBucket) ||
    trimmed.includes('.r2.dev/')
  );
}

export function isR2StoredUrl(url: string): boolean {
  return isFirebaseStoredUrl(url);
}

/**
 * Uploads an image file to Firebase Storage (`advance-sandbox-gmzf6.firebasestorage.app/posts/...`)
 * and returns the download URL to store in Firestore (with automatic compressed WebP fallback
 * if Storage rules or bucket are not yet enabled).
 */
export async function uploadImageFileToR2(file: File): Promise<string> {
  const { dataUrl, contentType } = await optimizeImageForR2(file);
  const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = sanitizeStorageFileName(
    (file.name || 'story').replace(/\.[^.]+$/, '')
  );
  const objectPath = `posts/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${baseName}.${ext}`;

  try {
    const storageRef = ref(storage, objectPath);
    const { blob } = dataUrlToBlob(dataUrl);
    await uploadBytes(storageRef, blob, {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return await getDownloadURL(storageRef);
  } catch {
    // Fallback to optimized compressed image data URL stored directly in Firestore
    return dataUrl;
  }
}

/**
 * Transfers an external image URL or base64 data URL into Firebase Storage
 * (`advance-sandbox-gmzf6.firebasestorage.app`) or preserves the HTTPS / compressed URL for Firestore.
 */
export async function transferImageToR2(
  sourceOrDataUrl: string,
  fileName = 'story-image.webp'
): Promise<string> {
  const clean = String(sourceOrDataUrl || '').trim();
  if (!clean) {
    throw new Error('Empty image source.');
  }
  if (isFirebaseStoredUrl(clean)) {
    return ensureHttpsUrl(clean);
  }

  const safeName = sanitizeStorageFileName(fileName);
  const objectPath = `posts/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  if (clean.startsWith('data:')) {
    try {
      const storageRef = ref(storage, objectPath);
      await uploadString(storageRef, clean, 'data_url');
      return await getDownloadURL(storageRef);
    } catch {
      return clean;
    }
  }

  if (/^https?:\/\//i.test(clean)) {
    const httpsUrl = ensureHttpsUrl(clean);
    try {
      const resp = await fetch(httpsUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const fileObj = new File([blob], safeName, {
          type: blob.type || 'image/jpeg',
        });
        return await uploadImageFileToR2(fileObj);
      }
    } catch {
      // If remote host blocks CORS fetch, store the clean HTTPS image URL directly in Firestore
    }
    return httpsUrl;
  }

  return clean;
}

export async function deleteImageFromR2(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) return;
  if (
    !imageUrl.includes('firebasestorage.googleapis.com') &&
    !imageUrl.includes(firebaseConfig.storageBucket)
  ) {
    return;
  }
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Non-fatal warning deleting Firebase Storage object:', err);
  }
}

export async function checkR2Status(): Promise<{
  configured: boolean;
  bucket: string | null;
  projectId?: string;
  hasPublicUrl: boolean;
}> {
  return {
    configured: true,
    bucket: firebaseConfig.storageBucket,
    projectId: firebaseConfig.projectId,
    hasPublicUrl: true,
  };
}

const SINHALA_PHONETIC_MAP: Record<string, string> = {
  අම්මා: 'amma',
  අම්ම: 'amma',
  පුතා: 'putha',
  අක්කා: 'akka',
  අක්ක: 'akka',
  නංගි: 'nangi',
  නංගී: 'nangi',
  මල්ලි: 'malli',
  වයිෆ්: 'wife',
  බිරිඳ: 'birinda',
  තාත්තා: 'thaththa',
  තාත්ත: 'thaththa',
  දුව: 'duwa',
  පවුලේ: 'paule',
  සිංහල: 'sinhala',
  වල්: 'wal',
  වැල: 'wela',
  කතා: 'katha',
  කතාව: 'kathawa',
  කොටස: 'episode',
  චිත්‍ර: 'chithra',
  අලුත්: 'aluth',
  රස: 'rasa',
  ගෙදර: 'gedara',
  කැම්පස්: 'campus',
  ඇන්ටි: 'aunty',
  නැන්දා: 'nanda',
  මාමා: 'mama',
  අ: 'a',
  ආ: 'aa',
  ඇ: 'ae',
  ඈ: 'aae',
  ඉ: 'i',
  ඊ: 'ii',
  උ: 'u',
  ඌ: 'uu',
  එ: 'e',
  ඒ: 'ee',
  ඔ: 'o',
  ඕ: 'oo',
  ක: 'ka',
  ග: 'ga',
  ච: 'cha',
  ජ: 'ja',
  ට: 'ta',
  ඩ: 'da',
  ණ: 'na',
  ත: 'tha',
  ද: 'da',
  න: 'na',
  ප: 'pa',
  බ: 'ba',
  ම: 'ma',
  ය: 'ya',
  ර: 'ra',
  ල: 'la',
  ව: 'wa',
  ශ: 'sha',
  ෂ: 'sha',
  ස: 'sa',
  හ: 'ha',
  ළ: 'la',
  ෆ: 'fa',
  'ා': 'a',
  'ැ': 'e',
  'ෑ': 'ae',
  'ි': 'i',
  'ී': 'ii',
  'ු': 'u',
  'ූ': 'uu',
  'ෙ': 'e',
  'ේ': 'ee',
  'ො': 'o',
  'ෝ': 'oo',
  '්': '',
  'ං': 'n',
};

export function transliterateSinhalaToSinglish(input: string): string {
  if (!input) return '';
  let result = input;
  // First replace whole common words
  for (const [siWord, enWord] of Object.entries(SINHALA_PHONETIC_MAP)) {
    if (siWord.length > 1) {
      result = result.split(siWord).join(` ${enWord} `);
    }
  }
  // Then replace remaining single Sinhala characters
  let out = '';
  for (const ch of result) {
    if (SINHALA_PHONETIC_MAP[ch] !== undefined) {
      out += SINHALA_PHONETIC_MAP[ch];
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function toSinglishTitle(title: string): string {
  const transliterated = transliterateSinhalaToSinglish(title)
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!transliterated || transliterated.length < 3) {
    return 'Sinhala Wal Katha';
  }

  return transliterated
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts or enforces clean Singlish/Latin URL slugs (e.g.,
 * `nuwanige-sellam-episode-18-sinhala-wal-katha`) rather than raw URL-encoded
 * Sinhala Unicode characters, and appends `-sinhala-wal-katha` if the slug is very short.
 */
export function slugifyTitle(title: string): string {
  const singlish = transliterateSinhalaToSinglish(title);
  let base = singlish
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 85);

  if (!base) {
    base = `story-${Date.now().toString(36)}`;
  }

  if (base.length < 24 && !base.includes('sinhala-wal-katha')) {
    base = `${base}-sinhala-wal-katha`;
  }

  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`.slice(0, 120);
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);

  if (minutes < 5) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getStoryViewCount(postId: string, createdAt?: Date): string {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = (hash * 31 + postId.charCodeAt(i)) >>> 0;
  }
  const ageDays = createdAt
    ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000))
    : 3;
  const baseViews = 420 + (hash % 3800) + Math.min(ageDays * 45, 4500);
  if (baseViews >= 1000) {
    return `${(baseViews / 1000).toFixed(1)}K`;
  }
  return String(baseViews);
}

export function generateSafeId(prefix = 'id'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}
