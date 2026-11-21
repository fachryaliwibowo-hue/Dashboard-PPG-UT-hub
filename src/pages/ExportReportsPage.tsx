import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Table2,
} from 'lucide-react';
import { computeAnalytics } from '../engine/analyticsEngine';
import {
  exportBidangStudiSummaryToExcel,
  exportLptkSummaryToExcel,
  exportParticipantsToCsv,
  exportParticipantsToExcel,
  exportStatusMatrikulasiToExcel,
  generatePdfReport,
} from '../engine/exportEngine';
import { hasActiveFilters } from '../engine/filteringEngine';
import {
  DatasetMetadata,
  GlobalFilters,
  ParticipantRecord,
  UserRole,
} from '../types/participant';

interface ExportReportsPageProps {
  allRecords: ParticipantRecord[];
  filteredRecords: ParticipantRecord[];
  metadata: DatasetMetadata;
  filters: GlobalFilters;
  userRole: UserRole;
}

export const ExportReportsPage: React.FC<ExportReportsPageProps> = ({
  allRecords,
  filteredRecords,
  metadata,
  filters,
  userRole,
}) => {
  const isAdmin = userRole === 'admin';
  const [useFilteredScope, setUseFilteredScope] = useState(true);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string | null>(null);

  const filtersActive = hasActiveFilters(filters);
  const effectiveFiltered = useFilteredScope && filtersActive;

  const targetRecords = effectiveFiltered ? filteredRecords : allRecords;
  const reportAnalytics = useMemo(
    () => computeAnalytics(targetRecords),
    [targetRecords]
  );

  const handleGenerateReport = () => {
    setReportGeneratedAt(
      new Date().toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'medium',
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Export Actions Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#17365D]">
              {isAdmin
                ? 'Ekspor Data & Pelaporan Resmi PPG UT'
                : 'Ringkasan Laporan & Agregasi PPG UT'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Unduh seluruh database peserta, data terfilter, tabel agregasi, serta laporan ringkasan PDF.'
                : 'Lihat pratinjau laporan ringkasan analisis, unduh laporan PDF, serta tabel agregasi ringkasan.'}
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-[#F5F7FA] border border-slate-200 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setUseFilteredScope(true)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                useFilteredScope
                  ? 'bg-white text-[#17365D] shadow-xs'
                  : 'text-slate-600 hover:text-[#17365D]'
              }`}
            >
              Data Terfilter ({filteredRecords.length.toLocaleString('id-ID')})
            </button>
            <button
              type="button"
              onClick={() => setUseFilteredScope(false)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                !useFilteredScope
                  ? 'bg-white text-[#17365D] shadow-xs'
                  : 'text-slate-600 hover:text-[#17365D]'
              }`}
            >
              Seluruh Cakupan ({allRecords.length.toLocaleString('id-ID')})
            </button>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${
            isAdmin ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-1 max-w-xl'
          } gap-4`}
        >
          {/* Card 1: Full Database Excel — ONLY VISIBLE TO ADMIN */}
          {isAdmin && (
            <div className="p-4 rounded-xl border border-slate-200 bg-[#F5F7FA]/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#17365D]">
                  <FileSpreadsheet className="w-4 h-4 text-[#0066A4]" />
                  <span>Database Peserta Lengkap</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ekspor seluruh {allRecords.length.toLocaleString('id-ID')} baris peserta dari file Excel aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  exportParticipantsToExcel(allRecords, 'Seluruh_Database_Peserta_PPG_UT')
                }
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#17365D] hover:bg-[#0066A4] rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Seluruh Database (.xlsx)</span>
              </button>
            </div>
          )}

          {/* Card 2: Filtered Raw Data Excel & CSV — ONLY VISIBLE TO ADMIN */}
          {isAdmin && (
            <div className="p-4 rounded-xl border border-slate-200 bg-[#F5F7FA]/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#17365D]">
                  <Table2 className="w-4 h-4 text-[#0066A4]" />
                  <span>Data Berdasarkan Filter Aktif</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Ekspor {filteredRecords.length.toLocaleString('id-ID')} baris sesuai filter dashboard saat ini.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={filteredRecords.length === 0}
                  onClick={() =>
                    exportParticipantsToExcel(filteredRecords, 'Data_Terfilter_PPG_UT')
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:bg-slate-300 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  disabled={filteredRecords.length === 0}
                  onClick={() =>
                    exportParticipantsToCsv(filteredRecords, 'Data_Terfilter_PPG_UT')
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#17365D] bg-white border border-slate-200 hover:bg-[#EAF3F9] disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Summary Tables */}
          <div className="p-4 rounded-xl border border-slate-200 bg-[#F5F7FA]/50 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#17365D]">
                <FileSpreadsheet className="w-4 h-4 text-[#27AE60]" />
                <span>Tabel Ringkasan Agregasi</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unduh tabel rekapitulasi statistik terstruktur sesuai cakupan yang dipilih di atas.
              </p>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => exportLptkSummaryToExcel(reportAnalytics)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-[#17365D] bg-white border border-slate-200 hover:bg-[#EAF3F9] rounded-lg transition-colors"
              >
                <span>Ringkasan Peserta per LPTK</span>
                <Download className="w-3.5 h-3.5 text-[#0066A4]" />
              </button>
              <button
                type="button"
                onClick={() => exportBidangStudiSummaryToExcel(reportAnalytics)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-[#17365D] bg-white border border-slate-200 hover:bg-[#EAF3F9] rounded-lg transition-colors"
              >
                <span>Distribusi Bidang Studi</span>
                <Download className="w-3.5 h-3.5 text-[#0066A4]" />
              </button>
              <button
                type="button"
                onClick={() => exportStatusMatrikulasiToExcel(reportAnalytics)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-[#17365D] bg-white border border-slate-200 hover:bg-[#EAF3F9] rounded-lg transition-colors"
              >
                <span>Distribusi Status Matrikulasi</span>
                <Download className="w-3.5 h-3.5 text-[#0066A4]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report & PDF Download */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-[#17365D]">
              Generator Laporan Ringkasan Analisis
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menghasilkan laporan resmi berisi 8 indikator wajib berdasarkan database aktual ({effectiveFiltered ? 'Cakupan Filter Aktif' : 'Seluruh Database'}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerateReport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#17365D] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 text-[#0066A4]" />
              <span>Generate Report</span>
            </button>
            <button
              type="button"
              onClick={() =>
                generatePdfReport(
                  reportAnalytics,
                  metadata,
                  filters,
                  effectiveFiltered
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Download Laporan PDF</span>
            </button>
          </div>
        </div>

        {/* Live Report Document Preview */}
        <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-[11px] font-semibold text-[#0066A4] uppercase tracking-wider">
                Laporan Resmi Monitoring Akademik
              </div>
              <h4 className="text-lg font-bold text-[#17365D] mt-0.5">
                PPG UT — Participant Data Analysis Report
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Sumber Data: Database Peserta PPG UT · Cakupan:{' '}
                {effectiveFiltered ? 'Data Terfilter Aktif' : 'Seluruh Database'}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 tabular-nums">
              {reportGeneratedAt ? (
                <div>
                  <div className="font-semibold text-[#27AE60]">Laporan Dibuat</div>
                  <div>{reportGeneratedAt}</div>
                </div>
              ) : (
                <div>Pratinjau Langsung</div>
              )}
            </div>
          </div>

          {/* Items 1, 2, 3 & Gender summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">1. Total Peserta</div>
              <div className="text-lg font-bold text-[#17365D] tabular-nums">
                {reportAnalytics.totalPesertaUnik.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">2. Jumlah LPTK</div>
              <div className="text-lg font-bold text-[#17365D] tabular-nums">
                {reportAnalytics.totalLptk.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">3. Jumlah Bidang Studi</div>
              <div className="text-lg font-bold text-[#17365D] tabular-nums">
                {reportAnalytics.totalBidangStudi.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Peserta Laki-Laki</div>
              <div className="text-lg font-bold text-[#0066A4] tabular-nums">
                {reportAnalytics.pesertaLakiLaki.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Peserta Perempuan</div>
              <div className="text-lg font-bold text-[#F39C35] tabular-nums">
                {reportAnalytics.pesertaPerempuan.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
              <div className="text-[11px] text-slate-500">Provinsi Domisili</div>
              <div className="text-lg font-bold text-[#27AE60] tabular-nums">
                {reportAnalytics.totalProvinsi.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* 4. LPTK & 5. Gender & 7. Status Matrikulasi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div>
              <h5 className="font-semibold text-[#17365D] mb-2">
                4. Distribusi Peserta Berdasarkan LPTK
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F7FA] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">LPTK</th>
                      <th className="py-2 px-3 font-semibold text-right">Peserta</th>
                      <th className="py-2 px-3 font-semibold text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportAnalytics.byLptk.map((item) => (
                      <tr key={item.name}>
                        <td className="py-1.5 px-3 text-[#17365D]">{item.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular">
                          {item.count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular text-[#0066A4]">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold text-[#17365D] mb-2">
                  5. Distribusi Jenis Kelamin
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F5F7FA] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Jenis Kelamin</th>
                        <th className="py-2 px-3 font-semibold text-right">Peserta</th>
                        <th className="py-2 px-3 font-semibold text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportAnalytics.byJenisKelamin.map((item) => (
                        <tr key={item.name}>
                          <td className="py-1.5 px-3 text-[#17365D]">{item.name}</td>
                          <td className="py-1.5 px-3 text-right font-mono-tabular">
                            {item.count.toLocaleString('id-ID')}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono-tabular text-[#0066A4]">
                            {item.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-[#17365D] mb-2">
                  7. Distribusi Status Matrikulasi
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F5F7FA] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Status Matrikulasi</th>
                        <th className="py-2 px-3 font-semibold text-right">Peserta</th>
                        <th className="py-2 px-3 font-semibold text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportAnalytics.byStatusMatrikulasi.map((item) => (
                        <tr key={item.name}>
                          <td className="py-1.5 px-3 text-[#17365D]">{item.name}</td>
                          <td className="py-1.5 px-3 text-right font-mono-tabular">
                            {item.count.toLocaleString('id-ID')}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono-tabular text-[#0066A4]">
                            {item.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Bidang Studi & 8. Wilayah Domisili */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div>
              <h5 className="font-semibold text-[#17365D] mb-2">
                6. Distribusi Bidang Studi
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F7FA] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Bidang Studi</th>
                      <th className="py-2 px-3 font-semibold text-right">Peserta</th>
                      <th className="py-2 px-3 font-semibold text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportAnalytics.byBidangStudi.map((item) => (
                      <tr key={item.name}>
                        <td className="py-1.5 px-3 text-[#17365D]">{item.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular">
                          {item.count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular text-[#0066A4]">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-[#17365D] mb-2">
                8. Distribusi Wilayah Domisili (Provinsi)
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F7FA] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Provinsi</th>
                      <th className="py-2 px-3 font-semibold text-right">Peserta</th>
                      <th className="py-2 px-3 font-semibold text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportAnalytics.byProvinsi.map((item) => (
                      <tr key={item.name}>
                        <td className="py-1.5 px-3 text-[#17365D]">{item.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular">
                          {item.count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono-tabular text-[#0066A4]">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
