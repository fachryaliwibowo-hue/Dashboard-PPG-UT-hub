export type ExpectedColumnKey =
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

export interface ColumnDefinition {
  key: ExpectedColumnKey;
  label: string;
  required: boolean;
  aliases: string[];
  description: string;
  example: string;
}

export const EXPECTED_COLUMNS: ColumnDefinition[] = [
  {
    key: 'no',
    label: 'NO',
    required: false,
    aliases: ['NO', 'NOMOR', 'NO.', 'NUMBER'],
    description: 'Nomor urut baris data peserta',
    example: '1',
  },
  {
    key: 'ptkId',
    label: 'PTK ID',
    required: true,
    aliases: ['PTK ID', 'PTK_ID', 'PTKID', 'ID PTK'],
    description: 'Identitas unik peserta (Primary Key)',
    example: '201500123456',
  },
  {
    key: 'akunSimpkb',
    label: 'AKUN SIMPKB',
    required: true,
    aliases: ['AKUN SIMPKB', 'AKUN_SIMPKB', 'SIMPKB', 'NO UKG', 'UKG', 'ID SIMPKB'],
    description: 'Nomor akun atau email SIMPKB peserta',
    example: '201500123456@guruku.id',
  },
  {
    key: 'namaPeserta',
    label: 'NAMA PESERTA',
    required: true,
    aliases: ['NAMA PESERTA', 'NAMA_PESERTA', 'NAMA', 'NAMA LENGKAP'],
    description: 'Nama lengkap peserta PPG',
    example: 'Siti Aminah, S.Pd.',
  },
  {
    key: 'jenisKelamin',
    label: 'JENIS KELAMIN',
    required: true,
    aliases: ['JENIS KELAMIN', 'JENIS_KELAMIN', 'JK', 'KELAMIN', 'GENDER'],
    description: 'Jenis kelamin peserta (Laki-Laki / Perempuan / L / P)',
    example: 'Perempuan',
  },
  {
    key: 'kotaKab',
    label: 'KOTA/KAB DOMISILI',
    required: true,
    aliases: [
      'KOTA/KAB DOMISILI',
      'KOTA/KAB. DOMISILI',
      'KOTA / KAB DOMISILI',
      'KOTA/KABUPATEN DOMISILI',
      'KAB/KOTA DOMISILI',
      'KABUPATEN/KOTA DOMISILI',
      'KOTA/KAB',
      'KABUPATEN/KOTA',
      'DOMISILI KOTA/KAB',
    ],
    description: 'Kota atau Kabupaten domisili peserta',
    example: 'Kota Tangerang Selatan',
  },
  {
    key: 'provinsi',
    label: 'PROVINSI DOMISILI',
    required: true,
    aliases: ['PROVINSI DOMISILI', 'PROVINSI_DOMISILI', 'PROPINSI DOMISILI', 'PROVINSI', 'PROPINSI'],
    description: 'Provinsi domisili peserta',
    example: 'Banten',
  },
  {
    key: 'lptk',
    label: 'LPTK',
    required: true,
    aliases: ['LPTK', 'NAMA LPTK', 'PTN PENYELENGGARA', 'LPTK PENYELENGGARA'],
    description: 'Lembaga Pendidikan Tenaga Kependidikan penyelenggara',
    example: 'Universitas Terbuka',
  },
  {
    key: 'bidangStudi',
    label: 'BIDANG STUDI',
    required: true,
    aliases: ['BIDANG STUDI', 'BIDANG_STUDI', 'PRODI', 'PROGRAM STUDI', 'MAPEL', 'MATA PELAJARAN'],
    description: 'Bidang studi PPG peserta',
    example: 'Pendidikan Guru Sekolah Dasar (PGSD)',
  },
  {
    key: 'statusMatrikulasi',
    label: 'STATUS MATRIKULASI',
    required: true,
    aliases: ['STATUS MATRIKULASI', 'STATUS_MATRIKULASI', 'MATRIKULASI', 'STATUS'],
    description: 'Status matrikulasi peserta sesuai data Excel',
    example: 'Lulus Matrikulasi',
  },
];

export type GenderCategory = 'Laki-Laki' | 'Perempuan' | 'Lainnya' | 'Kosong';

export interface ParticipantRecord {
  rowIndex: number; // 1-based data row number in sheet
  excelRowNumber: number; // actual 1-based row in Excel sheet
  // Raw preserved values
  no: string;
  ptkId: string;
  akunSimpkb: string;
  namaPeserta: string;
  jenisKelamin: string;
  kotaKab: string;
  provinsi: string;
  lptk: string;
  bidangStudi: string;
  statusMatrikulasi: string;
  // Normalized whitespace keys for consistent filtering/grouping (never altering original raw text)
  normPtkId: string;
  normAkunSimpkb: string;
  normNamaPeserta: string;
  normJenisKelamin: string;
  genderCategory: GenderCategory;
  normKotaKab: string;
  normProvinsi: string;
  normLptk: string;
  normBidangStudi: string;
  normStatusMatrikulasi: string;
  // Data quality metadata
  isPtkEmpty: boolean;
  isPtkDuplicate: boolean;
  ptkOccurrenceIndex: number; // 1 for first valid occurrence, >1 for duplicates
  ptkTotalOccurrences: number;
  missingColumns: ExpectedColumnKey[];
  needsVerification: boolean;
}

export interface ColumnNullStat {
  key: ExpectedColumnKey;
  label: string;
  emptyCount: number;
  filledCount: number;
  emptyPercentage: number;
}

export interface DuplicatePtkGroup {
  ptkId: string;
  count: number;
  rows: ParticipantRecord[];
}

export interface ValidationReport {
  totalRowsRead: number;
  validUniquePtkCount: number;
  validRowCount: number; // Rows with non-empty PTK ID and not duplicate
  duplicatePtkGroupCount: number;
  duplicateExtraRowCount: number;
  emptyPtkRowCount: number;
  rowsNeedingVerificationCount: number;
  columnNullStats: ColumnNullStat[];
  duplicateGroups: DuplicatePtkGroup[];
  emptyPtkRows: ParticipantRecord[];
  matchedHeaders: Record<ExpectedColumnKey, string | null>;
  missingRequiredHeaders: string[];
  extraHeaders: string[];
  isStructureValid: boolean;
}

export interface DatasetMetadata {
  fileName: string;
  fileSize: number;
  sheetName: string;
  availableSheets: string[];
  uploadedAt: string; // ISO string
}

export interface ParsedExcelPreview {
  metadata: DatasetMetadata;
  records: ParticipantRecord[];
  validation: ValidationReport;
}

export type QualityFilter = 'all' | 'valid' | 'needs_review' | 'duplicate_ptk' | 'empty_ptk';

export interface GlobalFilters {
  lptk: string[];
  bidangStudi: string[];
  jenisKelamin: string[];
  provinsi: string[];
  kotaKab: string[];
  statusMatrikulasi: string[];
  searchQuery: string;
  qualityFilter: QualityFilter;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
  maleCount?: number;
  femaleCount?: number;
  otherGenderCount?: number;
  extraLabel?: string;
}

export interface StackedSeriesRow {
  category: string;
  total: number;
  [statusKey: string]: string | number;
}

export interface ProvinceDetailRow {
  provinsi: string;
  total: number;
  percentage: number;
  maleCount: number;
  femaleCount: number;
  otherGenderCount: number;
  topBidangStudi: string;
  topBidangStudiCount: number;
  bidangStudiBreakdown: Record<string, number>;
}

export interface BidangStudiDetailRow {
  bidangStudi: string;
  total: number;
  percentage: number;
  maleCount: number;
  femaleCount: number;
  statusBreakdown: Record<string, number>;
}

export interface LptkSummaryRow {
  lptk: string;
  total: number;
  percentage: number;
  maleCount: number;
  femaleCount: number;
  bidangStudiCount: number;
  provinsiCount: number;
  statusBreakdown: Record<string, number>;
}

export interface AggregatedAnalytics {
  // Counts
  totalBarisTerfilter: number;
  totalPesertaUnik: number; // Unique valid PTK IDs in filter
  rowsWithoutPtkInFilter: number;
  duplicateRowsInFilter: number;
  totalLptk: number;
  totalBidangStudi: number;
  totalProvinsi: number;
  totalKotaKab: number;
  pesertaLakiLaki: number;
  pesertaPerempuan: number;
  pesertaGenderLainnya: number;
  pesertaGenderKosong: number;
  // Distributions (excluding empty values as categories)
  byLptk: DistributionItem[];
  byBidangStudi: DistributionItem[];
  byJenisKelamin: DistributionItem[];
  byStatusMatrikulasi: DistributionItem[];
  byProvinsi: DistributionItem[];
  byKotaKab: DistributionItem[];
  // Omitted empty counts per dimension for mathematical reconciliation
  omittedEmpty: {
    lptk: number;
    bidangStudi: number;
    jenisKelamin: number;
    statusMatrikulasi: number;
    provinsi: number;
    kotaKab: number;
  };
  // Dynamic status keys found in dataset/filter
  statusCategories: string[];
  bidangStudiCategories: string[];
  // Cross-tabulations
  matrikulasiByLptk: StackedSeriesRow[];
  matrikulasiByBidangStudi: StackedSeriesRow[];
  matrikulasiByJenisKelamin: StackedSeriesRow[];
  provinceDetails: ProvinceDetailRow[];
  bidangStudiDetails: BidangStudiDetailRow[];
  lptkSummaries: LptkSummaryRow[];
}

export type NavPageId =
  | 'overview'
  | 'lptk'
  | 'demografi'
  | 'matrikulasi'
  | 'cek-penempatan'
  | 'database'
  | 'jadwal-kegiatan'
  | 'lokasi-perkuliahan'
  | 'data-management'
  | 'export-reports';

export type UserRole = 'user' | 'admin';

export interface LectureLocation {
  id: string;
  namaLokasi: string;
  lptkTerkait: string;
  alamatLengkap: string;
  kotaKab: string;
  provinsi: string;
  kodePos: string;
  ruangAtauGedung: string;
  kontakPenanggungJawab: string;
  catatan: string;
  googleMapsUrl: string;
  updatedAt: string;
}

export interface LocationPageNote {
  noteText: string;
  updatedByEmail: string;
  updatedAt: string;
}

export interface DatasetHistoryLptkItem {
  name: string;
  count: number;
}

export interface DatasetHistoryEntry {
  id: string;
  revisionId: string;
  sheetName: string;
  uploadedAt: string;
  uploadedByEmail: string;
  totalRows: number;
  validUniquePtkCount: number;
  totalLptk: number;
  totalBidangStudi: number;
  totalProvinsi: number;
  maleCount: number;
  femaleCount: number;
  statusCounts: Record<string, number>;
  topLptks: DatasetHistoryLptkItem[];
}

export interface AuditLogEntry {
  id: string;
  aksi: string;
  ringkasan: string;
  actorEmail: string;
  createdAt: string;
}

export interface PrivacyConfig {
  maskPtkId: boolean;
  maskAkunSimpkb: boolean;
  updatedAt: string;
}

export interface PublicPlacementResult {
  revisionId: string;
  maskedPtkId: string;
  maskedSimpkb: string;
  maskedName: string;
  jenisKelamin: string;
  kotaKab: string;
  provinsi: string;
  lptk: string;
  bidangStudi: string;
  statusMatrikulasi: string;
}
