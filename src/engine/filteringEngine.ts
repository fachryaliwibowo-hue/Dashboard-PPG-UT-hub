import { GlobalFilters, ParticipantRecord } from '../types/participant';

export const INITIAL_FILTERS: GlobalFilters = {
  lptk: [],
  bidangStudi: [],
  jenisKelamin: [],
  provinsi: [],
  kotaKab: [],
  statusMatrikulasi: [],
  searchQuery: '',
  qualityFilter: 'all',
};

export function hasActiveFilters(filters: GlobalFilters): boolean {
  return (
    filters.lptk.length > 0 ||
    filters.bidangStudi.length > 0 ||
    filters.jenisKelamin.length > 0 ||
    filters.provinsi.length > 0 ||
    filters.kotaKab.length > 0 ||
    filters.statusMatrikulasi.length > 0 ||
    filters.searchQuery.trim() !== '' ||
    filters.qualityFilter !== 'all'
  );
}

export function countActiveFilterDimensions(filters: GlobalFilters): number {
  let count = 0;
  if (filters.lptk.length > 0) count++;
  if (filters.bidangStudi.length > 0) count++;
  if (filters.jenisKelamin.length > 0) count++;
  if (filters.provinsi.length > 0) count++;
  if (filters.kotaKab.length > 0) count++;
  if (filters.statusMatrikulasi.length > 0) count++;
  if (filters.searchQuery.trim() !== '') count++;
  if (filters.qualityFilter !== 'all') count++;
  return count;
}

export function applyFilters(
  records: ParticipantRecord[],
  filters: GlobalFilters
): ParticipantRecord[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return records.filter((r) => {
    if (filters.lptk.length > 0 && !filters.lptk.includes(r.normLptk)) {
      return false;
    }
    if (filters.bidangStudi.length > 0 && !filters.bidangStudi.includes(r.normBidangStudi)) {
      return false;
    }
    if (filters.jenisKelamin.length > 0 && !filters.jenisKelamin.includes(r.normJenisKelamin)) {
      return false;
    }
    if (filters.provinsi.length > 0 && !filters.provinsi.includes(r.normProvinsi)) {
      return false;
    }
    if (filters.kotaKab.length > 0 && !filters.kotaKab.includes(r.normKotaKab)) {
      return false;
    }
    if (
      filters.statusMatrikulasi.length > 0 &&
      !filters.statusMatrikulasi.includes(r.normStatusMatrikulasi)
    ) {
      return false;
    }

    if (filters.qualityFilter === 'valid' && r.needsVerification) {
      return false;
    }
    if (filters.qualityFilter === 'needs_review' && !r.needsVerification) {
      return false;
    }
    if (filters.qualityFilter === 'duplicate_ptk' && !r.isPtkDuplicate) {
      return false;
    }
    if (filters.qualityFilter === 'empty_ptk' && !r.isPtkEmpty) {
      return false;
    }

    if (query) {
      const matchName = r.normNamaPeserta.toLowerCase().includes(query);
      const matchPtk = r.normPtkId.toLowerCase().includes(query);
      const matchSimpkb = r.normAkunSimpkb.toLowerCase().includes(query);
      if (!matchName && !matchPtk && !matchSimpkb) {
        return false;
      }
    }

    return true;
  });
}

export interface FilterOption {
  value: string;
  count: number;
}

export interface FilterOptionsCatalog {
  lptk: FilterOption[];
  bidangStudi: FilterOption[];
  jenisKelamin: FilterOption[];
  provinsi: FilterOption[];
  kotaKab: FilterOption[];
  statusMatrikulasi: FilterOption[];
}

function buildSortedOptions(
  records: ParticipantRecord[],
  extractor: (r: ParticipantRecord) => string
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const val = extractor(r);
    if (!val) continue;
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'id'));
}

export function extractFilterOptions(
  allRecords: ParticipantRecord[],
  activeProvinsiFilter: string[] = []
): FilterOptionsCatalog {
  // For kotaKab, scope to selected provinces if any are active so city selection is clean and relevant
  const kotaSource =
    activeProvinsiFilter.length > 0
      ? allRecords.filter((r) => activeProvinsiFilter.includes(r.normProvinsi))
      : allRecords;

  return {
    lptk: buildSortedOptions(allRecords, (r) => r.normLptk),
    bidangStudi: buildSortedOptions(allRecords, (r) => r.normBidangStudi),
    jenisKelamin: buildSortedOptions(allRecords, (r) => r.normJenisKelamin),
    provinsi: buildSortedOptions(allRecords, (r) => r.normProvinsi),
    kotaKab: buildSortedOptions(kotaSource, (r) => r.normKotaKab),
    statusMatrikulasi: buildSortedOptions(allRecords, (r) => r.normStatusMatrikulasi),
  };
}
