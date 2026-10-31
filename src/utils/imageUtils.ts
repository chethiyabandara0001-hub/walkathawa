import { VALIDATION_LIMITS } from '../types';

/**
 * Compresses an uploaded image file on the client using HTML5 Canvas so that
 * multiple images can be safely saved directly inside a Firestore document
 * (< 1MB total document size limit).
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 1100,
  maxHeight = 850,
  quality = 0.76
): Promise<string> {
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

        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (dataUrl.length > 180000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.62);
        }
        if (dataUrl.length > VALIDATION_LIMITS.POST_IMAGE_MAX_CHARS) {
          reject(new Error('Image is still too large after compression. Please use a smaller image.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
