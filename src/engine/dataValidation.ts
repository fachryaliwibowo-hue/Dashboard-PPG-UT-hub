import {
  ColumnNullStat,
  DuplicatePtkGroup,
  EXPECTED_COLUMNS,
  ExpectedColumnKey,
  GenderCategory,
  ParticipantRecord,
  ValidationReport,
} from '../types/participant';

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function classifyGender(rawGender: string): GenderCategory {
  const norm = normalizeWhitespace(rawGender).toLowerCase();
  if (!norm) return 'Kosong';

  if (
    norm === 'l' ||
    norm === 'lk' ||
    norm === 'laki-laki' ||
    norm === 'laki - laki' ||
    norm === 'laki laki' ||
    norm === 'laki' ||
    norm === 'pria' ||
    norm === 'male' ||
    norm === 'm'
  ) {
    return 'Laki-Laki';
  }

  if (
    norm === 'p' ||
    norm === 'pr' ||
    norm === 'perempuan' ||
    norm === 'wanita' ||
    norm === 'female' ||
    norm === 'f'
  ) {
    return 'Perempuan';
  }

  return 'Lainnya';
}

export interface RawInputRow {
  excelRowNumber: number;
  values: Record<ExpectedColumnKey, string>;
}

export function validateAndBuildRecords(
  rawRows: RawInputRow[],
  matchedHeaders: Record<ExpectedColumnKey, string | null>,
  missingRequiredHeaders: string[],
  extraHeaders: string[]
): { records: ParticipantRecord[]; validation: ValidationReport } {
  const ptkOccurrences = new Map<string, number>();

  // First pass: count PTK ID occurrences (whitespace-normalized)
  for (const raw of rawRows) {
    const normPtk = normalizeWhitespace(raw.values.ptkId);
    if (normPtk !== '') {
      ptkOccurrences.set(normPtk, (ptkOccurrences.get(normPtk) ?? 0) + 1);
    }
  }

  const ptkRunningIndex = new Map<string, number>();
  const emptyCounts: Record<ExpectedColumnKey, number> = {
    no: 0,
    ptkId: 0,
    akunSimpkb: 0,
    namaPeserta: 0,
    jenisKelamin: 0,
    kotaKab: 0,
    provinsi: 0,
    lptk: 0,
    bidangStudi: 0,
    statusMatrikulasi: 0,
  };

  const records: ParticipantRecord[] = [];
  const emptyPtkRows: ParticipantRecord[] = [];
  const duplicateMap = new Map<string, ParticipantRecord[]>();

  rawRows.forEach((raw, idx) => {
    const v = raw.values;
    const normPtkId = normalizeWhitespace(v.ptkId);
    const normAkunSimpkb = normalizeWhitespace(v.akunSimpkb);
    const normNamaPeserta = normalizeWhitespace(v.namaPeserta);
    const normJenisKelamin = normalizeWhitespace(v.jenisKelamin);
    const normKotaKab = normalizeWhitespace(v.kotaKab);
    const normProvinsi = normalizeWhitespace(v.provinsi);
    const normLptk = normalizeWhitespace(v.lptk);
    const normBidangStudi = normalizeWhitespace(v.bidangStudi);
    const normStatusMatrikulasi = normalizeWhitespace(v.statusMatrikulasi);

    const missingColumns: ExpectedColumnKey[] = [];
    for (const col of EXPECTED_COLUMNS) {
      if (normalizeWhitespace(v[col.key]) === '') {
        emptyCounts[col.key] += 1;
        if (col.key !== 'no') {
          missingColumns.push(col.key);
        }
      }
    }

    const isPtkEmpty = normPtkId === '';
    const totalOcc = isPtkEmpty ? 0 : ptkOccurrences.get(normPtkId) ?? 0;
    let occIdx = 0;
    if (!isPtkEmpty) {
      occIdx = (ptkRunningIndex.get(normPtkId) ?? 0) + 1;
      ptkRunningIndex.set(normPtkId, occIdx);
    }
    const isPtkDuplicate = !isPtkEmpty && totalOcc > 1;
    const needsVerification = isPtkEmpty || isPtkDuplicate;

    const record: ParticipantRecord = {
      rowIndex: idx + 1,
      excelRowNumber: raw.excelRowNumber,
      no: v.no,
      ptkId: v.ptkId,
      akunSimpkb: v.akunSimpkb,
      namaPeserta: v.namaPeserta,
      jenisKelamin: v.jenisKelamin,
      kotaKab: v.kotaKab,
      provinsi: v.provinsi,
      lptk: v.lptk,
      bidangStudi: v.bidangStudi,
      statusMatrikulasi: v.statusMatrikulasi,
      normPtkId,
      normAkunSimpkb,
      normNamaPeserta,
      normJenisKelamin,
      genderCategory: classifyGender(v.jenisKelamin),
      normKotaKab,
      normProvinsi,
      normLptk,
      normBidangStudi,
      normStatusMatrikulasi,
      isPtkEmpty,
      isPtkDuplicate,
      ptkOccurrenceIndex: occIdx,
      ptkTotalOccurrences: totalOcc,
      missingColumns,
      needsVerification,
    };

    records.push(record);
    if (isPtkEmpty) {
      emptyPtkRows.push(record);
    }
    if (isPtkDuplicate) {
      const list = duplicateMap.get(normPtkId) ?? [];
      list.push(record);
      duplicateMap.set(normPtkId, list);
    }
  });

  const totalRowsRead = records.length;
  const validUniquePtkCount = ptkOccurrences.size;
  const duplicateGroups: DuplicatePtkGroup[] = Array.from(duplicateMap.entries())
    .map(([ptkId, groupRows]) => ({
      ptkId,
      count: groupRows.length,
      rows: groupRows,
    }))
    .sort((a, b) => b.count - a.count);

  const duplicateExtraRowCount = duplicateGroups.reduce(
    (sum, g) => sum + (g.count - 1),
    0
  );
  const emptyPtkRowCount = emptyPtkRows.length;
  const rowsNeedingVerificationCount = records.filter((r) => r.needsVerification).length;

  const columnNullStats: ColumnNullStat[] = EXPECTED_COLUMNS.map((col) => {
    const emptyCount = emptyCounts[col.key];
    const filledCount = Math.max(0, totalRowsRead - emptyCount);
    return {
      key: col.key,
      label: col.label,
      emptyCount,
      filledCount,
      emptyPercentage: totalRowsRead > 0 ? (emptyCount / totalRowsRead) * 100 : 0,
    };
  });

  const isStructureValid = missingRequiredHeaders.length === 0 && totalRowsRead > 0;

  const validation: ValidationReport = {
    totalRowsRead,
    validUniquePtkCount,
    validRowCount: validUniquePtkCount,
    duplicatePtkGroupCount: duplicateGroups.length,
    duplicateExtraRowCount,
    emptyPtkRowCount,
    rowsNeedingVerificationCount,
    columnNullStats,
    duplicateGroups,
    emptyPtkRows,
    matchedHeaders,
    missingRequiredHeaders,
    extraHeaders,
    isStructureValid,
  };

  return { records, validation };
}
