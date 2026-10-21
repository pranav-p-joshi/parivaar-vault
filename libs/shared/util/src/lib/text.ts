export function initials(name: string, max = 2): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Stable small integer for a string, handy for picking a colour. */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function normalizeTags(raw: string | string[]): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(',');
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = part.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Masks all but the last `visible` characters, e.g. "XXXX XXXX 1234". */
export function maskNumber(value: string | undefined, visible = 4): string {
  if (!value) return '';
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= visible) return compact;
  const masked = 'X'.repeat(compact.length - visible) + compact.slice(-visible);
  return masked.replace(/(.{4})(?=.)/g, '$1 ');
}
