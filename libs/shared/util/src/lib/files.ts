export function isImageMime(mime: string | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

export function isPdfMime(mime: string | undefined): boolean {
  return mime === 'application/pdf';
}

export interface CompressImageOptions {
  /** Longest edge in pixels after resizing. */
  maxDimension?: number;
  /** JPEG quality 0..1. */
  quality?: number;
}

/**
 * Downscales and re-encodes an image as JPEG to keep the vault small.
 * Returns the original blob when it is not an image or the browser lacks canvas support.
 */
export async function compressImage(
  blob: Blob,
  { maxDimension = 1800, quality = 0.85 }: CompressImageOptions = {},
): Promise<Blob> {
  if (!isImageMime(blob.type) || typeof createImageBitmap !== 'function') {
    return blob;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

/** Triggers a browser download for a blob. No-op outside the browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
