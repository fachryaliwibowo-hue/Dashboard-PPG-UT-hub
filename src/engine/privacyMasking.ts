export function maskPtkId(ptkId: string, enabled: boolean): string {
  const s = ptkId.trim();
  if (!enabled || !s) return ptkId;
  if (s.length <= 3) return `${s[0]}**`;
  if (s.length <= 6) {
    return `${s.slice(0, 2)}${'*'.repeat(s.length - 3)}${s.slice(-1)}`;
  }
  return `${s.slice(0, 4)}${'*'.repeat(Math.max(4, s.length - 6))}${s.slice(-2)}`;
}

export function maskAkunSimpkb(akun: string, enabled: boolean): string {
  const s = akun.trim();
  if (!enabled || !s) return akun;

  const atIndex = s.indexOf('@');
  if (atIndex > 0) {
    const local = s.slice(0, atIndex);
    const domain = s.slice(atIndex);
    const keep = Math.min(4, Math.max(2, Math.floor(local.length / 3)));
    const stars = '*'.repeat(Math.max(4, local.length - keep));
    return `${local.slice(0, keep)}${stars}${domain}`;
  }

  return maskPtkId(s, true);
}

export function maskPersonName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word) => {
      if (word.length <= 1) return '*';
      if (word.length <= 3) return `${word[0]}${'*'.repeat(word.length - 1)}`;
      return `${word.slice(0, 2)}${'*'.repeat(word.length - 2)}`;
    })
    .join(' ');
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildPlacementLookupId(
  kind: 'ptk' | 'simpkb',
  rawIdentifier: string
): Promise<string> {
  const normalized = rawIdentifier.trim().toLowerCase();
  const hex = await sha256Hex(`${kind}:${normalized}`);
  return `${kind}_${hex}`;
}

export async function buildAnonymizedPtkToken(ptkId: string): Promise<string> {
  const normalized = ptkId.trim().toLowerCase();
  if (!normalized) return '';
  const hex = await sha256Hex(`ptk_tok:${normalized}`);
  return hex.slice(0, 24);
}
