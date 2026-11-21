import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AggregatedAnalytics,
  DatasetMetadata,
  EXPECTED_COLUMNS,
  GlobalFilters,
  ParticipantRecord,
} from '../types/participant';
import { hasActiveFilters } from './filteringEngine';

function formatNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function recordsToExportRows(records: ParticipantRecord[]) {
  return records.map((r) => ({
    NO: r.no,
    'PTK ID': r.ptkId,
    'AKUN SIMPKB': r.akunSimpkb,
    'NAMA PESERTA': r.namaPeserta,
    'JENIS KELAMIN': r.jenisKelamin,
    'KOTA/KAB DOMISILI': r.kotaKab,
    'PROVINSI DOMISILI': r.provinsi,
    LPTK: r.lptk,
    'BIDANG STUDI': r.bidangStudi,
    'STATUS MATRIKULASI': r.statusMatrikulasi,
  }));
}

export function exportVerificationIssuesToExcel(records: ParticipantRecord[]): number {
  const issueRows = records.filter((r) => r.needsVerification);
  if (issueRows.length === 0) return 0;

  const colLabelMap = new Map(EXPECTED_COLUMNS.map((c) => [c.key, c.label]));

  const rows = issueRows.map((r) => {
    const reasons: string[] = [];
    if (r.isPtkEmpty) {
      reasons.push('PTK ID Kosong');
    }
    if (r.isPtkDuplicate) {
      reasons.push(
        `PTK ID Duplikat (Kemunculan #${r.ptkOccurrenceIndex} dari ${r.ptkTotalOccurrences})`
      );
    }
    if (r.missingColumns.length > 0) {
      const missingLabels = r.missingColumns
        .map((k) => colLabelMap.get(k) ?? k)
        .join(', ');
      reasons.push(`Kolom kosong: ${missingLabels}`);
    }

    return {
      'BARIS EXCEL ASLI': r.excelRowNumber,
      'ALASAN VERIFIKASI': reasons.join('; ') || 'Perlu Verifikasi',
      NO: r.no,
      'PTK ID': r.ptkId,
      'AKUN SIMPKB': r.akunSimpkb,
      'NAMA PESERTA': r.namaPeserta,
      'JENIS KELAMIN': r.jenisKelamin,
      'KOTA/KAB DOMISILI': r.kotaKab,
      'PROVINSI DOMISILI': r.provinsi,
      LPTK: r.lptk,
      'BIDANG STUDI': r.bidangStudi,
      'STATUS MATRIKULASI': r.statusMatrikulasi,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 42 },
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 28 },
    { wch: 32 },
    { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Perlu Verifikasi');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Data_Perlu_Verifikasi_PPG_UT_${stamp}.xlsx`);
  return issueRows.length;
}

export function exportParticipantsToExcel(
  records: ParticipantRecord[],
  fileNamePrefix = 'Data_Peserta_PPG_UT'
): void {
  const rows = recordsToExportRows(records);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 28 },
    { wch: 32 },
    { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Peserta');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${sanitizeFilename(fileNamePrefix)}_${stamp}.xlsx`);
}

export function exportParticipantsToCsv(
  records: ParticipantRecord[],
  fileNamePrefix = 'Data_Peserta_PPG_UT'
): void {
  const rows = recordsToExportRows(records);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${sanitizeFilename(fileNamePrefix)}_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportLptkSummaryToExcel(analytics: AggregatedAnalytics): void {
  const rows = analytics.lptkSummaries.map((item, idx) => {
    const base: Record<string, string | number> = {
      No: idx + 1,
      LPTK: item.lptk,
      'Total Peserta (PTK Unik)': item.total,
      'Persentase (%)': Number(item.percentage.toFixed(2)),
      'Laki-Laki': item.maleCount,
      Perempuan: item.femaleCount,
      'Jumlah Bidang Studi': item.bidangStudiCount,
      'Jumlah Provinsi': item.provinsiCount,
    };
    for (const status of analytics.statusCategories) {
      base[status] = item.statusBreakdown[status] ?? 0;
    }
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan LPTK');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Ringkasan_Peserta_Per_LPTK_${stamp}.xlsx`);
}

export function exportBidangStudiSummaryToExcel(analytics: AggregatedAnalytics): void {
  const rows = analytics.bidangStudiDetails.map((item, idx) => {
    const base: Record<string, string | number> = {
      No: idx + 1,
      'Bidang Studi': item.bidangStudi,
      'Total Peserta (PTK Unik)': item.total,
      'Persentase (%)': Number(item.percentage.toFixed(2)),
      'Laki-Laki': item.maleCount,
      Perempuan: item.femaleCount,
    };
    for (const status of analytics.statusCategories) {
      base[status] = item.statusBreakdown[status] ?? 0;
    }
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Distribusi Bidang Studi');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Distribusi_Bidang_Studi_${stamp}.xlsx`);
}

export function exportStatusMatrikulasiToExcel(analytics: AggregatedAnalytics): void {
  const rows = analytics.byStatusMatrikulasi.map((item, idx) => ({
    No: idx + 1,
    'Status Matrikulasi': item.name,
    'Total Peserta (PTK Unik)': item.count,
    'Persentase (%)': Number(item.percentage.toFixed(2)),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Status Matrikulasi');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Distribusi_Status_Matrikulasi_${stamp}.xlsx`);
}

function buildFilterSummaryText(filters: GlobalFilters): string {
  if (!hasActiveFilters(filters)) return 'Seluruh Database (Tanpa Filter)';
  const parts: string[] = [];
  if (filters.lptk.length) parts.push(`LPTK: ${filters.lptk.join(', ')}`);
  if (filters.bidangStudi.length) parts.push(`Bidang Studi: ${filters.bidangStudi.join(', ')}`);
  if (filters.jenisKelamin.length) parts.push(`Jenis Kelamin: ${filters.jenisKelamin.join(', ')}`);
  if (filters.provinsi.length) parts.push(`Provinsi: ${filters.provinsi.join(', ')}`);
  if (filters.kotaKab.length) parts.push(`Kota/Kab: ${filters.kotaKab.join(', ')}`);
  if (filters.statusMatrikulasi.length)
    parts.push(`Status Matrikulasi: ${filters.statusMatrikulasi.join(', ')}`);
  if (filters.searchQuery.trim()) parts.push(`Pencarian: "${filters.searchQuery.trim()}"`);
  return parts.join(' | ');
}

export function generatePdfReport(
  analytics: AggregatedAnalytics,
  metadata: DatasetMetadata,
  filters: GlobalFilters,
  useFilteredScope: boolean
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Institutional Header Banner
  doc.setFillColor(23, 54, 93); // #17365D
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('PPG UT — PARTICIPANT DATA DASHBOARD', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Integrated Data Monitoring for Better Academic Management', 14, 19);
  doc.text(
    'Laporan Ringkasan Analisis · Sumber: Database Peserta PPG UT',
    14,
    25
  );

  // Meta & Scope block
  doc.setTextColor(23, 54, 93);
  doc.setFontSize(9);
  const generatedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  doc.text(`Tanggal Cetak: ${generatedAt}`, 14, 38);
  const scopeText = useFilteredScope
    ? buildFilterSummaryText(filters)
    : 'Seluruh Database (Tanpa Filter)';
  const splitScope = doc.splitTextToSize(`Cakupan Data: ${scopeText}`, pageWidth - 28);
  doc.text(splitScope, 14, 43);

  let cursorY = 43 + splitScope.length * 4.5 + 4;

  // 1. Ringkasan Eksekutif
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Ringkasan Indikator Utama', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['Indikator', 'Nilai', 'Keterangan']],
    body: [
      ['Total Peserta (PTK ID Unik Valid)', formatNumber(analytics.totalPesertaUnik), 'Berdasarkan PTK ID unik'],
      ['Total Baris Data', formatNumber(analytics.totalBarisTerfilter), 'Seluruh baris dalam cakupan'],
      ['Jumlah LPTK', formatNumber(analytics.totalLptk), 'LPTK penyelenggara unik'],
      ['Jumlah Bidang Studi', formatNumber(analytics.totalBidangStudi), 'Bidang studi unik'],
      ['Jumlah Provinsi Domisili', formatNumber(analytics.totalProvinsi), 'Provinsi unik peserta'],
      [
        'Peserta Laki-Laki',
        formatNumber(analytics.pesertaLakiLaki),
        formatPct(analytics.totalPesertaUnik ? (analytics.pesertaLakiLaki / analytics.totalPesertaUnik) * 100 : 0),
      ],
      [
        'Peserta Perempuan',
        formatNumber(analytics.pesertaPerempuan),
        formatPct(analytics.totalPesertaUnik ? (analytics.pesertaPerempuan / analytics.totalPesertaUnik) * 100 : 0),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 102, 164], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 2. Distribusi Peserta Berdasarkan LPTK
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Distribusi Peserta Berdasarkan LPTK', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['No', 'Nama LPTK', 'Peserta', 'Persentase', 'Laki-Laki', 'Perempuan']],
    body: analytics.byLptk.map((item, idx) => [
      idx + 1,
      item.name,
      formatNumber(item.count),
      formatPct(item.percentage),
      formatNumber(item.maleCount ?? 0),
      formatNumber(item.femaleCount ?? 0),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [23, 54, 93], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 3. Distribusi Jenis Kelamin & Status Matrikulasi
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Distribusi Jenis Kelamin', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['Jenis Kelamin', 'Jumlah Peserta', 'Persentase']],
    body: analytics.byJenisKelamin.map((g) => [
      g.name,
      formatNumber(g.count),
      formatPct(g.percentage),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 164], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Distribusi Status Matrikulasi', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['Status Matrikulasi', 'Jumlah Peserta', 'Persentase']],
    body: analytics.byStatusMatrikulasi.map((s) => [
      s.name,
      formatNumber(s.count),
      formatPct(s.percentage),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [23, 54, 93], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 5. Distribusi Bidang Studi
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Distribusi Bidang Studi', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['No', 'Bidang Studi', 'Peserta', 'Persentase']],
    body: analytics.byBidangStudi.map((b, idx) => [
      idx + 1,
      b.name,
      formatNumber(b.count),
      formatPct(b.percentage),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 164], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 6. Distribusi Wilayah Domisili (Provinsi & Top Kota/Kab)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('6. Distribusi Wilayah Domisili (Provinsi)', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['No', 'Provinsi Domisili', 'Peserta', 'Persentase']],
    body: analytics.byProvinsi.map((p, idx) => [
      idx + 1,
      p.name,
      formatNumber(p.count),
      formatPct(p.percentage),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [23, 54, 93], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('7. Top 15 Kota/Kabupaten Domisili', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [['No', 'Kota/Kabupaten', 'Provinsi', 'Peserta', 'Persentase']],
    body: analytics.byKotaKab.slice(0, 15).map((k, idx) => [
      idx + 1,
      k.name,
      k.extraLabel ?? '-',
      formatNumber(k.count),
      formatPct(k.percentage),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 164], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [23, 54, 93] },
    margin: { left: 14, right: 14 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan_PPG_UT_${stamp}.pdf`);
}
