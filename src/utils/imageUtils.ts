/**
 * Optimizes an image file on the client (WebP/JPEG up to 1600x1200) and uploads
 * the binary payload to Cloudflare R2 via `/api/r2`, returning the R2 image URL
 * to be saved in Firestore.
 *
 * Raw base64 images are NEVER saved in Firestore.
 */
export async function optimizeImageForR2(
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.85
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
        if (!dataUrl.startsWith('data:image/webp') || dataUrl.length > 3500000) {
          contentType = 'image/jpeg';
          dataUrl = canvas.toDataURL(contentType, 0.82);
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

  const response = await fetch('/api/r2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name || 'story-image.webp',
      contentType,
      base64Data: dataUrl,
    }),
  });

  let data: { url?: string; key?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(`Upload to Cloudflare R2 failed (HTTP ${response.status}).`);
  }

  if (!response.ok || !data.url) {
    throw new Error(
      data.error || `Failed to upload image to Cloudflare R2 (HTTP ${response.status}).`
    );
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

  const response = await fetch('/api/r2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data: { url?: string; key?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    throw new Error(`Transfer to Cloudflare R2 failed (HTTP ${response.status}).`);
  }

  if (!response.ok || !data.url) {
    throw new Error(
      data.error || `Failed to transfer image to Cloudflare R2 (HTTP ${response.status}).`
    );
  }

  return data.url;
}

export async function deleteImageFromR2(imageUrl: string): Promise<void> {
  if (!imageUrl || imageUrl.startsWith('data:')) return;
  try {
    await fetch('/api/r2', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: imageUrl }),
    });
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
    const resp = await fetch('/api/r2');
    if (!resp.ok) {
      return { configured: false, bucket: null, hasPublicUrl: false };
    }
    return await resp.json();
  } catch {
    return { configured: false, bucket: null, hasPublicUrl: false };
  }
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  const suffix = Math.random().toString(36).substring(2, 7);
  return base ? `${base}-${suffix}` : `story-${Date.now()}`;
}

export function generateSafeId(prefix = 'id'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}
