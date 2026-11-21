import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import {
  FilterOptionsCatalog,
  countActiveFilterDimensions,
  hasActiveFilters,
} from '../engine/filteringEngine';
import { GlobalFilters } from '../types/participant';
import { SearchableMultiSelect } from './SearchableMultiSelect';

interface GlobalFilterBarProps {
  filters: GlobalFilters;
  options: FilterOptionsCatalog;
  onUpdateFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  onResetFilters: () => void;
  totalFilteredUnique: number;
  totalFilteredRows: number;
  totalDatasetUnique: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  options,
  onUpdateFilter,
  onResetFilters,
  totalFilteredUnique,
  totalFilteredRows,
  totalDatasetUnique,
}) => {
  const active = hasActiveFilters(filters);
  const activeDims = countActiveFilterDimensions(filters);

  return (
    <section
      aria-label="Global Filter Dashboard"
      className="bg-white border border-slate-200 rounded-xl p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#17365D]">
          <Filter className="w-4 h-4 text-[#0066A4]" />
          <span>Global Filter Data</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-normal text-slate-600 tabular-nums">
            Menampilkan{' '}
            <strong className="font-semibold text-[#17365D]">
              {totalFilteredUnique.toLocaleString('id-ID')}
            </strong>{' '}
            peserta unik ({totalFilteredRows.toLocaleString('id-ID')} baris) dari{' '}
            {totalDatasetUnique.toLocaleString('id-ID')} peserta
          </span>
        </div>

        {active && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#17365D] bg-[#F5F7FA] hover:bg-[#EAF3F9] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0066A4]" />
            <span>Reset Filter ({activeDims})</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <SearchableMultiSelect
          label="LPTK"
          placeholder="Semua LPTK"
          options={options.lptk}
          selected={filters.lptk}
          onChange={(val) => onUpdateFilter('lptk', val)}
        />
        <SearchableMultiSelect
          label="Bidang Studi"
          placeholder="Semua Bidang Studi"
          options={options.bidangStudi}
          selected={filters.bidangStudi}
          onChange={(val) => onUpdateFilter('bidangStudi', val)}
        />
        <SearchableMultiSelect
          label="Jenis Kelamin"
          placeholder="Semua Jenis Kelamin"
          options={options.jenisKelamin}
          selected={filters.jenisKelamin}
          onChange={(val) => onUpdateFilter('jenisKelamin', val)}
        />
        <SearchableMultiSelect
          label="Provinsi Domisili"
          placeholder="Semua Provinsi"
          options={options.provinsi}
          selected={filters.provinsi}
          onChange={(val) => {
            onUpdateFilter('provinsi', val);
            // Clear kotaKab selections that may no longer belong to chosen provinces
            if (val.length > 0 && filters.kotaKab.length > 0) {
              onUpdateFilter('kotaKab', []);
            }
          }}
        />
        <SearchableMultiSelect
          label="Kota/Kab Domisili"
          placeholder="Semua Kota/Kab"
          options={options.kotaKab}
          selected={filters.kotaKab}
          onChange={(val) => onUpdateFilter('kotaKab', val)}
        />
        <SearchableMultiSelect
          label="Status Matrikulasi"
          placeholder="Semua Status"
          options={options.statusMatrikulasi}
          selected={filters.statusMatrikulasi}
          onChange={(val) => onUpdateFilter('statusMatrikulasi', val)}
        />
      </div>
    </section>
  );
};
