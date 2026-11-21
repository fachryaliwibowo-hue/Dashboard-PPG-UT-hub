import { LectureLocation } from '../types/participant';

const GOOGLE_MAPS_HOST_PATTERN =
  /^(maps\.app\.goo\.gl|goo\.gl|g\.page|[a-z0-9-]+\.g\.page|([a-z0-9-]+\.)*google\.[a-z.]{2,})$/i;

export function normalizeGoogleMapsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length > 500) return null;

  let candidate = trimmed;
  if (
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate) &&
    /^(maps\.app\.goo\.gl|goo\.gl|g\.page|maps\.google\.|www\.google\.|google\.)/i.test(
      candidate
    )
  ) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    if (!GOOGLE_MAPS_HOST_PATTERN.test(parsed.hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getSafeGoogleMapsHref(
  loc: Pick<
    LectureLocation,
    'googleMapsUrl' | 'namaLokasi' | 'alamatLengkap' | 'kotaKab' | 'provinsi' | 'kodePos'
  >
): { href: string; isDirectPin: boolean } {
  const normalized = loc.googleMapsUrl
    ? normalizeGoogleMapsUrl(loc.googleMapsUrl)
    : '';
  if (normalized) {
    return { href: normalized, isDirectPin: true };
  }

  const queryText = [
    loc.namaLokasi,
    loc.alamatLengkap,
    loc.kotaKab,
    loc.provinsi,
    loc.kodePos,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  return {
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      queryText || 'Universitas Terbuka'
    )}`,
    isDirectPin: false,
  };
}
