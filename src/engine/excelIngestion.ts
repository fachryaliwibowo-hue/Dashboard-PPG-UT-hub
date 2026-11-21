import * as XLSX from 'xlsx';
import {
  ColumnDefinition,
  DatasetMetadata,
  EXPECTED_COLUMNS,
  ExpectedColumnKey,
  ParsedExcelPreview,
} from '../types/participant';
import { validateAndBuildRecords } from './dataValidation';

function normalizeHeaderToken(header: string): string {
  return header
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/');
}

function matchHeaderToColumn(rawHeader: string): ColumnDefinition | null {
  const token = normalizeHeaderToken(rawHeader);
  if (!token) return null;

  for (const col of EXPECTED_COLUMNS) {
    for (const alias of col.aliases) {
      if (normalizeHeaderToken(alias) === token) {
        return col;
      }
    }
  }
  return null;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  let bestRowIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(rows.length, 15);

  for (let i = 0; i < maxScan; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const matchedKeys = new Set<ExpectedColumnKey>();
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const col = matchHeaderToColumn(String(cell));
      if (col) {
        matchedKeys.add(col.key);
      }
    }

    if (matchedKeys.size > bestScore) {
      bestScore = matchedKeys.size;
      bestRowIdx = i;
    }
  }

  return bestRowIdx;
}

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (Number.isFinite(val)) {
      // Avoid scientific notation for integer IDs if SheetJS returned a raw number
      return Number.isInteger(val) ? val.toFixed(0) : String(val);
    }
    return '';
  }
  return String(val);
}

export async function parseExcelFile(
  file: File,
  targetSheetName?: string
): Promise<ParsedExcelPreview> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['xlsx', 'xls'].includes(extension)) {
    throw new Error(
      'Format file tidak didukung. Harap unggah file Microsoft Excel dengan ekstensi .xlsx atau .xls.'
    );
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: false });
  } catch {
    throw new Error(
      'File Excel tidak dapat dibaca atau rusak. Pastikan file merupakan workbook .xlsx atau .xls yang valid.'
    );
  }

  const availableSheets = workbook.SheetNames;
  if (!availableSheets || availableSheets.length === 0) {
    throw new Error('Workbook Excel tidak memiliki worksheet yang dapat dibaca.');
  }

  const sheetName =
    targetSheetName && availableSheets.includes(targetSheetName)
      ? targetSheetName
      : availableSheets[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Worksheet "${sheetName}" tidak ditemukan di dalam file.`);
  }

  const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (!rawGrid || rawGrid.length === 0) {
    throw new Error(`Worksheet "${sheetName}" kosong dan tidak memiliki data.`);
  }

  const headerRowIdx = findHeaderRowIndex(rawGrid);
  const headerRow = rawGrid[headerRowIdx] || [];

  const columnIndexMap: Partial<Record<ExpectedColumnKey, number>> = {};
  const matchedHeaders: Record<ExpectedColumnKey, string | null> = {
    no: null,
    ptkId: null,
    akunSimpkb: null,
    namaPeserta: null,
    jenisKelamin: null,
    kotaKab: null,
    provinsi: null,
    lptk: null,
    bidangStudi: null,
    statusMatrikulasi: null,
  };
  const extraHeaders: string[] = [];

  headerRow.forEach((cell, colIdx) => {
    const rawText = cellToString(cell).trim();
    if (!rawText) return;
    const matched = matchHeaderToColumn(rawText);
    if (matched && columnIndexMap[matched.key] === undefined) {
      columnIndexMap[matched.key] = colIdx;
      matchedHeaders[matched.key] = rawText;
    } else if (!matched) {
      extraHeaders.push(rawText);
    }
  });

  const missingRequiredHeaders: string[] = [];
  for (const col of EXPECTED_COLUMNS) {
    if (col.required && columnIndexMap[col.key] === undefined) {
      missingRequiredHeaders.push(col.label);
    }
  }

  const rawDataRows: Array<{
    excelRowNumber: number;
    values: Record<ExpectedColumnKey, string>;
  }> = [];

  for (let r = headerRowIdx + 1; r < rawGrid.length; r++) {
    const row = rawGrid[r];
    if (!Array.isArray(row)) continue;

    const getVal = (key: ExpectedColumnKey): string => {
      const idx = columnIndexMap[key];
      if (idx === undefined) return '';
      return cellToString(row[idx]);
    };

    const values: Record<ExpectedColumnKey, string> = {
      no: getVal('no'),
      ptkId: getVal('ptkId'),
      akunSimpkb: getVal('akunSimpkb'),
      namaPeserta: getVal('namaPeserta'),
      jenisKelamin: getVal('jenisKelamin'),
      kotaKab: getVal('kotaKab'),
      provinsi: getVal('provinsi'),
      lptk: getVal('lptk'),
      bidangStudi: getVal('bidangStudi'),
      statusMatrikulasi: getVal('statusMatrikulasi'),
    };

    // Skip completely empty rows across all mapped columns
    const hasAnyContent = Object.values(values).some((v) => v.trim() !== '');
    if (!hasAnyContent) continue;

    rawDataRows.push({
      excelRowNumber: r + 1,
      values,
    });
  }

  const { records, validation } = validateAndBuildRecords(
    rawDataRows,
    matchedHeaders,
    missingRequiredHeaders,
    extraHeaders
  );

  const metadata: DatasetMetadata = {
    fileName: file.name,
    fileSize: file.size,
    sheetName,
    availableSheets,
    uploadedAt: new Date().toISOString(),
  };

  return {
    metadata,
    records,
    validation,
  };
}

export function downloadExcelTemplate(): void {
  const headers = EXPECTED_COLUMNS.map((c) => c.label);
  const sampleFormatNote = [
    '1',
    '201500123456',
    '201500123456@guruku.id',
    'Contoh: Siti Aminah, S.Pd.',
    'Perempuan',
    'Kota Tangerang Selatan',
    'Banten',
    'Universitas Terbuka',
    'Pendidikan Guru Sekolah Dasar (PGSD)',
    'Lulus Matrikulasi',
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleFormatNote]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 28 },
    { wch: 15 },
    { wch: 26 },
    { wch: 20 },
    { wch: 28 },
    { wch: 36 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta PPG');
  XLSX.writeFile(wb, 'Template_Database_Peserta_PPG_UT.xlsx');
}
