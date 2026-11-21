import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  extractPlainText,
  normalizeLegacyOrRichHtml,
  sanitizeRichHtml,
} from '../engine/richTextSanitizer';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (sanitizedHtml: string) => void;
  placeholder?: string;
  maxHtmlLength?: number;
}

const FONT_SIZE_OPTIONS = [
  { label: '12px · Kecil', value: '12px' },
  { label: '14px · Normal', value: '14px' },
  { label: '16px · Sedang', value: '16px' },
  { label: '18px · Besar', value: '18px' },
  { label: '22px · Subjudul', value: '22px' },
  { label: '26px · Judul', value: '26px' },
];

const TEXT_COLORS = [
  { label: 'Navy UT (Standar)', value: '#17365D' },
  { label: 'Biru UT', value: '#0066A4' },
  { label: 'Merah Penting', value: '#DC2626' },
  { label: 'Hijau', value: '#16A34A' },
  { label: 'Oranye', value: '#D97706' },
  { label: 'Abu Gelap', value: '#475569' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Tanpa Stabilo', value: 'transparent' },
  { label: 'Kuning', value: '#FEF08A' },
  { label: 'Biru Muda', value: '#BAE6FD' },
  { label: 'Hijau Muda', value: '#BBF7D0' },
  { label: 'Merah Muda', value: '#FECACA' },
];

export const RICH_TEXT_VIEW_CLASSES =
  'text-[#17365D] leading-relaxed break-words [&_p]:my-1 [&_div]:my-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_a]:text-[#0066A4] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#0066A4]/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onChange,
  placeholder = 'Tuliskan catatan, jadwal, atau pengumuman penting terkait lokasi perkuliahan...',
  maxHtmlLength = 15000,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeFontSize, setActiveFontSize] = useState('14px');
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    unorderedList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });

  const [openMenu, setOpenMenu] = useState<'color' | 'highlight' | 'link' | null>(null);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [plainLength, setPlainLength] = useState(0);
  const [htmlLength, setHtmlLength] = useState(0);

  // Hydrate editor once on mount
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const hydrated = sanitizeRichHtml(normalizeLegacyOrRichHtml(initialValue));
    el.innerHTML = hydrated;
    setPlainLength(extractPlainText(hydrated).length);
    setHtmlLength(hydrated.length);
  }, []);

  // Close popovers when clicking outside editor container
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const syncContentUp = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sanitized = sanitizeRichHtml(el.innerHTML);
    setPlainLength(extractPlainText(sanitized).length);
    setHtmlLength(sanitized.length);
    onChange(sanitized);
  }, [onChange]);

  const saveCurrentSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSavedSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }, []);

  const updateToolbarState = useCallback(() => {
    saveCurrentSelection();
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
      });

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement;
        }
        if (node instanceof HTMLElement && editorRef.current?.contains(node)) {
          const computedSize = window.getComputedStyle(node).fontSize;
          const matched = FONT_SIZE_OPTIONS.find((opt) => opt.value === computedSize);
          if (matched) {
            setActiveFontSize(matched.value);
          }
        }
      }
    } catch {
      // Ignore queryCommandState errors when selection is outside editable area
    }
  }, [saveCurrentSelection]);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      restoreSavedSelection();
      document.execCommand(command, false, value);
      syncContentUp();
      updateToolbarState();
    },
    [restoreSavedSelection, syncContentUp, updateToolbarState]
  );

  const handleFontSizeChange = (nextSize: string) => {
    setActiveFontSize(nextSize);
    restoreSavedSelection();

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      // Use marker fontSize 7, then replace all <font size="7"> with exact pixel span
      document.execCommand('fontSize', false, '7');
      const editorEl = editorRef.current;
      if (editorEl) {
        const fontTags = editorEl.querySelectorAll('font[size="7"]');
        fontTags.forEach((fontEl) => {
          const span = document.createElement('span');
          span.style.fontSize = nextSize;
          while (fontEl.firstChild) {
            span.appendChild(fontEl.firstChild);
          }
          fontEl.parentNode?.replaceChild(span, fontEl);
        });
      }
    } else if (sel && sel.rangeCount > 0) {
      // If cursor is collapsed, insert a zero-width-free styled span or wrap current block
      const span = document.createElement('span');
      span.style.fontSize = nextSize;
      span.innerHTML = '&#8203;';
      const range = sel.getRangeAt(0);
      range.insertNode(span);
      const nextRange = document.createRange();
      nextRange.setStart(span.firstChild ?? span, 1);
      nextRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nextRange);
    }

    syncContentUp();
    updateToolbarState();
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkUrl.trim();
    if (!trimmed || trimmed === 'https://') {
      setOpenMenu(null);
      return;
    }
    const safeUrl = /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    restoreSavedSelection();
    document.execCommand('createLink', false, safeUrl);
    // Ensure links open in new tab safely
    editorRef.current?.querySelectorAll('a').forEach((anchor) => {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
    setOpenMenu(null);
    setLinkUrl('https://');
    syncContentUp();
  };

  const ToolbarButton: React.FC<{
    active?: boolean;
    title: string;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active = false, title, onClick, children }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        saveCurrentSelection();
      }}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors shrink-0 ${
        active
          ? 'bg-[#0066A4] text-white'
          : 'text-[#17365D] hover:bg-[#EAF3F9] hover:text-[#0066A4]'
      }`}
    >
      {children}
    </button>
  );

  const isNearHtmlLimit = htmlLength > maxHtmlLength * 0.9;

  return (
    <div ref={containerRef} className="border border-slate-200 rounded-xl bg-white overflow-visible">
      {/* Word-Style Toolbar */}
      <div className="bg-[#F5F7FA] border-b border-slate-200 px-2.5 py-2 rounded-t-xl flex flex-wrap items-center gap-1 relative">
        {/* Undo / Redo */}
        <ToolbarButton title="Urungkan (Ctrl+Z)" onClick={() => execCommand('undo')}>
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Ulangi (Ctrl+Y)" onClick={() => execCommand('redo')}>
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Font Size Selector */}
        <select
          aria-label="Ukuran Font"
          title="Ukuran Font"
          value={activeFontSize}
          onMouseDown={() => saveCurrentSelection()}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className="text-xs font-medium text-[#17365D] bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#0066A4]"
        >
          {FONT_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Bold, Italic, Underline, Strikethrough */}
        <ToolbarButton
          active={activeStates.bold}
          title="Tebal / Bold (Ctrl+B)"
          onClick={() => execCommand('bold')}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.italic}
          title="Miring / Italic (Ctrl+I)"
          onClick={() => execCommand('italic')}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.underline}
          title="Garis Bawah / Underline (Ctrl+U)"
          onClick={() => execCommand('underline')}
        >
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.strikeThrough}
          title="Coret / Strikethrough"
          onClick={() => execCommand('strikeThrough')}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Text Color Picker */}
        <div className="relative">
          <ToolbarButton
            active={openMenu === 'color'}
            title="Warna Teks"
            onClick={() => {
              saveCurrentSelection();
              setOpenMenu((prev) => (prev === 'color' ? null : 'color'));
            }}
          >
            <Palette className="w-3.5 h-3.5" />
          </ToolbarButton>
          {openMenu === 'color' && (
            <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 w-44 space-y-1.5">
              <div className="text-[11px] font-semibold text-[#17365D]">Warna Teks</div>
              <div className="grid grid-cols-3 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      execCommand('foreColor', c.value);
                      setOpenMenu(null);
                    }}
                    className="h-7 rounded border border-slate-200 flex items-center justify-center text-[11px] font-bold hover:scale-105 transition-transform"
                    style={{ color: c.value }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div className="relative">
          <ToolbarButton
            active={openMenu === 'highlight'}
            title="Warna Stabilo / Latar Teks"
            onClick={() => {
              saveCurrentSelection();
              setOpenMenu((prev) => (prev === 'highlight' ? null : 'highlight'));
            }}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </ToolbarButton>
          {openMenu === 'highlight' && (
            <div className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 w-48 space-y-1.5">
              <div className="text-[11px] font-semibold text-[#17365D]">Warna Stabilo</div>
              <div className="space-y-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      execCommand('hiliteColor', c.value);
                      setOpenMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-[#17365D] hover:bg-[#F5F7FA] text-left"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
                      style={{ backgroundColor: c.value === 'transparent' ? '#FFFFFF' : c.value }}
                    />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Alignment */}
        <ToolbarButton
          active={activeStates.justifyLeft}
          title="Rata Kiri"
          onClick={() => execCommand('justifyLeft')}
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.justifyCenter}
          title="Rata Tengah"
          onClick={() => execCommand('justifyCenter')}
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.justifyRight}
          title="Rata Kanan"
          onClick={() => execCommand('justifyRight')}
        >
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.justifyFull}
          title="Rata Kiri-Kanan (Justify)"
          onClick={() => execCommand('justifyFull')}
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Lists & Indentation */}
        <ToolbarButton
          active={activeStates.unorderedList}
          title="Daftar Poin (Bullet List)"
          onClick={() => execCommand('insertUnorderedList')}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={activeStates.orderedList}
          title="Daftar Bernomor (Numbered List)"
          onClick={() => execCommand('insertOrderedList')}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Kurangi Indentasi" onClick={() => execCommand('outdent')}>
          <IndentDecrease className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Tambah Indentasi" onClick={() => execCommand('indent')}>
          <IndentIncrease className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-300 mx-1" aria-hidden="true" />

        {/* Insert Link */}
        <div className="relative">
          <ToolbarButton
            active={openMenu === 'link'}
            title="Sisipkan Tautan (Link)"
            onClick={() => {
              saveCurrentSelection();
              setOpenMenu((prev) => (prev === 'link' ? null : 'link'));
            }}
          >
            <Link2 className="w-3.5 h-3.5" />
          </ToolbarButton>
          {openMenu === 'link' && (
            <form
              onSubmit={handleApplyLink}
              className="absolute right-0 sm:left-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-64 space-y-2"
            >
              <div className="text-[11px] font-semibold text-[#17365D]">
                Sisipkan Alamat Tautan
              </div>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://contoh.ut.ac.id"
                className="w-full px-2.5 py-1.5 text-xs bg-[#F5F7FA] border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-[#0066A4]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded"
                >
                  Terapkan
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Clear Formatting */}
        <ToolbarButton title="Hapus Pemformatan" onClick={() => execCommand('removeFormat')}>
          <RemoveFormatting className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editable Document Canvas */}
      <div className="relative">
        {plainLength === 0 && (
          <div className="pointer-events-none absolute left-4 top-3 text-xs text-slate-400">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Editor Catatan Lokasi Perkuliahan"
          onInput={syncContentUp}
          onKeyUp={updateToolbarState}
          onMouseUp={updateToolbarState}
          onBlur={saveCurrentSelection}
          className={`min-h-[160px] max-h-[420px] overflow-y-auto px-4 py-3 text-[14px] focus:outline-none ${RICH_TEXT_VIEW_CLASSES}`}
        />
      </div>

      {/* Footer Status */}
      <div className="px-3.5 py-2 border-t border-slate-100 bg-[#F5F7FA]/60 rounded-b-xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 tabular-nums">
        <span>
          Gunakan toolbar di atas untuk memformat teks (tebal, miring, garis bawah, ukuran font, warna, perataan, daftar).
        </span>
        <span className={isNearHtmlLimit ? 'text-amber-700 font-semibold' : ''}>
          {plainLength.toLocaleString('id-ID')} karakter teks ·{' '}
          {htmlLength.toLocaleString('id-ID')} / {maxHtmlLength.toLocaleString('id-ID')} kapasitas format
        </span>
      </div>
    </div>
  );
};
