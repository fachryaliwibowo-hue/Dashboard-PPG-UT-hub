import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { FilterOption } from '../engine/filteringEngine';

interface SearchableMultiSelectProps {
  label: string;
  placeholder?: string;
  options: FilterOption[];
  selected: string[];
  onChange: (nextSelected: string[]) => void;
  singleSelect?: boolean;
  allLabel?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  placeholder = 'Semua',
  options,
  selected,
  onChange,
  singleSelect = false,
  allLabel = 'Semua',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, search]);

  const toggleOption = (value: string) => {
    if (singleSelect) {
      if (selected.includes(value)) {
        onChange([]);
      } else {
        onChange([value]);
      }
      setIsOpen(false);
      return;
    }

    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displaySummary = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} dipilih`;
  }, [selected, placeholder]);

  const hasSelection = selected.length > 0;

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label className="block text-[11px] font-semibold text-[#17365D]/70 mb-1 truncate">
        {label}
      </label>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs rounded-lg border transition-colors bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066A4] ${
            hasSelection
              ? 'border-[#0066A4] text-[#17365D] font-semibold bg-[#EAF3F9]/40'
              : 'border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <span className="truncate">{displaySummary}</span>
          <span className="flex items-center gap-1 shrink-0">
            {hasSelection && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`Hapus filter ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
                className="p-0.5 rounded hover:bg-slate-200/70 text-slate-500 hover:text-[#17365D]"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-40 mt-1.5 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-[#F5F7FA]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Cari ${label.toLowerCase()}...`}
                autoFocus
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-[#0066A4]"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {singleSelect && (
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-[#EAF3F9]/60 transition-colors ${
                  selected.length === 0 ? 'font-semibold text-[#0066A4] bg-[#EAF3F9]/40' : 'text-slate-700'
                }`}
              >
                <span className="truncate">{allLabel}</span>
                {selected.length === 0 && <Check className="w-3.5 h-3.5 text-[#0066A4] shrink-0" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                Tidak ada opsi yang cocok
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left hover:bg-[#EAF3F9]/60 transition-colors ${
                      isChecked ? 'bg-[#EAF3F9]/50 text-[#17365D] font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#0066A4] border-[#0066A4] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </span>
                      <span className="truncate" title={opt.value}>
                        {opt.value}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0">
                      {opt.count.toLocaleString('id-ID')}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {!singleSelect && selected.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-[#F5F7FA] flex items-center justify-between text-[11px]">
              <span className="text-slate-600 tabular-nums">{selected.length} terpilih</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[#0066A4] font-semibold hover:underline"
              >
                Bersihkan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
