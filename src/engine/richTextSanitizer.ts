const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'DIV',
  'SPAN',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'SUB',
  'SUP',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'A',
]);

const FONT_SIZE_MAP: Record<string, string> = {
  '1': '11px',
  '2': '12px',
  '3': '14px',
  '4': '16px',
  '5': '18px',
  '6': '22px',
  '7': '26px',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeColor(val: string): boolean {
  const v = val.trim().toLowerCase();
  if (v === 'transparent' || v === 'inherit') return true;
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return true;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(v)) {
    return true;
  }
  if (/^[a-z]{3,20}$/i.test(v)) return true;
  return false;
}

function sanitizeStyleString(rawStyle: string): string {
  const safeRules: string[] = [];
  const declarations = rawStyle.split(';');

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();
    if (!val) continue;

    if (prop === 'font-size') {
      if (/^\d{1,2}(\.\d+)?(px|pt|rem|em)$/i.test(val)) {
        safeRules.push(`font-size: ${val}`);
      }
    } else if (prop === 'color' || prop === 'background-color') {
      if (isSafeColor(val)) {
        safeRules.push(`${prop}: ${val}`);
      }
    } else if (prop === 'text-align') {
      if (/^(left|center|right|justify|start|end)$/i.test(val)) {
        safeRules.push(`text-align: ${val.toLowerCase()}`);
      }
    } else if (prop === 'font-weight') {
      if (/^(normal|bold|bolder|lighter|[1-9]00)$/i.test(val)) {
        safeRules.push(`font-weight: ${val.toLowerCase()}`);
      }
    } else if (prop === 'font-style') {
      if (/^(normal|italic|oblique)$/i.test(val)) {
        safeRules.push(`font-style: ${val.toLowerCase()}`);
      }
    } else if (prop === 'text-decoration' || prop === 'text-decoration-line') {
      if (/^(none|underline|line-through|underline line-through)$/i.test(val)) {
        safeRules.push(`${prop}: ${val.toLowerCase()}`);
      }
    } else if (prop === 'margin-left' || prop === 'padding-left') {
      if (/^\d{1,3}px$/i.test(val)) {
        safeRules.push(`${prop}: ${val}`);
      }
    }
  }

  return safeRules.join('; ');
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed)
  );
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();

  // Strip dangerous containers entirely
  if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'IFRAME' || tagName === 'OBJECT' || tagName === 'EMBED') {
    return null;
  }

  // Convert legacy <font> tags to <span> with clean inline styles
  let targetTag = tagName;
  let extraStyle = '';
  if (tagName === 'FONT') {
    targetTag = 'SPAN';
    const sizeAttr = el.getAttribute('size');
    const colorAttr = el.getAttribute('color');
    const parts: string[] = [];
    if (sizeAttr && FONT_SIZE_MAP[sizeAttr]) {
      parts.push(`font-size: ${FONT_SIZE_MAP[sizeAttr]}`);
    }
    if (colorAttr && isSafeColor(colorAttr)) {
      parts.push(`color: ${colorAttr}`);
    }
    extraStyle = parts.join('; ');
  }

  if (!ALLOWED_TAGS.has(targetTag)) {
    // Unwrap disallowed tags while preserving sanitized children
    const frag = doc.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const cleanChild = sanitizeNode(child, doc);
      if (cleanChild) frag.appendChild(cleanChild);
    }
    return frag;
  }

  const cleanEl = doc.createElement(targetTag.toLowerCase());

  const existingStyle = el.getAttribute('style') ?? '';
  const combinedStyle = [extraStyle, sanitizeStyleString(existingStyle)]
    .filter(Boolean)
    .join('; ');
  if (combinedStyle) {
    cleanEl.setAttribute('style', combinedStyle);
  }

  if (targetTag === 'A') {
    const href = el.getAttribute('href') ?? '';
    if (isSafeHref(href)) {
      cleanEl.setAttribute('href', href.trim());
      cleanEl.setAttribute('target', '_blank');
      cleanEl.setAttribute('rel', 'noopener noreferrer');
    }
  }

  for (const child of Array.from(el.childNodes)) {
    const cleanChild = sanitizeNode(child, doc);
    if (cleanChild) cleanEl.appendChild(cleanChild);
  }

  return cleanEl;
}

export function normalizeLegacyOrRichHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // If raw content has no HTML tags, preserve legacy line breaks safely
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return escapeHtml(trimmed).replace(/\r?\n/g, '<br>');
  }
  return trimmed;
}

export function sanitizeRichHtml(raw: string): string {
  const normalized = normalizeLegacyOrRichHtml(raw);
  if (!normalized) return '';

  if (typeof DOMParser === 'undefined') {
    return escapeHtml(raw);
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(normalized, 'text/html');
  const container = parsed.createElement('div');

  for (const child of Array.from(parsed.body.childNodes)) {
    const cleanChild = sanitizeNode(child, parsed);
    if (cleanChild) container.appendChild(cleanChild);
  }

  return container.innerHTML;
}

export function extractPlainText(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<[^>]+>/g, '').trim();
  }
  const parser = new DOMParser();
  const parsed = parser.parseFromString(rawHtml, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\u00A0/g, ' ').trim();
}

export function isRichTextEmpty(rawHtml: string): boolean {
  return extractPlainText(rawHtml).length === 0;
}
