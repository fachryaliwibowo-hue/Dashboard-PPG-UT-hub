import React, { useMemo, useState } from 'react';
import { ClipboardCheck, RotateCcw } from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import { DonutChartPanel, StackedBarChartPanel } from '../components/Charts';
import { SearchableMultiSelect } from '../components/SearchableMultiSelect';
import { computeAnalytics } from '../engine/analyticsEngine';
import { FilterOption } from '../engine/filteringEngine';
import { ParticipantRecord } from '../types/participant';

interface AnalisisMatrikulasiPageProps {
  allRecords: ParticipantRecord[];
  lptkOptions: FilterOption[];
  bidangStudiOptions: FilterOption[];
}

export const AnalisisMatrikulasiPage: React.FC<AnalisisMatrikulasiPageProps> = ({
  allRecords,
  lptkOptions,
  bidangStudiOptions,
}) => {
  const [selectedLptk, setSelectedLptk] = useState<string[]>([]);
  const [selectedBidang, setSelectedBidang] = useState<string[]>([]);

  const scopedRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (selectedLptk.length > 0 && !selectedLptk.includes(r.normLptk)) return false;
      if (selectedBidang.length > 0 && !selectedBidang.includes(r.normBidangStudi)) return false;
      return true;
    });
  }, [allRecords, selectedLptk, selectedBidang]);

  const matrikulasiAnalytics = useMemo(() => computeAnalytics(scopedRecords), [scopedRecords]);

  const hasFilter = selectedLptk.length > 0 || selectedBidang.length > 0;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#17365D]">
              Analisis Status Matrikulasi Peserta
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Kategori status matrikulasi diambil secara dinamis dari database Excel · Menampilkan{' '}
              <strong className="text-[#17365D]">
                {matrikulasiAnalytics.totalPesertaUnik.toLocaleString('id-ID')}
              </strong>{' '}
              peserta unik
            </p>
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSelectedLptk([]);
                setSelectedBidang([]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#17365D] bg-[#F5F7FA] hover:bg-[#EAF3F9] border border-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0066A4]" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <SearchableMultiSelect
            label="Filter LPTK"
            placeholder="Semua LPTK"
            options={lptkOptions}
            selected={selectedLptk}
            onChange={setSelectedLptk}
          />
          <SearchableMultiSelect
            label="Filter Bidang Studi"
            placeholder="Semua Bidang Studi"
            options={bidangStudiOptions}
            selected={selectedBidang}
            onChange={setSelectedBidang}
          />
        </div>
      </div>

      {/* Dynamic Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {matrikulasiAnalytics.byStatusMatrikulasi.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
            Tidak ada data status matrikulasi pada filter yang dipilih.
          </div>
        ) : (
          matrikulasiAnalytics.byStatusMatrikulasi.map((statusItem) => (
            <div
              key={statusItem.name}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 leading-snug">
                  {statusItem.name}
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-[#17365D] tabular-nums">
                  {statusItem.count.toLocaleString('id-ID')}
                </span>
                <span className="text-xs font-mono-tabular font-semibold text-[#0066A4]">
                  {statusItem.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Donut & Gender Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartCard
          className="lg:col-span-6"
          title="Komposisi Status Matrikulasi"
          subtitle="Persentase peserta berdasarkan status aktual dalam Excel"
          isEmpty={matrikulasiAnalytics.byStatusMatrikulasi.length === 0}
          footerNote={
            matrikulasiAnalytics.omittedEmpty.statusMatrikulasi > 0
              ? `${matrikulasiAnalytics.omittedEmpty.statusMatrikulasi.toLocaleString('id-ID')} peserta dengan status kosong tidak ditampilkan.`
              : undefined
          }
        >
          <DonutChartPanel
            data={matrikulasiAnalytics.byStatusMatrikulasi}
            totalCount={matrikulasiAnalytics.totalPesertaUnik}
            centerLabel="Peserta"
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-6"
          title="Status Matrikulasi Berdasarkan Jenis Kelamin"
          subtitle="Perbandingan status matrikulasi antar jenis kelamin"
          isEmpty={matrikulasiAnalytics.matrikulasiByJenisKelamin.length === 0}
        >
          <StackedBarChartPanel
            data={matrikulasiAnalytics.matrikulasiByJenisKelamin}
            seriesKeys={matrikulasiAnalytics.statusCategories}
            layout="vertical"
          />
        </ChartCard>
      </div>

      {/* Stacked by LPTK & Stacked by Bidang Studi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Distribusi Status Matrikulasi Berdasarkan LPTK"
          subtitle="Komposisi status matrikulasi pada masing-masing LPTK"
          isEmpty={matrikulasiAnalytics.matrikulasiByLptk.length === 0}
        >
          <StackedBarChartPanel
            data={matrikulasiAnalytics.matrikulasiByLptk}
            seriesKeys={matrikulasiAnalytics.statusCategories}
            layout="horizontal"
            yAxisWidth={180}
          />
        </ChartCard>

        <ChartCard
          title="Distribusi Status Matrikulasi Berdasarkan Bidang Studi"
          subtitle="Komposisi status matrikulasi pada masing-masing bidang studi"
          isEmpty={matrikulasiAnalytics.matrikulasiByBidangStudi.length === 0}
        >
          <StackedBarChartPanel
            data={matrikulasiAnalytics.matrikulasiByBidangStudi}
            seriesKeys={matrikulasiAnalytics.statusCategories}
            layout="horizontal"
            yAxisWidth={180}
          />
        </ChartCard>
      </div>

      {/* LPTK x Status Matrikulasi Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#17365D] mb-1">
          Matriks Status Matrikulasi per LPTK
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Rekapitulasi jumlah peserta menurut LPTK dan kategori status matrikulasi aktual.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                <th className="py-2.5 px-3 font-semibold w-10">No</th>
                <th className="py-2.5 px-3 font-semibold">LPTK</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Peserta</th>
                {matrikulasiAnalytics.statusCategories.map((st) => (
                  <th key={st} className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                    {st}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrikulasiAnalytics.lptkSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + matrikulasiAnalytics.statusCategories.length}
                    className="py-8 text-center text-slate-500"
                  >
                    Tidak ada data LPTK pada filter aktif.
                  </td>
                </tr>
              ) : (
                matrikulasiAnalytics.lptkSummaries.map((row, idx) => (
                  <tr key={row.lptk} className="hover:bg-[#EAF3F9]/40">
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[#17365D]">{row.lptk}</td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold text-right text-[#17365D]">
                      {row.total.toLocaleString('id-ID')}
                    </td>
                    {matrikulasiAnalytics.statusCategories.map((st) => (
                      <td
                        key={st}
                        className="py-2.5 px-3 font-mono-tabular text-right text-slate-700"
                      >
                        {(row.statusBreakdown[st] ?? 0).toLocaleString('id-ID')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
