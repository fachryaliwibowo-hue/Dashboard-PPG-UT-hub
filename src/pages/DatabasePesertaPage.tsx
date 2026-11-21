import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Shield,
} from 'lucide-react';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { exportParticipantsToCsv, exportParticipantsToExcel } from '../engine/exportEngine';
import { FilterOptionsCatalog } from '../engine/filteringEngine';
import { maskAkunSimpkb, maskPtkId } from '../engine/privacyMasking';
import {
  GlobalFilters,
  ParticipantRecord,
  PrivacyConfig,
  QualityFilter,
  UserRole,
} from '../types/participant';

interface DatabasePesertaPageProps {
  filteredRecords: ParticipantRecord[];
  filters: GlobalFilters;
  filterOptions: FilterOptionsCatalog;
  totalDatasetUnique: number;
  totalFilteredUnique: number;
  userRole: UserRole;
  privacyConfig: PrivacyConfig;
  onUpdateFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  onResetFilters: () => void;
}

type SortKey =
  | 'no'
  | 'ptkId'
  | 'akunSimpkb'
  | 'namaPeserta'
  | 'jenisKelamin'
  | 'kotaKab'
  | 'provinsi'
  | 'lptk'
  | 'bidangStudi'
  | 'statusMatrikulasi';

export const DatabasePesertaPage: React.FC<DatabasePesertaPageProps> = ({
  filteredRecords,
  filters,
  filterOptions,
  totalDatasetUnique,
  totalFilteredUnique,
  userRole,
  privacyConfig,
  onUpdateFilter,
  onResetFilters,
}) => {
  const isAdmin = userRole === 'admin';
  const isUserMode = userRole === 'user';
  const maskingActive =
    isUserMode && (privacyConfig.maskPtkId || privacyConfig.maskAkunSimpkb);
  const [sortKey, setSortKey] = useState<SortKey>('no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const sortedRecords = useMemo(() => {
    const copy = [...filteredRecords];
    copy.sort((a, b) => {
      if (sortKey === 'no') {
        const na = Number(a.no) || a.rowIndex;
        const nb = Number(b.no) || b.rowIndex;
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      const va = (a[sortKey] || '').toString().trim();
      const vb = (b[sortKey] || '').toString().trim();
      const cmp = va.localeCompare(vb, 'id', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredRecords, sortKey, sortDir]);

  const totalRows = sortedRecords.length;
  const effectivePageSize = pageSize === 'all' ? Math.max(1, totalRows) : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    if (pageSize === 'all') return sortedRecords;
    const start = (safePage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, pageSize, safePage]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#0066A4]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0066A4]" />
    );
  };

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: 'no', label: 'NO' },
    { key: 'ptkId', label: 'PTK ID' },
    { key: 'akunSimpkb', label: 'AKUN SIMPKB' },
    { key: 'namaPeserta', label: 'NAMA PESERTA' },
    { key: 'jenisKelamin', label: 'JENIS KELAMIN' },
    { key: 'kotaKab', label: 'KOTA/KAB DOMISILI' },
    { key: 'provinsi', label: 'PROVINSI DOMISILI' },
    { key: 'lptk', label: 'LPTK' },
    { key: 'bidangStudi', label: 'BIDANG STUDI' },
    { key: 'statusMatrikulasi', label: 'STATUS MATRIKULASI' },
  ];

  return (
    <div className="space-y-5">
      <GlobalFilterBar
        filters={filters}
        options={filterOptions}
        onUpdateFilter={(k, v) => {
          onUpdateFilter(k, v);
          setCurrentPage(1);
        }}
        onResetFilters={() => {
          onResetFilters();
          setCurrentPage(1);
        }}
        totalFilteredUnique={totalFilteredUnique}
        totalFilteredRows={filteredRecords.length}
        totalDatasetUnique={totalDatasetUnique}
      />

      {/* Search, Quality Filter, Row Size & Export Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => {
                  onUpdateFilter('searchQuery', e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari Nama Peserta, PTK ID, atau Akun SIMPKB..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Status Data:</label>
              <select
                value={filters.qualityFilter}
                onChange={(e) => {
                  onUpdateFilter('qualityFilter', e.target.value as QualityFilter);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-[#17365D] focus:outline-none focus:border-[#0066A4]"
              >
                <option value="all">Semua Baris</option>
                <option value="valid">Data Valid (Unik)</option>
                <option value="needs_review">Perlu Verifikasi</option>
                <option value="duplicate_ptk">PTK ID Duplikat</option>
                <option value="empty_ptk">PTK ID Kosong</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-[#F5F7FA] rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  disabled={sortedRecords.length === 0}
                  onClick={() =>
                    exportParticipantsToExcel(sortedRecords, 'Database_Peserta_Terfilter_PPG_UT')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0066A4] hover:bg-[#17365D] disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  disabled={sortedRecords.length === 0}
                  onClick={() =>
                    exportParticipantsToCsv(sortedRecords, 'Database_Peserta_Terfilter_PPG_UT')
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#17365D] bg-[#EAF3F9] hover:bg-[#dcecf7] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </>
            )}
          </div>
        </div>

        {maskingActive && (
          <div className="flex items-center gap-2 text-[11px] text-[#0066A4]">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>
              Mode Privasi Aktif: Sebagian digit{' '}
              {[
                privacyConfig.maskPtkId ? 'PTK ID' : null,
                privacyConfig.maskAkunSimpkb ? 'Akun SIMPKB' : null,
              ]
                .filter(Boolean)
                .join(' & ')}{' '}
              disamarkan pada tampilan Mode User.
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="py-2.5 px-3 font-semibold whitespace-nowrap select-none"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[#0066A4] transition-colors"
                    >
                      <span>{col.label}</span>
                      {renderSortIcon(col.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Tidak ada data peserta yang cocok dengan pencarian atau filter aktif.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr
                    key={`${r.rowIndex}-${r.excelRowNumber}`}
                    className={`hover:bg-[#EAF3F9]/45 transition-colors ${
                      r.needsVerification ? 'bg-amber-50/45' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-500 whitespace-nowrap">
                      {r.no || r.rowIndex}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {r.isPtkEmpty ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Kosong (Verifikasi)</span>
                          </span>
                        ) : (
                          <span className="text-[#17365D] font-medium">
                            {isUserMode
                              ? maskPtkId(r.ptkId, privacyConfig.maskPtkId)
                              : r.ptkId}
                          </span>
                        )}
                        {r.isPtkDuplicate && (
                          <span
                            title={`PTK ID ini muncul ${r.ptkTotalOccurrences} kali (kemunculan ke-${r.ptkOccurrenceIndex})`}
                            className="text-[10px] font-semibold text-amber-700"
                          >
                            (Duplikat #{r.ptkOccurrenceIndex})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                      {r.akunSimpkb ? (
                        isUserMode ? (
                          maskAkunSimpkb(r.akunSimpkb, privacyConfig.maskAkunSimpkb)
                        ) : (
                          r.akunSimpkb
                        )
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#17365D] min-w-[180px]">
                      {r.namaPeserta || <span className="text-slate-400 italic">Kosong</span>}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                      {r.jenisKelamin || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 min-w-[150px]">
                      {r.kotaKab || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {r.provinsi || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 min-w-[160px]">
                      {r.lptk || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 min-w-[170px]">
                      {r.bidangStudi || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-[#17365D] font-medium">
                      {r.statusMatrikulasi || <span className="text-slate-400 italic">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600">
          <div className="flex items-center gap-3 tabular-nums">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={pageSize === 'all' ? 'all' : String(pageSize)}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'all' ? 'all' : Number(val));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded-md px-2 py-1 bg-white text-[#17365D] focus:outline-none focus:border-[#0066A4]"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">Semua Data ({totalRows.toLocaleString('id-ID')})</option>
              </select>
            </div>
            <span className="text-slate-400" aria-hidden="true">
              ·
            </span>
            <span>
              Menampilkan{' '}
              {totalRows === 0
                ? '0'
                : pageSize === 'all'
                ? `1–${totalRows.toLocaleString('id-ID')}`
                : `${((safePage - 1) * effectivePageSize + 1).toLocaleString('id-ID')}–${Math.min(
                    safePage * effectivePageSize,
                    totalRows
                  ).toLocaleString('id-ID')}`}{' '}
              dari {totalRows.toLocaleString('id-ID')} baris
            </span>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1.5 tabular-nums">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 font-medium text-[#17365D]">
                Hal {safePage.toLocaleString('id-ID')} / {totalPages.toLocaleString('id-ID')}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
