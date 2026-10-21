import type { ExpiryStatus, IsoDate } from '@pranav/shared-models';

const DAY_MS = 86_400_000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses YYYY-MM-DD as a local date at midnight. */
export function parseIsoDate(iso: IsoDate): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parses dates as printed on Indian documents (dd/mm/yyyy, dd-mm-yyyy,
 * dd.mm.yyyy) as well as ISO yyyy-mm-dd. Returns null when unrecognised.
 */
export function parseAnyDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const text = value.trim();
  const iso = parseIsoDate(text);
  if (iso) return iso;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (!dmy) return null;
  const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Converts any supported date text to ISO yyyy-mm-dd, or undefined. */
export function toIsoFromAny(
  value: string | undefined | null,
): IsoDate | undefined {
  const date = parseAnyDate(value);
  return date ? toIsoDate(date) : undefined;
}

/** Whole days from `from` (default today) until `value`. Negative when in the past. */
export function daysUntil(value: string, from: Date = new Date()): number {
  const target = parseAnyDate(value);
  if (!target) return Number.NaN;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / DAY_MS);
}

export const EXPIRY_CRITICAL_DAYS = 30;
export const EXPIRY_SOON_DAYS = 90;

export function expiryStatus(
  expiryDate: string | undefined | null,
  from: Date = new Date(),
): ExpiryStatus {
  if (!expiryDate) return 'none';
  const days = daysUntil(expiryDate, from);
  if (Number.isNaN(days)) return 'none';
  if (days < 0) return 'expired';
  if (days <= EXPIRY_CRITICAL_DAYS) return 'critical';
  if (days <= EXPIRY_SOON_DAYS) return 'soon';
  return 'ok';
}

export function formatDate(value?: string | null, locale = 'en-IN'): string {
  if (!value) return '';
  const date = parseAnyDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeDays(days: number): string {
  if (Number.isNaN(days)) return '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `In ${days} days`;
}
