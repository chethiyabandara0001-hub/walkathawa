const R2_API_ENDPOINTS = [
  '/api/r2',
  'https://ais-dev-ca6ojtarha2uogyhz5lcii-163749283160.asia-southeast1.run.app/api/r2',
  'https://ais-pre-ca6ojtarha2uogyhz5lcii-163749283160.asia-southeast1.run.app/api/r2',
];

async function requestR2Endpoint(
  method: 'GET' | 'POST' | 'DELETE',
  bodyObj?: Record<string, unknown>
): Promise<any> {
  let lastError = 'Cloudflare R2 endpoint unreachable.';

  for (const endpoint of R2_API_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method,
        headers: bodyObj ? { 'Content-Type': 'application/json' } : undefined,
        body: bodyObj ? JSON.stringify(bodyObj) : undefined,
      });

      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        lastError = `Endpoint ${endpoint} returned non-JSON (HTTP ${resp.status}).`;
        continue;
      }

      const data = await resp.json();
      if (!resp.ok) {
        lastError = data?.error || `HTTP ${resp.status} from ${endpoint}`;
        if (resp.status === 503 || resp.status === 405 || resp.status === 404) {
          continue;
        }
        throw new Error(lastError);
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError);
}

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

/**
 * Optimizes an image file on the client (compressed WebP up to 1280x960) and uploads
 * the binary payload to Cloudflare R2 CDN via `/api/r2`, returning the R2 image URL
 * to be saved in Firestore.
 *
 * Raw base64 images are NEVER saved in Firestore.
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
        // Step down quality if payload is still large so CDN delivery stays under ~250KB
        if (dataUrl.startsWith('data:image/webp') && dataUrl.length > 450000) {
          dataUrl = canvas.toDataURL(contentType, 0.72);
        }
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 3500000) {
          contentType = 'image/jpeg';
          dataUrl = canvas.toDataURL(contentType, 0.78);
        }

        resolve({ dataUrl, contentType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function isR2StoredUrl(url: string): boolean {
  const trimmed = String(url || '').trim();
  return (
    trimmed.includes('.r2.dev/') ||
    trimmed.includes('/api/r2?key=') ||
    trimmed.includes('r2.cloudflarestorage.com/')
  );
}

export async function uploadImageFileToR2(file: File): Promise<string> {
  const { dataUrl, contentType } = await optimizeImageForR2(file);

  const data = await requestR2Endpoint('POST', {
    fileName: file.name || 'story-image.webp',
    contentType,
    base64Data: dataUrl,
  });

  if (!data?.url) {
    throw new Error('Cloudflare R2 did not return an image URL.');
  }

  return data.url;
}

/**
 * Transfers an external image URL or a legacy base64 data URL into Cloudflare R2
 * and returns the public R2 URL to store in Firestore.
 */
export async function transferImageToR2(
  sourceOrDataUrl: string,
  fileName = 'story-image.jpg'
): Promise<string> {
  const clean = String(sourceOrDataUrl || '').trim();
  if (!clean) {
    throw new Error('Empty image source.');
  }
  if (isR2StoredUrl(clean)) {
    return clean;
  }

  const payload = clean.startsWith('data:')
    ? { fileName, base64Data: clean }
    : { fileName, sourceUrl: clean };

  try {
    const data = await requestR2Endpoint('POST', payload);
    if (data?.url) {
      return data.url;
    }
  } catch (err) {
    // If an external https:// URL blocks server-side downloading (hotlink protection),
    // try downloading in browser and uploading bytes to R2; if CORS blocks browser fetch too,
    // allow the https:// link so adding an image URL never fails.
    if (/^https?:\/\//i.test(clean)) {
      try {
        const clientResp = await fetch(clean);
        if (clientResp.ok) {
          const blob = await clientResp.blob();
          const fileObj = new File([blob], fileName, {
            type: blob.type || 'image/jpeg',
          });
          return await uploadImageFileToR2(fileObj);
        }
      } catch {
        // Fallback to direct https:// URL if remote server blocks CORS/fetch
      }
      return clean;
    }
    throw err;
  }

  throw new Error('Failed to transfer image to Cloudflare R2.');
}

export async function deleteImageFromR2(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) return;
  try {
    await requestR2Endpoint('DELETE', { url: imageUrl });
  } catch (err) {
    console.warn('Non-fatal warning deleting R2 object:', err);
  }
}

export async function checkR2Status(): Promise<{
  configured: boolean;
  bucket: string | null;
  publicUrl?: string | null;
  hasPublicUrl: boolean;
}> {
  try {
    const data = await requestR2Endpoint('GET');
    if (data && typeof data.configured === 'boolean') {
      return data;
    }
    return { configured: false, bucket: null, hasPublicUrl: false };
  } catch {
    return { configured: false, bucket: null, hasPublicUrl: false };
  }
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
