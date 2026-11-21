import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from 'lucide-react';
import { downloadExcelTemplate, parseExcelFile } from '../engine/excelIngestion';
import { EXPECTED_COLUMNS, ParsedExcelPreview } from '../types/participant';

interface DataOnboardingUploadProps {
  onConfirmImport: (preview: ParsedExcelPreview) => Promise<void> | void;
  isInitialOnboarding?: boolean;
  activeFileName?: string;
  isUploading?: boolean;
  uploadProgress?: number | null;
  uploadError?: string | null;
}

export const DataOnboardingUpload: React.FC<DataOnboardingUploadProps> = ({
  onConfirmImport,
  isInitialOnboarding = false,
  activeFileName,
  isUploading = false,
  uploadProgress = null,
  uploadError = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedExcelPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileProcess = async (file: File, targetSheet?: string) => {
    setErrorMsg(null);
    setIsParsing(true);
    try {
      const parsed = await parseExcelFile(file, targetSheet);
      setSelectedFile(file);
      setPreview(parsed);
    } catch (err) {
      setPreview(null);
      setSelectedFile(null);
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat membaca file Excel.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (selectedFile) {
      handleFileProcess(selectedFile, sheetName);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#17365D]">
              {activeFileName
                ? 'Unggah File Excel Baru (Ganti Database Aktif)'
                : 'Unggah Database Peserta PPG (.xlsx / .xls)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              File baru akan menggantikan database aktif setelah Anda memeriksa validasi dan mengonfirmasi impor.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadExcelTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template Excel (.xlsx)</span>
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[#0066A4] bg-[#EAF3F9]/60'
              : 'border-slate-300 bg-[#F5F7FA]/70 hover:border-[#0066A4] hover:bg-[#EAF3F9]/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-[#0066A4]">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#17365D]">
            {isParsing
              ? 'Sedang membaca dan memvalidasi file Excel...'
              : 'Seret & letakkan file Excel di sini, atau klik untuk memilih file'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Mendukung format Microsoft Excel (.xlsx, .xls) dengan pemetaan otomatis berdasarkan nama header kolom.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900">
              <div className="font-semibold">Format File Tidak Valid</div>
              <p className="mt-0.5 text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Import Validation & Preview */}
      {preview && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#17365D]">
                  Pratinjau & Validasi Pra-Impor
                </h3>
                <p className="text-xs text-slate-500">
                  File Excel Terpilih · {(preview.metadata.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {preview.metadata.availableSheets.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Worksheet:</label>
                <select
                  value={preview.metadata.sheetName}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-[#17365D] focus:outline-none focus:border-[#0066A4]"
                >
                  {preview.metadata.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Structure check alert */}
          {!preview.validation.isStructureValid ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 space-y-1">
                <div className="font-semibold">
                  Struktur Kolom Tidak Sesuai Standar Database PPG UT
                </div>
                {preview.validation.missingRequiredHeaders.length > 0 && (
                  <p>
                    Kolom wajib yang tidak ditemukan:{' '}
                    <strong>{preview.validation.missingRequiredHeaders.join(', ')}</strong>
                  </p>
                )}
                {preview.validation.totalRowsRead === 0 && (
                  <p>Tidak ditemukan baris data peserta di bawah header kolom.</p>
                )}
                <p className="text-red-700">
                  Harap periksa kembali header file Excel Anda atau unduh template resmi di atas.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#27AE60]/8 border border-[#27AE60]/25 flex items-center gap-3 text-xs text-[#17365D]">
              <CheckCircle2 className="w-4 h-4 text-[#27AE60] shrink-0" />
              <span>
                Struktur header Excel sesuai. Seluruh kolom wajib berhasil dipetakan secara otomatis.
              </span>
            </div>
          )}

          {/* Validation Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Total Baris Terbaca</div>
              <div className="text-lg font-bold text-[#17365D] tabular-nums mt-0.5">
                {preview.validation.totalRowsRead.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">PTK ID Unik Valid</div>
              <div className="text-lg font-bold text-[#0066A4] tabular-nums mt-0.5">
                {preview.validation.validUniquePtkCount.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Duplikat PTK ID</div>
              <div
                className={`text-lg font-bold tabular-nums mt-0.5 ${
                  preview.validation.duplicatePtkGroupCount > 0
                    ? 'text-[#D97706]'
                    : 'text-[#27AE60]'
                }`}
              >
                {preview.validation.duplicatePtkGroupCount.toLocaleString('id-ID')} PTK (
                {preview.validation.duplicateExtraRowCount.toLocaleString('id-ID')} baris ekstra)
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Baris PTK ID Kosong</div>
              <div
                className={`text-lg font-bold tabular-nums mt-0.5 ${
                  preview.validation.emptyPtkRowCount > 0 ? 'text-[#D97706]' : 'text-[#27AE60]'
                }`}
              >
                {preview.validation.emptyPtkRowCount.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {preview.validation.rowsNeedingVerificationCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ditemukan{' '}
                <strong className="tabular-nums">
                  {preview.validation.rowsNeedingVerificationCount.toLocaleString('id-ID')}
                </strong>{' '}
                baris yang memerlukan verifikasi (PTK ID duplikat atau kosong). Data asli tidak akan dihapus dan tetap ditandai di menu Database Peserta serta Data Management.
              </span>
            </div>
          )}

          {/* Column Null Summary */}
          <div>
            <h4 className="text-xs font-semibold text-[#17365D] mb-2">
              Pemetaan Kolom & Kelengkapan Data
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {preview.validation.columnNullStats.map((stat) => {
                const matchedHeader = preview.validation.matchedHeaders[stat.key];
                return (
                  <div
                    key={stat.key}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white text-[11px]"
                  >
                    <div className="font-semibold text-[#17365D] truncate" title={stat.label}>
                      {stat.label}
                    </div>
                    <div className="text-slate-500 truncate mt-0.5">
                      {matchedHeader ? `Header: "${matchedHeader}"` : 'Tidak ditemukan'}
                    </div>
                    <div className="mt-1 font-mono-tabular text-slate-600">
                      Kosong: {stat.emptyCount.toLocaleString('id-ID')} (
                      {stat.emptyPercentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Rows Table */}
          {preview.records.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#17365D] mb-2">
                Pratinjau 10 Baris Pertama
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">NO</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">PTK ID</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">NAMA PESERTA</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">JK</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">KOTA/KAB</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">PROVINSI</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">LPTK</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">BIDANG STUDI</th>
                      <th className="py-2 px-3 font-semibold whitespace-nowrap">MATRIKULASI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.records.slice(0, 10).map((r) => (
                      <tr key={r.rowIndex} className="hover:bg-[#EAF3F9]/40">
                        <td className="py-2 px-3 font-mono-tabular text-slate-500">{r.no || r.rowIndex}</td>
                        <td className="py-2 px-3 font-mono-tabular text-[#17365D] whitespace-nowrap">
                          {r.ptkId || <span className="text-amber-600 italic">Kosong</span>}
                        </td>
                        <td className="py-2 px-3 text-[#17365D] font-medium max-w-[180px] truncate">
                          {r.namaPeserta || '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">{r.jenisKelamin || '-'}</td>
                        <td className="py-2 px-3 max-w-[150px] truncate">{r.kotaKab || '-'}</td>
                        <td className="py-2 px-3 max-w-[130px] truncate">{r.provinsi || '-'}</td>
                        <td className="py-2 px-3 max-w-[160px] truncate">{r.lptk || '-'}</td>
                        <td className="py-2 px-3 max-w-[160px] truncate">{r.bidangStudi || '-'}</td>
                        <td className="py-2 px-3 whitespace-nowrap">{r.statusMatrikulasi || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {isUploading && (
            <div className="p-4 rounded-xl bg-[#EAF3F9] border border-[#0066A4]/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#17365D]">
                <span>Mengunggah & menyinkronkan database ke Cloud...</span>
                <span className="font-mono-tabular">{uploadProgress ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-[#0066A4] transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.max(5, uploadProgress ?? 5))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                Mohon tunggu, seluruh baris sedang disimpan ke server agar dapat diakses dari semua perangkat.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleCancelPreview}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!preview.validation.isStructureValid || isUploading}
              onClick={async () => {
                try {
                  await onConfirmImport(preview);
                  setPreview(null);
                  setSelectedFile(null);
                } catch {
                  // Keep preview intact if cloud upload fails so admin can retry
                }
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isUploading
                ? `Menyinkronkan (${uploadProgress ?? 0}%)...`
                : activeFileName
                ? 'Konfirmasi & Ganti Database Aktif'
                : 'Konfirmasi Impor ke Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* Initial Onboarding Schema Guide */}
      {isInitialOnboarding && !preview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#17365D] mb-1">
              Standar Struktur Kolom File Excel
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sistem membaca kolom berdasarkan nama header berikut secara otomatis (urutan kolom fleksibel):
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                    <th className="py-2.5 px-3 font-semibold w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Header Excel</th>
                    <th className="py-2.5 px-3 font-semibold">Keterangan</th>
                    <th className="py-2.5 px-3 font-semibold">Contoh Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {EXPECTED_COLUMNS.map((col, idx) => (
                    <tr key={col.key} className="hover:bg-[#F5F7FA]/60">
                      <td className="py-2 px-3 font-mono-tabular text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono-tabular font-semibold text-[#0066A4] whitespace-nowrap">
                        {col.label}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{col.description}</td>
                      <td className="py-2 px-3 text-slate-500">{col.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#17365D] mb-3">
                Panduan Penggunaan
              </h3>
              <ol className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-[#17365D]">01. Siapkan Data Excel</strong> — Pastikan baris header memiliki nama kolom sesuai tabel di samping (format .xlsx atau .xls).
                </li>
                <li>
                  <strong className="text-[#17365D]">02. Unggah & Validasi</strong> — Seret file ke area unggah. Sistem otomatis memeriksa kelengkapan kolom, baris kosong, dan duplikat PTK ID tanpa menghapus data asli.
                </li>
                <li>
                  <strong className="text-[#17365D]">03. Analisis Interaktif</strong> — Seluruh KPI, grafik LPTK, bidang studi, demografi, matrikulasi, dan fitur ekspor PDF/Excel langsung aktif berdasarkan data aktual Anda.
                </li>
              </ol>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
              Seluruh pemrosesan Excel berjalan langsung di browser Anda untuk menjaga kecepatan dan kerahasiaan data peserta PPG Universitas Terbuka.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
