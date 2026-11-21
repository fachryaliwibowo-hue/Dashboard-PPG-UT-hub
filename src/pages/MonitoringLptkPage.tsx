import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  Download,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import { DonutChartPanel, HorizontalBarChartPanel } from '../components/Charts';
import { KpiCard } from '../components/KpiCard';
import { SearchableMultiSelect } from '../components/SearchableMultiSelect';
import { computeAnalytics } from '../engine/analyticsEngine';
import { exportBidangStudiSummaryToExcel } from '../engine/exportEngine';
import { FilterOption } from '../engine/filteringEngine';
import { ParticipantRecord } from '../types/participant';

interface MonitoringLptkPageProps {
  allRecords: ParticipantRecord[];
  lptkOptions: FilterOption[];
  selectedLptk: string;
  onSelectLptk: (lptk: string) => void;
}

export const MonitoringLptkPage: React.FC<MonitoringLptkPageProps> = ({
  allRecords,
  lptkOptions,
  selectedLptk,
  onSelectLptk,
}) => {
  const [showAllCities, setShowAllCities] = useState(false);

  const scopedRecords = useMemo(() => {
    if (!selectedLptk) return allRecords;
    return allRecords.filter((r) => r.normLptk === selectedLptk);
  }, [allRecords, selectedLptk]);

  const lptkAnalytics = useMemo(() => computeAnalytics(scopedRecords), [scopedRecords]);

  const lptkTitle = selectedLptk || 'Semua LPTK (Agregasi Seluruh Institusi)';
  const displayedCities = showAllCities
    ? lptkAnalytics.byKotaKab
    : lptkAnalytics.byKotaKab.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* LPTK Selector Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#0066A4]">
            Monitoring Dinamis LPTK Penyelenggara
          </div>
          <h2 className="text-xl font-bold text-[#17365D] mt-0.5 truncate" title={lptkTitle}>
            {lptkTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {selectedLptk
              ? `Menampilkan data khusus untuk ${selectedLptk}`
              : `Menampilkan agregasi dari ${lptkOptions.length.toLocaleString('id-ID')} LPTK aktif dalam database`}
          </p>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <SearchableMultiSelect
            label="Pilih LPTK"
            placeholder="Semua LPTK"
            allLabel="Semua LPTK"
            singleSelect
            options={lptkOptions}
            selected={selectedLptk ? [selectedLptk] : []}
            onChange={(next) => onSelectLptk(next[0] ?? '')}
          />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Peserta LPTK"
          value={lptkAnalytics.totalPesertaUnik}
          subtitle={`${lptkAnalytics.totalBarisTerfilter.toLocaleString('id-ID')} baris terdata`}
          icon={Users}
          accent="navy"
        />
        <KpiCard
          title="Peserta Laki-Laki"
          value={lptkAnalytics.pesertaLakiLaki}
          subtitle={
            lptkAnalytics.totalPesertaUnik > 0
              ? `${((lptkAnalytics.pesertaLakiLaki / lptkAnalytics.totalPesertaUnik) * 100).toFixed(1)}% dari peserta`
              : '0.0%'
          }
          icon={UserCheck}
          accent="blue"
        />
        <KpiCard
          title="Peserta Perempuan"
          value={lptkAnalytics.pesertaPerempuan}
          subtitle={
            lptkAnalytics.totalPesertaUnik > 0
              ? `${((lptkAnalytics.pesertaPerempuan / lptkAnalytics.totalPesertaUnik) * 100).toFixed(1)}% dari peserta`
              : '0.0%'
          }
          icon={UserRound}
          accent="orange"
        />
        <KpiCard
          title="Jumlah Bidang Studi"
          value={lptkAnalytics.totalBidangStudi}
          subtitle={`Tersebar di ${lptkAnalytics.totalProvinsi.toLocaleString('id-ID')} provinsi`}
          icon={BookOpen}
          accent="green"
        />
      </div>

      {/* Status Matrikulasi Breakdown Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-[#0066A4]" />
          <h3 className="text-sm font-semibold text-[#17365D]">
            Ringkasan Peserta Berdasarkan Status Matrikulasi
          </h3>
        </div>
        {lptkAnalytics.byStatusMatrikulasi.length === 0 ? (
          <p className="text-xs text-slate-500">Tidak ada data status matrikulasi.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lptkAnalytics.byStatusMatrikulasi.map((st) => (
              <div
                key={st.name}
                className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-600 truncate" title={st.name}>
                    {st.name}
                  </div>
                  <div className="text-lg font-bold text-[#17365D] tabular-nums mt-0.5">
                    {st.count.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-xs font-mono-tabular font-semibold text-[#0066A4] shrink-0">
                  {st.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3 Core Donuts: Jenis Kelamin, Bidang Studi, Status Matrikulasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Komposisi Jenis Kelamin"
          subtitle={selectedLptk || 'Seluruh LPTK'}
          isEmpty={lptkAnalytics.byJenisKelamin.length === 0}
        >
          <DonutChartPanel
            data={lptkAnalytics.byJenisKelamin}
            totalCount={lptkAnalytics.totalPesertaUnik}
            centerLabel="Peserta"
          />
        </ChartCard>

        <ChartCard
          title="Distribusi Bidang Studi"
          subtitle={`${lptkAnalytics.totalBidangStudi.toLocaleString('id-ID')} bidang studi`}
          isEmpty={lptkAnalytics.byBidangStudi.length === 0}
        >
          <DonutChartPanel
            data={lptkAnalytics.byBidangStudi}
            totalCount={lptkAnalytics.totalPesertaUnik}
            centerLabel="Bidang Studi"
          />
        </ChartCard>

        <ChartCard
          title="Distribusi Status Matrikulasi"
          subtitle="Kategori aktual dari database Excel"
          isEmpty={lptkAnalytics.byStatusMatrikulasi.length === 0}
        >
          <DonutChartPanel
            data={lptkAnalytics.byStatusMatrikulasi}
            totalCount={lptkAnalytics.totalPesertaUnik}
            centerLabel="Status"
          />
        </ChartCard>
      </div>

      {/* Geographic Distribution for Selected LPTK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Distribusi Peserta Berdasarkan Provinsi Domisili"
          subtitle={`Asal provinsi peserta pada ${selectedLptk || 'seluruh LPTK'}`}
          isEmpty={lptkAnalytics.byProvinsi.length === 0}
        >
          <HorizontalBarChartPanel
            data={lptkAnalytics.byProvinsi}
            barColor="#17365D"
            yAxisWidth={165}
          />
        </ChartCard>

        <ChartCard
          title="Distribusi Peserta Berdasarkan Kota/Kabupaten"
          subtitle={
            showAllCities
              ? `Seluruh ${lptkAnalytics.byKotaKab.length.toLocaleString('id-ID')} kota/kabupaten`
              : 'Top 12 kota/kabupaten domisili'
          }
          isEmpty={lptkAnalytics.byKotaKab.length === 0}
          action={
            lptkAnalytics.byKotaKab.length > 12 ? (
              <button
                type="button"
                onClick={() => setShowAllCities((p) => !p)}
                className="px-3 py-1.5 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors"
              >
                {showAllCities ? 'Tampilkan Top 12' : 'Lihat Semua'}
              </button>
            ) : undefined
          }
        >
          <HorizontalBarChartPanel
            data={displayedCities}
            barColor="#0066A4"
            yAxisWidth={170}
          />
        </ChartCard>
      </div>

      {/* Summary Table per Bidang Studi within LPTK */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0066A4]" />
            <div>
              <h3 className="text-sm font-semibold text-[#17365D]">
                Tabel Ringkasan Peserta per Bidang Studi ({selectedLptk || 'Semua LPTK'})
              </h3>
              <p className="text-xs text-slate-500">
                Rincian jumlah peserta, komposisi gender, dan status matrikulasi setiap bidang studi
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={lptkAnalytics.bidangStudiDetails.length === 0}
            onClick={() => exportBidangStudiSummaryToExcel(lptkAnalytics)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Tabel (.xlsx)</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[#17365D]">
                <th className="py-2.5 px-3 font-semibold w-10">No</th>
                <th className="py-2.5 px-3 font-semibold">Bidang Studi</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Peserta</th>
                <th className="py-2.5 px-3 font-semibold text-right">Persentase</th>
                <th className="py-2.5 px-3 font-semibold text-right">Laki-Laki</th>
                <th className="py-2.5 px-3 font-semibold text-right">Perempuan</th>
                {lptkAnalytics.statusCategories.map((status) => (
                  <th key={status} className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                    {status}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lptkAnalytics.bidangStudiDetails.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + lptkAnalytics.statusCategories.length}
                    className="py-8 text-center text-slate-500"
                  >
                    Tidak ada data bidang studi untuk pilihan LPTK ini.
                  </td>
                </tr>
              ) : (
                lptkAnalytics.bidangStudiDetails.map((row, idx) => (
                  <tr key={row.bidangStudi} className="hover:bg-[#EAF3F9]/40">
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[#17365D]">{row.bidangStudi}</td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold text-right text-[#17365D]">
                      {row.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-right text-[#0066A4]">
                      {row.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-right text-slate-700">
                      {row.maleCount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-right text-slate-700">
                      {row.femaleCount.toLocaleString('id-ID')}
                    </td>
                    {lptkAnalytics.statusCategories.map((status) => (
                      <td
                        key={status}
                        className="py-2.5 px-3 font-mono-tabular text-right text-slate-700"
                      >
                        {(row.statusBreakdown[status] ?? 0).toLocaleString('id-ID')}
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
