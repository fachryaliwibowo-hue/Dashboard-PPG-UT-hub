import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  MapPin,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { ChartCard } from '../components/ChartCard';
import {
  DonutChartPanel,
  HorizontalBarChartPanel,
} from '../components/Charts';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { KpiCard } from '../components/KpiCard';
import { FilterOptionsCatalog } from '../engine/filteringEngine';
import { AggregatedAnalytics, GlobalFilters } from '../types/participant';

interface ExecutiveOverviewPageProps {
  analytics: AggregatedAnalytics;
  filters: GlobalFilters;
  filterOptions: FilterOptionsCatalog;
  totalDatasetUnique: number;
  onUpdateFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  onToggleFilterValue: (
    key: 'lptk' | 'bidangStudi' | 'jenisKelamin' | 'provinsi' | 'kotaKab' | 'statusMatrikulasi',
    value: string
  ) => void;
  onResetFilters: () => void;
}

export const ExecutiveOverviewPage: React.FC<ExecutiveOverviewPageProps> = ({
  analytics,
  filters,
  filterOptions,
  totalDatasetUnique,
  onUpdateFilter,
  onToggleFilterValue,
  onResetFilters,
}) => {
  const [showAllCities, setShowAllCities] = useState(false);
  const [statusChartType, setStatusChartType] = useState<'donut' | 'bar'>('donut');

  const malePct =
    analytics.totalPesertaUnik > 0
      ? ((analytics.pesertaLakiLaki / analytics.totalPesertaUnik) * 100).toFixed(1)
      : '0.0';
  const femalePct =
    analytics.totalPesertaUnik > 0
      ? ((analytics.pesertaPerempuan / analytics.totalPesertaUnik) * 100).toFixed(1)
      : '0.0';

  const displayedCities = showAllCities
    ? analytics.byKotaKab
    : analytics.byKotaKab.slice(0, 10);

  return (
    <div className="space-y-6">
      <GlobalFilterBar
        filters={filters}
        options={filterOptions}
        onUpdateFilter={onUpdateFilter}
        onResetFilters={onResetFilters}
        totalFilteredUnique={analytics.totalPesertaUnik}
        totalFilteredRows={analytics.totalBarisTerfilter}
        totalDatasetUnique={totalDatasetUnique}
      />

      {(analytics.rowsWithoutPtkInFilter > 0 || analytics.duplicateRowsInFilter > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="tabular-nums">
              Total baris terfilter:{' '}
              <strong>{analytics.totalBarisTerfilter.toLocaleString('id-ID')}</strong> · PTK ID
              unik valid: <strong>{analytics.totalPesertaUnik.toLocaleString('id-ID')}</strong>
              {analytics.duplicateRowsInFilter > 0 &&
                ` · Baris duplikat PTK ID: ${analytics.duplicateRowsInFilter.toLocaleString('id-ID')}`}
              {analytics.rowsWithoutPtkInFilter > 0 &&
                ` · Baris PTK ID kosong: ${analytics.rowsWithoutPtkInFilter.toLocaleString('id-ID')}`}
            </span>
          </div>
          <span className="text-[11px] text-amber-800">
            Seluruh grafik dihitung berdasarkan PTK ID unik yang valid.
          </span>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Peserta"
          value={analytics.totalPesertaUnik}
          subtitle={`${analytics.totalBarisTerfilter.toLocaleString('id-ID')} total baris data`}
          icon={Users}
          accent="navy"
        />
        <KpiCard
          title="Total LPTK"
          value={analytics.totalLptk}
          subtitle="Institusi penyelenggara unik"
          icon={Building2}
          accent="blue"
        />
        <KpiCard
          title="Total Bidang Studi"
          value={analytics.totalBidangStudi}
          subtitle="Program studi PPG unik"
          icon={BookOpen}
          accent="orange"
        />
        <KpiCard
          title="Total Provinsi"
          value={analytics.totalProvinsi}
          subtitle={`${analytics.totalKotaKab.toLocaleString('id-ID')} kota/kabupaten`}
          icon={MapPin}
          accent="green"
        />
        <KpiCard
          title="Peserta Laki-Laki"
          value={analytics.pesertaLakiLaki}
          subtitle={`${malePct}% dari total peserta`}
          icon={UserCheck}
          accent="blue"
        />
        <KpiCard
          title="Peserta Perempuan"
          value={analytics.pesertaPerempuan}
          subtitle={`${femalePct}% dari total peserta`}
          icon={UserRound}
          accent="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CHART 1: LPTK */}
        <ChartCard
          className="lg:col-span-7"
          title="Distribusi Peserta Berdasarkan LPTK"
          subtitle="Klik batang grafik untuk memfilter dashboard berdasarkan LPTK"
          isEmpty={analytics.byLptk.length === 0}
          footerNote={
            analytics.omittedEmpty.lptk > 0
              ? `${analytics.omittedEmpty.lptk.toLocaleString('id-ID')} peserta dengan kolom LPTK kosong tidak ditampilkan sebagai kategori.`
              : `Menampilkan ${analytics.byLptk.length.toLocaleString('id-ID')} LPTK terurut dari peserta terbanyak.`
          }
        >
          <HorizontalBarChartPanel
            data={analytics.byLptk}
            activeValues={filters.lptk}
            onItemClick={(name) => onToggleFilterValue('lptk', name)}
            barColor="#0066A4"
            yAxisWidth={185}
          />
        </ChartCard>

        {/* CHART 3: Jenis Kelamin */}
        <ChartCard
          className="lg:col-span-5"
          title="Komposisi Jenis Kelamin"
          subtitle="Klik segmen atau legenda untuk memfilter jenis kelamin"
          isEmpty={analytics.byJenisKelamin.length === 0}
          footerNote={
            analytics.omittedEmpty.jenisKelamin > 0
              ? `${analytics.omittedEmpty.jenisKelamin.toLocaleString('id-ID')} peserta dengan kolom jenis kelamin kosong tidak disertakan.`
              : undefined
          }
        >
          <DonutChartPanel
            data={analytics.byJenisKelamin}
            activeValues={filters.jenisKelamin}
            onItemClick={(name) => onToggleFilterValue('jenisKelamin', name)}
            totalCount={analytics.totalPesertaUnik}
            centerLabel="Peserta Unik"
          />
        </ChartCard>

        {/* CHART 2: Bidang Studi */}
        <ChartCard
          className="lg:col-span-6"
          title="Distribusi Peserta Berdasarkan Bidang Studi"
          subtitle="Komposisi bidang studi PPG · Klik legenda atau segmen untuk filter"
          isEmpty={analytics.byBidangStudi.length === 0}
          footerNote={
            analytics.omittedEmpty.bidangStudi > 0
              ? `${analytics.omittedEmpty.bidangStudi.toLocaleString('id-ID')} peserta dengan kolom bidang studi kosong tidak disertakan.`
              : `Total ${analytics.byBidangStudi.length.toLocaleString('id-ID')} bidang studi aktif.`
          }
        >
          <DonutChartPanel
            data={analytics.byBidangStudi}
            activeValues={filters.bidangStudi}
            onItemClick={(name) => onToggleFilterValue('bidangStudi', name)}
            totalCount={analytics.totalPesertaUnik}
            centerLabel="Bidang Studi"
          />
        </ChartCard>

        {/* CHART 4: Status Matrikulasi */}
        <ChartCard
          className="lg:col-span-6"
          title="Distribusi Status Matrikulasi"
          subtitle="Kategori status diambil langsung dari data Excel · Klik untuk filter"
          isEmpty={analytics.byStatusMatrikulasi.length === 0}
          action={
            <div className="inline-flex items-center p-0.5 bg-[#F5F7FA] border border-slate-200 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setStatusChartType('donut')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusChartType === 'donut'
                    ? 'bg-white text-[#17365D] shadow-xs'
                    : 'text-slate-600 hover:text-[#17365D]'
                }`}
              >
                Donut
              </button>
              <button
                type="button"
                onClick={() => setStatusChartType('bar')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusChartType === 'bar'
                    ? 'bg-white text-[#17365D] shadow-xs'
                    : 'text-slate-600 hover:text-[#17365D]'
                }`}
              >
                Batang
              </button>
            </div>
          }
          footerNote={
            analytics.omittedEmpty.statusMatrikulasi > 0
              ? `${analytics.omittedEmpty.statusMatrikulasi.toLocaleString('id-ID')} peserta dengan status matrikulasi kosong tidak disertakan.`
              : `Ditemukan ${analytics.byStatusMatrikulasi.length.toLocaleString('id-ID')} kategori status matrikulasi.`
          }
        >
          {statusChartType === 'donut' ? (
            <DonutChartPanel
              data={analytics.byStatusMatrikulasi}
              activeValues={filters.statusMatrikulasi}
              onItemClick={(name) => onToggleFilterValue('statusMatrikulasi', name)}
              totalCount={analytics.totalPesertaUnik}
              centerLabel="Status"
            />
          ) : (
            <HorizontalBarChartPanel
              data={analytics.byStatusMatrikulasi}
              activeValues={filters.statusMatrikulasi}
              onItemClick={(name) => onToggleFilterValue('statusMatrikulasi', name)}
              barColor="#27AE60"
              yAxisWidth={165}
            />
          )}
        </ChartCard>

        {/* CHART 5: Persebaran Provinsi */}
        <ChartCard
          className="lg:col-span-6"
          title="Persebaran Peserta Berdasarkan Provinsi"
          subtitle="Urutan provinsi dengan jumlah peserta terbanyak · Klik batang untuk filter"
          isEmpty={analytics.byProvinsi.length === 0}
          footerNote={
            analytics.omittedEmpty.provinsi > 0
              ? `${analytics.omittedEmpty.provinsi.toLocaleString('id-ID')} peserta dengan provinsi kosong tidak disertakan.`
              : `Total ${analytics.byProvinsi.length.toLocaleString('id-ID')} provinsi terdata.`
          }
        >
          <HorizontalBarChartPanel
            data={analytics.byProvinsi}
            activeValues={filters.provinsi}
            onItemClick={(name) => onToggleFilterValue('provinsi', name)}
            barColor="#17365D"
            yAxisWidth={165}
          />
        </ChartCard>

        {/* CHART 6: Top 10 Kota/Kabupaten */}
        <ChartCard
          className="lg:col-span-6"
          title={
            showAllCities
              ? `Seluruh Kota/Kabupaten Domisili (${analytics.byKotaKab.length.toLocaleString('id-ID')})`
              : 'Top 10 Kota/Kabupaten Domisili'
          }
          subtitle="Urutan menurun berdasarkan jumlah peserta · Klik batang untuk filter"
          isEmpty={analytics.byKotaKab.length === 0}
          action={
            analytics.byKotaKab.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllCities((prev) => !prev)}
                className="px-3 py-1.5 text-[11px] font-medium text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors whitespace-nowrap"
              >
                {showAllCities
                  ? 'Tampilkan Top 10'
                  : `Lihat Semua (${analytics.byKotaKab.length.toLocaleString('id-ID')})`}
              </button>
            ) : undefined
          }
          footerNote={
            analytics.omittedEmpty.kotaKab > 0
              ? `${analytics.omittedEmpty.kotaKab.toLocaleString('id-ID')} peserta dengan kota/kabupaten kosong tidak disertakan.`
              : `Menampilkan ${displayedCities.length.toLocaleString('id-ID')} dari ${analytics.byKotaKab.length.toLocaleString('id-ID')} kota/kabupaten.`
          }
        >
          <HorizontalBarChartPanel
            data={displayedCities}
            activeValues={filters.kotaKab}
            onItemClick={(name) => onToggleFilterValue('kotaKab', name)}
            barColor="#2E86C1"
            yAxisWidth={175}
            maxHeightClass={showAllCities ? 'max-h-[460px]' : 'max-h-[380px]'}
          />
        </ChartCard>
      </div>
    </div>
  );
};
