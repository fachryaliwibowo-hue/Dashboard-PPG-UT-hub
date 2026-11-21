import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  GitCompare,
  History,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { DataOnboardingUpload } from '../components/DataOnboardingUpload';
import {
  AdminMemberRecord,
  addAuthorizedAdmin,
  listAuthorizedAdmins,
  removeAuthorizedAdmin,
  toSafeEmailId,
} from '../engine/cloudSync';
import { exportVerificationIssuesToExcel } from '../engine/exportEngine';
import { BOOTSTRAPPED_ADMIN_EMAIL, auth } from '../firebase';
import {
  AuditLogEntry,
  DatasetHistoryEntry,
  DatasetMetadata,
  ParsedExcelPreview,
  ParticipantRecord,
  PrivacyConfig,
  ValidationReport,
} from '../types/participant';

interface DataManagementPageProps {
  metadata: DatasetMetadata | null;
  validation: ValidationReport | null;
  allRecords: ParticipantRecord[];
  uploadedByEmail?: string;
  privacyConfig: PrivacyConfig;
  datasetHistory: DatasetHistoryEntry[];
  auditLogs: AuditLogEntry[];
  onSavePrivacyConfig: (config: {
    maskPtkId: boolean;
    maskAkunSimpkb: boolean;
  }) => Promise<void>;
  onReplaceDataset: (preview: ParsedExcelPreview) => Promise<void> | void;
  onClearDataset: () => Promise<void> | void;
  onInspectInDatabase: (qualityMode: 'duplicate_ptk' | 'empty_ptk') => void;
  isUploading?: boolean;
  uploadProgress?: number | null;
  uploadError?: string | null;
}

type DataManagementTab = 'database' | 'audit-ptk' | 'riwayat' | 'privasi-admin';

export const DataManagementPage: React.FC<DataManagementPageProps> = ({
  metadata,
  validation,
  allRecords,
  uploadedByEmail,
  privacyConfig,
  datasetHistory,
  auditLogs,
  onSavePrivacyConfig,
  onReplaceDataset,
  onClearDataset,
  onInspectInDatabase,
  isUploading = false,
  uploadProgress = null,
  uploadError = null,
}) => {
  const [activeTab, setActiveTab] = useState<DataManagementTab>('database');
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null);

  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');

  useEffect(() => {
    if (datasetHistory.length >= 1 && !compareLeftId) {
      setCompareLeftId(datasetHistory[0].id);
    }
    if (datasetHistory.length >= 2 && !compareRightId) {
      setCompareRightId(datasetHistory[1].id);
    }
  }, [datasetHistory, compareLeftId, compareRightId]);

  const compareCurrent = useMemo(
    () => datasetHistory.find((h) => h.id === compareLeftId) ?? datasetHistory[0] ?? null,
    [datasetHistory, compareLeftId]
  );

  const comparePrev = useMemo(
    () => datasetHistory.find((h) => h.id === compareRightId) ?? datasetHistory[1] ?? null,
    [datasetHistory, compareRightId]
  );

  const handleTogglePrivacy = async (field: 'maskPtkId' | 'maskAkunSimpkb') => {
    setPrivacyMsg(null);
    setIsSavingPrivacy(true);
    try {
      const next = {
        maskPtkId: field === 'maskPtkId' ? !privacyConfig.maskPtkId : privacyConfig.maskPtkId,
        maskAkunSimpkb:
          field === 'maskAkunSimpkb'
            ? !privacyConfig.maskAkunSimpkb
            : privacyConfig.maskAkunSimpkb,
      };
      await onSavePrivacyConfig(next);
      setPrivacyMsg('Pengaturan privasi Mode User berhasil diperbarui di cloud.');
    } catch (err) {
      setPrivacyMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan privasi.'
      );
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const formattedDate = metadata
    ? new Date(metadata.uploadedAt).toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  const handleConfirmClear = async () => {
    setClearError(null);
    setIsClearing(true);
    try {
      await onClearDataset();
      setConfirmClear(false);
    } catch (err) {
      setClearError(
        err instanceof Error ? err.message : 'Gagal menghapus database dari cloud.'
      );
    } finally {
      setIsClearing(false);
    }
  };

  const issueCount = validation?.rowsNeedingVerificationCount ?? 0;

  const tabs: {
    id: DataManagementTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    countText?: string;
  }[] = [
    {
      id: 'database',
      label: 'Database & Unggah',
      icon: Upload,
    },
    {
      id: 'audit-ptk',
      label: 'Audit Kualitas PTK',
      icon: AlertTriangle,
      countText: issueCount > 0 ? issueCount.toLocaleString('id-ID') : undefined,
    },
    {
      id: 'riwayat',
      label: 'Riwayat & Audit Log',
      icon: History,
      countText:
        datasetHistory.length > 0 ? datasetHistory.length.toLocaleString('id-ID') : undefined,
    },
    {
      id: 'privasi-admin',
      label: 'Privasi & Akses Admin',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Compact Segmented Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#17365D] text-white font-semibold'
                  : 'text-slate-600 hover:bg-[#F5F7FA] hover:text-[#17365D]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.countText && (
                <span
                  className={`tabular-nums text-[11px] ${
                    isActive ? 'text-slate-200' : 'text-amber-700 font-semibold'
                  }`}
                >
                  · {tab.countText}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          {activeTab === 'database' && (
            <>
              {metadata && validation && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#17365D]">
                          Database Cloud Aktif Saat Ini
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                          <span className="inline-flex items-center gap-1 font-medium text-[#17365D]">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0066A4]" />
                            Database Peserta Aktif
                          </span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span>Sheet: {metadata.sheetName}</span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                            Diperbarui: {formattedDate}
                          </span>
                          {uploadedByEmail && uploadedByEmail !== 'Admin' && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span>Diunggah oleh {uploadedByEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {validation.rowsNeedingVerificationCount > 0 && (
                        <button
                          type="button"
                          onClick={() => exportVerificationIssuesToExcel(allRecords)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            Ekspor Data Bermasalah (
                            {validation.rowsNeedingVerificationCount.toLocaleString('id-ID')})
                          </span>
                        </button>
                      )}

                      {!confirmClear ? (
                        <button
                          type="button"
                          onClick={() => setConfirmClear(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Kosongkan Database</span>
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-red-700 font-medium">
                            Hapus database cloud untuk semua perangkat?
                          </span>
                          <button
                            type="button"
                            disabled={isClearing}
                            onClick={handleConfirmClear}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg"
                          >
                            {isClearing ? 'Menghapus...' : 'Ya, Kosongkan'}
                          </button>
                          <button
                            type="button"
                            disabled={isClearing}
                            onClick={() => setConfirmClear(false)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {clearError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      {clearError}
                    </div>
                  )}

                  {/* Integrity Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
                      <div className="text-[11px] text-slate-500">Total Baris Berhasil Dibaca</div>
                      <div className="text-xl font-bold text-[#17365D] tabular-nums mt-0.5">
                        {validation.totalRowsRead.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
                      <div className="text-[11px] text-slate-500">PTK ID Unik Valid</div>
                      <div className="text-xl font-bold text-[#0066A4] tabular-nums mt-0.5">
                        {validation.validUniquePtkCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
                      <div className="text-[11px] text-slate-500">Kelompok PTK ID Duplikat</div>
                      <div
                        className={`text-xl font-bold tabular-nums mt-0.5 ${
                          validation.duplicatePtkGroupCount > 0
                            ? 'text-amber-600'
                            : 'text-[#27AE60]'
                        }`}
                      >
                        {validation.duplicatePtkGroupCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
                      <div className="text-[11px] text-slate-500">Baris PTK ID Kosong</div>
                      <div
                        className={`text-xl font-bold tabular-nums mt-0.5 ${
                          validation.emptyPtkRowCount > 0 ? 'text-amber-600' : 'text-[#27AE60]'
                        }`}
                      >
                        {validation.emptyPtkRowCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
                      <div className="text-[11px] text-slate-500">Perlu Pemeriksaan</div>
                      <div
                        className={`text-xl font-bold tabular-nums mt-0.5 ${
                          validation.rowsNeedingVerificationCount > 0
                            ? 'text-amber-600'
                            : 'text-[#27AE60]'
                        }`}
                      >
                        {validation.rowsNeedingVerificationCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Column Completeness Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#17365D] mb-2">
                      Audit Kelengkapan Nilai per Kolom
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                            <th className="py-2.5 px-3 font-semibold">Kolom Database</th>
                            <th className="py-2.5 px-3 font-semibold">Header Excel Terdeteksi</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Terisi</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Kosong</th>
                            <th className="py-2.5 px-3 font-semibold text-right">
                              Persentase Kosong
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validation.columnNullStats.map((stat) => (
                            <tr key={stat.key} className="hover:bg-[#F5F7FA]/60">
                              <td className="py-2 px-3 font-semibold text-[#17365D]">
                                {stat.label}
                              </td>
                              <td className="py-2 px-3 font-mono-tabular text-slate-600">
                                {validation.matchedHeaders[stat.key] ?? '-'}
                              </td>
                              <td className="py-2 px-3 font-mono-tabular text-right text-[#27AE60]">
                                {stat.filledCount.toLocaleString('id-ID')}
                              </td>
                              <td
                                className={`py-2 px-3 font-mono-tabular text-right ${
                                  stat.emptyCount > 0
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-slate-500'
                                }`}
                              >
                                {stat.emptyCount.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3 font-mono-tabular text-right text-slate-600">
                                {stat.emptyPercentage.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload & Replace Database */}
              <DataOnboardingUpload
                onConfirmImport={onReplaceDataset}
                activeFileName={metadata?.fileName}
                isInitialOnboarding={!metadata}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
              />
            </>
          )}

          {activeTab === 'audit-ptk' && (
            <>
              {!metadata || !validation ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center mx-auto">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-sm font-bold text-[#17365D]">
                      Belum Ada Database Excel Aktif
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Unggah file Excel peserta terlebih dahulu melalui tab Database & Unggah untuk memeriksa baris PTK ID duplikat atau kosong.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('database')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Buka Tab Database & Unggah</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {validation.duplicateGroups.length > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#27AE60]" />
                          )}
                          <h3 className="text-sm font-semibold text-[#17365D]">
                            Daftar PTK ID Duplikat (
                            {validation.duplicateGroups.length.toLocaleString('id-ID')})
                          </h3>
                        </div>

                        {validation.duplicateGroups.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onInspectInDatabase('duplicate_ptk')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-md"
                          >
                            <Search className="w-3 h-3" />
                            <span>Lihat di Tabel</span>
                          </button>
                        )}
                      </div>

                      {validation.duplicateGroups.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4">
                          Tidak ditemukan PTK ID duplikat dalam file Excel yang aktif.
                        </p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                          {validation.duplicateGroups.map((grp) => (
                            <div key={grp.ptkId} className="p-3 space-y-1">
                              <div className="flex items-center justify-between font-semibold text-[#17365D]">
                                <span className="font-mono-tabular">PTK ID: {grp.ptkId}</span>
                                <span className="text-amber-700 font-mono-tabular">
                                  {grp.count} baris
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 space-y-0.5">
                                {grp.rows.map((r) => (
                                  <div key={r.rowIndex} className="truncate">
                                    Baris Excel #{r.excelRowNumber} — {r.namaPeserta || '(Tanpa Nama)'} ·{' '}
                                    {r.lptk || '(LPTK Kosong)'}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">
                      Baris duplikat tidak dihapus dari tabel database. Pada perhitungan KPI & grafik, setiap PTK ID unik dihitung 1 kali.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          {validation.emptyPtkRows.length > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#27AE60]" />
                          )}
                          <h3 className="text-sm font-semibold text-[#17365D]">
                            Baris PTK ID Kosong (
                            {validation.emptyPtkRows.length.toLocaleString('id-ID')})
                          </h3>
                        </div>

                        {validation.emptyPtkRows.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onInspectInDatabase('empty_ptk')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-md"
                          >
                            <Search className="w-3 h-3" />
                            <span>Lihat di Tabel</span>
                          </button>
                        )}
                      </div>

                      {validation.emptyPtkRows.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4">
                          Seluruh baris data memiliki nilai PTK ID yang terisi.
                        </p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                          {validation.emptyPtkRows.slice(0, 50).map((r) => (
                            <div
                              key={r.rowIndex}
                              className="p-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-[#17365D] truncate">
                                  {r.namaPeserta || '(Nama Kosong)'}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  Baris Excel #{r.excelRowNumber} · {r.lptk || '-'}
                                </div>
                              </div>
                              <span className="text-[11px] text-amber-700 font-medium shrink-0">
                                Perlu Verifikasi
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">
                      Baris tanpa PTK ID tetap ditampilkan di Database Peserta dengan penanda verifikasi, namun tidak dihitung dalam total peserta unik.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'riwayat' && (
            <>
              {/* Dataset Wave History & Comparison */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                      <GitCompare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#17365D]">
                        Riwayat Unggahan & Komparasi Gelombang Data
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ringkasan rekapitulasi setiap revisi database yang diunggah ke cloud untuk memantau perkembangan antar periode.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {datasetHistory.length.toLocaleString('id-ID')} revisi tersimpan
                  </span>
                </div>

                {datasetHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Belum ada riwayat unggahan tercatat. Snapshot otomatis dibuat setiap kali Admin mempublikasikan dataset baru.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {datasetHistory.length >= 2 && compareCurrent && comparePrev && (
                      <div className="p-4 rounded-xl bg-[#F5F7FA] border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-semibold text-[#17365D]">Bandingkan:</span>
                          <select
                            value={compareCurrent.id}
                            onChange={(e) => setCompareLeftId(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-[#17365D]"
                          >
                            {datasetHistory.map((h) => (
                              <option key={h.id} value={h.id}>
                                {new Date(h.uploadedAt).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}{' '}
                                ({h.validUniquePtkCount.toLocaleString('id-ID')} PTK)
                              </option>
                            ))}
                          </select>
                          <span className="text-slate-400">vs</span>
                          <select
                            value={comparePrev.id}
                            onChange={(e) => setCompareRightId(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-[#17365D]"
                          >
                            {datasetHistory.map((h) => (
                              <option key={h.id} value={h.id}>
                                {new Date(h.uploadedAt).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}{' '}
                                ({h.validUniquePtkCount.toLocaleString('id-ID')} PTK)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          {(
                            [
                              {
                                label: 'Peserta Unik',
                                cur: compareCurrent.validUniquePtkCount,
                                prev: comparePrev.validUniquePtkCount,
                              },
                              {
                                label: 'Total LPTK',
                                cur: compareCurrent.totalLptk,
                                prev: comparePrev.totalLptk,
                              },
                              {
                                label: 'Bidang Studi',
                                cur: compareCurrent.totalBidangStudi,
                                prev: comparePrev.totalBidangStudi,
                              },
                              {
                                label: 'Provinsi Domisili',
                                cur: compareCurrent.totalProvinsi,
                                prev: comparePrev.totalProvinsi,
                              },
                            ] as const
                          ).map((m) => {
                            const diff = m.cur - m.prev;
                            return (
                              <div
                                key={m.label}
                                className="bg-white border border-slate-200 rounded-lg p-3"
                              >
                                <div className="text-[11px] text-slate-500">{m.label}</div>
                                <div className="text-base font-bold text-[#17365D] font-mono-tabular mt-0.5">
                                  {m.cur.toLocaleString('id-ID')}
                                </div>
                                <div
                                  className={`text-[11px] font-mono-tabular font-semibold ${
                                    diff > 0
                                      ? 'text-[#16A34A]'
                                      : diff < 0
                                      ? 'text-red-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {diff > 0
                                    ? `+${diff.toLocaleString('id-ID')}`
                                    : diff.toLocaleString('id-ID')}{' '}
                                  vs pembanding
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-[#F5F7FA] z-10">
                          <tr className="border-b border-slate-200 text-[#17365D]">
                            <th className="py-2 px-3 font-semibold">Waktu Publikasi</th>
                            <th className="py-2 px-3 font-semibold">Pengunggah</th>
                            <th className="py-2 px-3 font-semibold">Sheet</th>
                            <th className="py-2 px-3 font-semibold text-right">PTK Unik</th>
                            <th className="py-2 px-3 font-semibold text-right">Total Baris</th>
                            <th className="py-2 px-3 font-semibold text-right">LPTK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {datasetHistory.map((h) => (
                            <tr key={h.id} className="hover:bg-[#F5F7FA]/60">
                              <td className="py-2 px-3 font-mono-tabular text-[#17365D] whitespace-nowrap">
                                {new Date(h.uploadedAt).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {h.uploadedByEmail || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{h.sheetName || '-'}</td>
                              <td className="py-2 px-3 text-right font-mono-tabular font-semibold text-[#0066A4]">
                                {h.validUniquePtkCount.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono-tabular text-slate-700">
                                {h.totalRows.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3 text-right font-mono-tabular text-slate-700">
                                {h.totalLptk.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Activity Audit Logs */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#17365D]">
                        Audit Log Aktivitas Admin
                      </h3>
                      <p className="text-xs text-slate-500">
                        Catatan kronologis perubahan dataset, jadwal, lokasi perkuliahan, dan pengaturan privasi.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {auditLogs.length.toLocaleString('id-ID')} aktivitas terakhir
                  </span>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Belum ada aktivitas Admin yang tercatat pada log audit.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80 overflow-y-auto text-xs">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-[#0066A4]">{log.aksi}</span>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-[#17365D]">{log.ringkasan}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Oleh {log.actorEmail}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tabular whitespace-nowrap shrink-0">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'privasi-admin' && (
            <>
              {/* User Privacy Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#17365D]">
                      Keamanan Data &amp; Privasi Mode User
                    </h3>
                    <p className="text-xs text-slate-500">
                      Menu Database Peserta dan dataset mentah dibatasi khusus Admin. Mode User hanya menerima statistik teranonimasi, sedangkan Cek Penempatan menggunakan pencarian ID penuh berbasis hash SHA-256 dengan PTK ID dan Akun SIMPKB otomatis disamarkan.
                    </p>
                  </div>
                </div>

                {privacyMsg && (
                  <div className="p-3 rounded-lg bg-[#EAF3F9] border border-[#0066A4]/25 text-xs text-[#17365D]">
                    {privacyMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200 cursor-pointer">
                    <div>
                      <div className="font-semibold text-[#17365D]">Samarkan PTK ID</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono-tabular">
                        Contoh: 201500123456 → 2015******56
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isSavingPrivacy}
                      checked={privacyConfig.maskPtkId}
                      onChange={() => handleTogglePrivacy('maskPtkId')}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0066A4] focus:ring-[#0066A4]"
                    />
                  </label>

                  <label className="flex items-start justify-between gap-3 p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200 cursor-pointer">
                    <div>
                      <div className="font-semibold text-[#17365D]">Samarkan Akun SIMPKB</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono-tabular">
                        Contoh: 201500123456@guruku.id → 2015********@guruku.id
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isSavingPrivacy}
                      checked={privacyConfig.maskAkunSimpkb}
                      onChange={() => handleTogglePrivacy('maskAkunSimpkb')}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0066A4] focus:ring-[#0066A4]"
                    />
                  </label>
                </div>
              </div>

              {/* Authorized Google Admins Directory */}
              <AuthorizedAdminsPanel />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const AuthorizedAdminsPanel: React.FC = () => {
  const [admins, setAdmins] = useState<AdminMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listAuthorizedAdmins();
      setAdmins(list);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar Admin.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const normalized = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setStatusMsg({ type: 'error', text: 'Masukkan alamat email Google yang valid.' });
      return;
    }

    if (normalized === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      setStatusMsg({
        type: 'error',
        text: 'Email tersebut sudah terdaftar permanen sebagai Admin Utama.',
      });
      return;
    }

    const candidateId = toSafeEmailId(normalized);
    if (admins.some((a) => a.id === candidateId || a.email.toLowerCase() === normalized)) {
      setStatusMsg({
        type: 'error',
        text: `Akun ${normalized} sudah terdaftar di Daftar Admin.`,
      });
      return;
    }

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      setStatusMsg({
        type: 'error',
        text: 'Sesi login Google Admin tidak ditemukan. Silakan login ulang.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addAuthorizedAdmin(normalized, currentUid);
      setNewEmail('');
      setStatusMsg({
        type: 'success',
        text: `Email ${normalized} berhasil ditambahkan. Pengguna tersebut kini dapat login sebagai Admin dari perangkat mana saja.`,
      });
      await loadAdmins();
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menambahkan email Admin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminMemberRecord) => {
    setStatusMsg(null);
    setIsSubmitting(true);
    try {
      await removeAuthorizedAdmin(admin.id);
      setConfirmRemoveId(null);
      setStatusMsg({
        type: 'success',
        text: `Akses Admin untuk ${admin.email} telah dicabut.`,
      });
      await loadAdmins();
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus Admin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#17365D]">
            Daftar Akun Google Admin Terotorisasi
          </h3>
          <p className="text-xs text-slate-500">
            Tambahkan alamat email Google rekan pengelola PPG UT agar mereka dapat login sebagai Admin di perangkat lain dan melihat/mengelola database cloud yang sama.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-xs ${
            statusMsg.type === 'success'
              ? 'bg-[#27AE60]/10 border-[#27AE60]/30 text-[#1E874B]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            placeholder="Masukkan email Google Admin baru (contoh: pengelola@gmail.com)"
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#0066A4] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Menyimpan...' : 'Tambah Admin'}</span>
        </button>
      </form>

      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
        {/* Primary Bootstrapped Admin */}
        <div className="p-3 flex items-center justify-between gap-3 bg-[#F5F7FA]/60">
          <div className="min-w-0">
            <div className="font-semibold text-[#17365D] truncate">
              {BOOTSTRAPPED_ADMIN_EMAIL}
            </div>
            <div className="text-[11px] text-slate-500">Admin Utama (Permanen)</div>
          </div>
          <span className="text-[11px] font-medium text-[#0066A4] shrink-0">Aktif</span>
        </div>

        {isLoading ? (
          <div className="p-3 text-slate-500">Memuat daftar Admin tambahan...</div>
        ) : admins.length === 0 ? (
          <div className="p-3 text-slate-500">
            Belum ada Admin tambahan. Gunakan formulir di atas untuk menambahkan email Google Admin lain.
          </div>
        ) : (
          admins.map((admin) => (
            <div key={admin.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[#17365D] truncate">{admin.email}</div>
                <div className="text-[11px] text-slate-400">
                  Ditambahkan{' '}
                  {new Date(admin.createdAt).toLocaleDateString('id-ID', {
                    dateStyle: 'medium',
                  })}
                </div>
              </div>

              {confirmRemoveId === admin.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleRemoveAdmin(admin)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded"
                  >
                    Cabut Akses
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(null)}
                    className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveId(admin.id)}
                  title="Hapus akses Admin"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
