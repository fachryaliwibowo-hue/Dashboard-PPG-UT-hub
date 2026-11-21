import React, { useMemo, useState } from 'react';
import { Globe2, MapPin, Navigation, Users } from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import {
  HorizontalBarChartPanel,
  StackedBarChartPanel,
} from '../components/Charts';
import { KpiCard } from '../components/KpiCard';
import { IndonesiaProvinceMap } from '../components/IndonesiaProvinceMap';
import { SearchableMultiSelect } from '../components/SearchableMultiSelect';
import { computeAnalytics } from '../engine/analyticsEngine';
import { FilterOption } from '../engine/filteringEngine';
import { ParticipantRecord, StackedSeriesRow } from '../types/participant';

interface AnalisisDemografiPageProps {
  allRecords: ParticipantRecord[];
  lptkOptions: FilterOption[];
  selectedLptk: string;
  onSelectLptk: (lptk: string) => void;
}

export const AnalisisDemografiPage: React.FC<AnalisisDemografiPageProps> = ({
  allRecords,
  lptkOptions,
  selectedLptk,
  onSelectLptk,
}) => {
  const [showAllProvinces, setShowAllProvinces] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const scopedRecords = useMemo(() => {
    if (!selectedLptk) return allRecords;
    return allRecords.filter((r) => r.normLptk === selectedLptk);
  }, [allRecords, selectedLptk]);

  const demoAnalytics = useMemo(() => computeAnalytics(scopedRecords), [scopedRecords]);

  const topProvince = demoAnalytics.byProvinsi[0];
  const topCity = demoAnalytics.byKotaKab[0];

  const genderByProvinceData: StackedSeriesRow[] = useMemo(() => {
    return demoAnalytics.provinceDetails.slice(0, 15).map((p) => ({
      category: p.provinsi,
      total: p.total,
      'Laki-Laki': p.maleCount,
      Perempuan: p.femaleCount,
      ...(p.otherGenderCount > 0 ? { 'Lainnya/Kosong': p.otherGenderCount } : {}),
    }));
  }, [demoAnalytics.provinceDetails]);

  const hasOtherGender = demoAnalytics.provinceDetails
    .slice(0, 15)
    .some((p) => p.otherGenderCount > 0);

  const genderSeriesKeys = hasOtherGender
    ? ['Laki-Laki', 'Perempuan', 'Lainnya/Kosong']
    : ['Laki-Laki', 'Perempuan'];

  // Stacked Bidang Studi per Top 12 Provinsi (top 5 bidang studi + Lainnya if >5)
  const { bidangByProvinceData, bidangSeriesKeys } = useMemo(() => {
    const topBidang = demoAnalytics.byBidangStudi.slice(0, 5).map((b) => b.name);
    const hasMoreBidang = demoAnalytics.byBidangStudi.length > 5;
    const keys = hasMoreBidang ? [...topBidang, 'Bidang Studi Lainnya'] : topBidang;

    const rows: StackedSeriesRow[] = demoAnalytics.provinceDetails.slice(0, 12).map((p) => {
      const row: StackedSeriesRow = {
        category: p.provinsi,
        total: p.total,
      };
      for (const k of keys) row[k] = 0;

      for (const [bName, bCount] of Object.entries(p.bidangStudiBreakdown)) {
        if (topBidang.includes(bName)) {
          row[bName] = (Number(row[bName]) || 0) + bCount;
        } else if (hasMoreBidang) {
          row['Bidang Studi Lainnya'] = (Number(row['Bidang Studi Lainnya']) || 0) + bCount;
        }
      }
      return row;
    });

    return { bidangByProvinceData: rows, bidangSeriesKeys: keys };
  }, [demoAnalytics]);

  return (
    <div className="space-y-6">
      {/* Scope Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#17365D]">
            Analisis Demografi & Persebaran Wilayah Domisili
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribusi geografis provinsi, kota/kabupaten, komposisi gender, dan bidang studi berdasarkan data aktual Excel.
          </p>
        </div>

        <div className="w-full sm:w-72 shrink-0">
          <SearchableMultiSelect
            label="Filter LPTK"
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
          title="Total Provinsi Domisili"
          value={demoAnalytics.totalProvinsi}
          subtitle={`${demoAnalytics.totalPesertaUnik.toLocaleString('id-ID')} peserta unik`}
          icon={Globe2}
          accent="navy"
        />
        <KpiCard
          title="Total Kota/Kabupaten"
          value={demoAnalytics.totalKotaKab}
          subtitle="Wilayah tingkat II unik"
          icon={MapPin}
          accent="blue"
        />
        <KpiCard
          title="Provinsi Terbanyak"
          value={topProvince ? topProvince.count : 0}
          subtitle={
            topProvince
              ? `${topProvince.name} (${topProvince.percentage.toFixed(1)}%)`
              : 'Belum ada data'
          }
          icon={Navigation}
          accent="green"
        />
        <KpiCard
          title="Kota/Kab Terbanyak"
          value={topCity ? topCity.count : 0}
          subtitle={
            topCity ? `${topCity.name} (${topCity.percentage.toFixed(1)}%)` : 'Belum ada data'
          }
          icon={Users}
          accent="orange"
        />
      </div>

      {/* Interactive Indonesia Choropleth Map */}
      <IndonesiaProvinceMap
        provinceDetails={demoAnalytics.provinceDetails}
        totalUniqueParticipants={demoAnalytics.totalPesertaUnik}
      />

      {/* Top 10 & Full Provinsi + Kota/Kab */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title={
            showAllProvinces
              ? `Seluruh Provinsi (${demoAnalytics.byProvinsi.length.toLocaleString('id-ID')})`
              : 'Top 10 Provinsi dengan Peserta Terbanyak'
          }
          subtitle="Persebaran peserta per provinsi berdasarkan data aktual"
          isEmpty={demoAnalytics.byProvinsi.length === 0}
          action={
            demoAnalytics.byProvinsi.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllProvinces((p) => !p)}
                className="px-3 py-1.5 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors"
              >
                {showAllProvinces ? 'Top 10 Provinsi' : 'Lihat Semua Provinsi'}
              </button>
            ) : undefined
          }
        >
          <HorizontalBarChartPanel
            data={showAllProvinces ? demoAnalytics.byProvinsi : demoAnalytics.byProvinsi.slice(0, 10)}
            barColor="#17365D"
            yAxisWidth={165}
          />
        </ChartCard>

        <ChartCard
          title={
            showAllCities
              ? `Seluruh Kota/Kabupaten (${demoAnalytics.byKotaKab.length.toLocaleString('id-ID')})`
              : 'Top 10 Kota/Kabupaten dengan Peserta Terbanyak'
          }
          subtitle="Persebaran peserta per kota/kabupaten domisili"
          isEmpty={demoAnalytics.byKotaKab.length === 0}
          action={
            demoAnalytics.byKotaKab.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllCities((p) => !p)}
                className="px-3 py-1.5 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors"
              >
                {showAllCities ? 'Top 10 Kota/Kab' : 'Lihat Semua Kota/Kab'}
              </button>
            ) : undefined
          }
        >
          <HorizontalBarChartPanel
            data={showAllCities ? demoAnalytics.byKotaKab : demoAnalytics.byKotaKab.slice(0, 10)}
            barColor="#0066A4"
            yAxisWidth={175}
          />
        </ChartCard>
      </div>

      {/* Stacked Gender by Province & Bidang Studi by Province */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Komposisi Jenis Kelamin Berdasarkan Provinsi (Top 15)"
          subtitle="Perbandingan peserta laki-laki dan perempuan di tiap provinsi"
          isEmpty={genderByProvinceData.length === 0}
        >
          <StackedBarChartPanel
            data={genderByProvinceData}
            seriesKeys={genderSeriesKeys}
            layout="horizontal"
            yAxisWidth={160}
            seriesColors={{
              'Laki-Laki': '#0066A4',
              Perempuan: '#F39C35',
              'Lainnya/Kosong': '#94A3B8',
            }}
          />
        </ChartCard>

        <ChartCard
          title="Persebaran Bidang Studi Berdasarkan Provinsi (Top 12)"
          subtitle="Komposisi 5 bidang studi terbanyak di setiap provinsi"
          isEmpty={bidangByProvinceData.length === 0}
        >
          <StackedBarChartPanel
            data={bidangByProvinceData}
            seriesKeys={bidangSeriesKeys}
            layout="horizontal"
            yAxisWidth={160}
          />
        </ChartCard>
      </div>

      {/* Regional Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#17365D] mb-1">
          Tabel Ringkasan Demografi per Provinsi
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Menampilkan total peserta, persentase, sebaran jenis kelamin, dan bidang studi dominan pada setiap provinsi.
        </p>

        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#F5F7FA] z-10">
              <tr className="border-b border-slate-200 text-[#17365D]">
                <th className="py-2.5 px-3 font-semibold w-10">No</th>
                <th className="py-2.5 px-3 font-semibold">Provinsi Domisili</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Peserta</th>
                <th className="py-2.5 px-3 font-semibold text-right">Persentase</th>
                <th className="py-2.5 px-3 font-semibold text-right">Laki-Laki</th>
                <th className="py-2.5 px-3 font-semibold text-right">Perempuan</th>
                <th className="py-2.5 px-3 font-semibold">Bidang Studi Dominan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoAnalytics.provinceDetails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data provinsi pada cakupan filter ini.
                  </td>
                </tr>
              ) : (
                demoAnalytics.provinceDetails.map((row, idx) => (
                  <tr key={row.provinsi} className="hover:bg-[#EAF3F9]/40">
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-[#17365D]">{row.provinsi}</td>
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
                    <td className="py-2.5 px-3 text-slate-700">
                      {row.topBidangStudi} (
                      <span className="font-mono-tabular">
                        {row.topBidangStudiCount.toLocaleString('id-ID')}
                      </span>
                      )
                    </td>
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
