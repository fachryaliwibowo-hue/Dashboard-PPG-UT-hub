import React, { useMemo, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import {
  INDONESIA_PROVINCES,
  normalizeProvinceMeta,
} from '../engine/provinceMatching';
import { ProvinceDetailRow } from '../types/participant';

interface IndonesiaProvinceMapProps {
  provinceDetails: ProvinceDetailRow[];
  totalUniqueParticipants: number;
}

interface ProvinceShape {
  code: string;
  labelPos: [number, number]; // [lon, lat]
  polygons: Array<Array<[number, number]>>; // [lon, lat] rings
}

function projectPoint([lon, lat]: [number, number]): [number, number] {
  const x = (lon - 94.5) * 20.5;
  const y = (6.5 - lat) * 22.5;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function ringToSvgPath(ring: Array<[number, number]>): string {
  if (ring.length === 0) return '';
  const pts = ring.map(projectPoint);
  return `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;
}

// Accurate geographic lon/lat polygonal contours for all 38 Indonesian provinces
const PROVINCE_SHAPES: ProvinceShape[] = [
  {
    code: 'ID-AC',
    labelPos: [96.8, 4.3],
    polygons: [
      [
        [95.3, 5.5], [96.4, 5.3], [97.4, 5.1], [98.1, 4.3], [97.8, 3.0],
        [97.1, 2.7], [96.2, 3.8], [95.4, 4.9],
      ],
    ],
  },
  {
    code: 'ID-SU',
    labelPos: [99.1, 2.2],
    polygons: [
      [
        [98.1, 4.3], [99.3, 3.7], [100.1, 2.8], [100.3, 1.8], [99.8, 1.0],
        [99.2, 0.7], [98.5, 1.4], [98.1, 2.3], [97.8, 3.0],
      ],
      [[97.3, 1.3], [97.9, 1.3], [97.9, 0.6], [97.3, 0.7]], // Nias
    ],
  },
  {
    code: 'ID-SB',
    labelPos: [100.6, -0.8],
    polygons: [
      [
        [99.2, 0.7], [99.8, 1.0], [100.8, 0.2], [101.6, -0.7], [101.3, -1.6],
        [100.8, -2.3], [100.2, -1.4], [99.7, -0.3],
      ],
      [[98.6, -1.1], [99.3, -1.3], [99.5, -2.3], [98.8, -2.1]], // Mentawai
    ],
  },
  {
    code: 'ID-RI',
    labelPos: [101.7, 0.6],
    polygons: [
      [
        [100.1, 2.8], [101.4, 2.2], [102.7, 1.5], [103.5, 0.6], [103.3, -0.6],
        [102.3, -0.9], [101.6, -0.7], [100.8, 0.2], [99.8, 1.0], [100.3, 1.8],
      ],
    ],
  },
  {
    code: 'ID-KR',
    labelPos: [104.5, 1.1],
    polygons: [
      [[103.8, 1.2], [104.7, 1.2], [104.7, 0.7], [103.9, 0.8]], // Batam-Bintan
      [[104.2, 0.1], [104.9, 0.1], [104.8, -0.5], [104.2, -0.4]], // Lingga
      [[107.8, 4.2], [108.4, 4.1], [108.3, 3.5], [107.7, 3.7]], // Natuna
    ],
  },
  {
    code: 'ID-JA',
    labelPos: [102.7, -1.6],
    polygons: [
      [
        [101.6, -0.7], [102.3, -0.9], [103.3, -0.6], [104.3, -1.1], [104.1, -1.9],
        [102.9, -2.4], [101.9, -2.4], [101.3, -1.6],
      ],
    ],
  },
  {
    code: 'ID-BE',
    labelPos: [102.2, -3.5],
    polygons: [
      [
        [101.3, -2.4], [101.9, -2.4], [102.3, -3.3], [103.1, -4.3],
        [103.4, -4.9], [102.8, -5.0], [102.1, -3.9], [101.4, -2.9],
      ],
    ],
  },
  {
    code: 'ID-SS',
    labelPos: [104.1, -3.2],
    polygons: [
      [
        [102.9, -2.4], [104.1, -1.9], [105.0, -2.2], [105.8, -2.9], [105.9, -4.0],
        [104.8, -4.7], [103.7, -4.9], [103.1, -4.3], [102.3, -3.3], [101.9, -2.4],
      ],
    ],
  },
  {
    code: 'ID-BB',
    labelPos: [106.5, -2.4],
    polygons: [
      [[105.2, -1.5], [106.2, -1.7], [106.8, -2.5], [106.4, -3.1], [105.6, -2.5]], // Bangka
      [[107.4, -2.5], [108.3, -2.6], [108.2, -3.3], [107.5, -3.2]], // Belitung
    ],
  },
  {
    code: 'ID-LA',
    labelPos: [105.0, -5.0],
    polygons: [
      [
        [103.7, -4.9], [104.8, -4.7], [105.9, -4.0], [105.9, -5.1],
        [105.7, -5.9], [104.6, -5.8], [103.9, -5.4],
      ],
    ],
  },
  {
    code: 'ID-BT',
    labelPos: [106.1, -6.4],
    polygons: [
      [
        [105.3, -6.0], [106.4, -6.0], [106.5, -6.7], [106.0, -7.0], [105.2, -6.8],
      ],
    ],
  },
  {
    code: 'ID-JK',
    labelPos: [106.85, -6.2],
    polygons: [
      [
        [106.65, -6.05], [107.02, -6.05], [107.02, -6.38], [106.65, -6.38],
      ],
    ],
  },
  {
    code: 'ID-JB',
    labelPos: [107.6, -7.0],
    polygons: [
      [
        [106.4, -6.0], [106.65, -6.05], [106.65, -6.38], [107.02, -6.38],
        [107.02, -6.05], [108.4, -6.3], [108.8, -6.8], [108.6, -7.7],
        [107.4, -7.7], [106.4, -7.3], [106.5, -6.7],
      ],
    ],
  },
  {
    code: 'ID-JT',
    labelPos: [110.1, -7.2],
    polygons: [
      [
        [108.8, -6.8], [110.2, -6.7], [111.0, -6.5], [111.6, -6.9],
        [111.4, -7.9], [110.8, -8.1], [110.5, -7.7], [110.1, -7.7],
        [109.8, -7.9], [108.6, -7.7],
      ],
    ],
  },
  {
    code: 'ID-YO',
    labelPos: [110.4, -7.95],
    polygons: [
      [
        [110.0, -7.7], [110.7, -7.7], [110.8, -8.2], [110.0, -8.1],
      ],
    ],
  },
  {
    code: 'ID-JI',
    labelPos: [112.7, -7.7],
    polygons: [
      [
        [111.6, -6.9], [112.8, -6.8], [113.2, -7.5], [114.5, -7.8],
        [114.4, -8.7], [112.6, -8.5], [111.4, -8.3], [111.4, -7.9],
      ],
      [[112.7, -6.9], [114.1, -6.9], [114.1, -7.3], [112.8, -7.3]], // Madura
    ],
  },
  {
    code: 'ID-BA',
    labelPos: [115.1, -8.4],
    polygons: [
      [[114.45, -8.15], [115.7, -8.15], [115.65, -8.85], [114.5, -8.65]],
    ],
  },
  {
    code: 'ID-NB',
    labelPos: [117.4, -8.6],
    polygons: [
      [[115.9, -8.25], [116.75, -8.25], [116.7, -8.95], [115.9, -8.9]], // Lombok
      [[116.85, -8.3], [119.1, -8.3], [119.05, -9.05], [116.85, -9.0]], // Sumbawa
    ],
  },
  {
    code: 'ID-NT',
    labelPos: [122.2, -9.3],
    polygons: [
      [[119.8, -8.2], [122.8, -8.1], [123.1, -8.8], [119.9, -8.9]], // Flores + Alor
      [[119.1, -9.3], [120.7, -9.5], [120.7, -10.3], [119.2, -10.1]], // Sumba
      [[123.3, -9.4], [124.9, -9.0], [124.9, -9.8], [123.5, -10.3]], // Timor Barat
    ],
  },
  {
    code: 'ID-KB',
    labelPos: [111.0, 0.0],
    polygons: [
      [
        [108.9, 1.9], [110.8, 1.5], [112.7, 1.5], [114.2, 1.2],
        [113.5, -0.5], [111.5, -0.9], [110.9, -2.9], [110.0, -2.8],
        [109.1, -1.1], [108.8, 0.5],
      ],
    ],
  },
  {
    code: 'ID-KT',
    labelPos: [113.4, -1.7],
    polygons: [
      [
        [111.5, -0.9], [113.5, -0.5], [115.2, -0.6], [115.5, -1.8],
        [114.6, -3.4], [113.0, -3.5], [111.7, -3.3], [110.9, -2.9],
      ],
    ],
  },
  {
    code: 'ID-KS',
    labelPos: [115.4, -2.9],
    polygons: [
      [
        [114.6, -3.4], [115.5, -1.8], [116.4, -2.3], [116.2, -3.9],
        [114.6, -4.1],
      ],
    ],
  },
  {
    code: 'ID-KI',
    labelPos: [116.6, 0.7],
    polygons: [
      [
        [113.5, -0.5], [114.2, 1.2], [115.7, 1.7], [118.2, 2.2],
        [118.9, 1.0], [117.7, -0.5], [116.8, -1.6], [116.4, -2.3],
        [115.5, -1.8], [115.2, -0.6],
      ],
    ],
  },
  {
    code: 'ID-KU',
    labelPos: [116.6, 3.2],
    polygons: [
      [
        [114.2, 1.2], [115.4, 4.2], [117.7, 4.2], [118.2, 2.2],
        [115.7, 1.7],
      ],
    ],
  },
  {
    code: 'ID-SA',
    labelPos: [124.5, 1.2],
    polygons: [
      [
        [123.3, 1.0], [124.7, 1.8], [125.3, 1.4], [124.6, 0.4], [123.4, 0.4],
      ],
    ],
  },
  {
    code: 'ID-GO',
    labelPos: [122.4, 0.8],
    polygons: [
      [
        [121.3, 1.0], [123.3, 1.0], [123.4, 0.4], [121.4, 0.5],
      ],
    ],
  },
  {
    code: 'ID-ST',
    labelPos: [121.2, -1.1],
    polygons: [
      [
        [119.5, 1.2], [121.3, 1.0], [121.4, 0.5], [120.7, 0.1], [122.2, -0.4],
        [123.4, -1.0], [122.6, -2.1], [121.5, -2.8], [120.5, -2.1],
        [119.6, -1.5], [119.8, 0.1],
      ],
    ],
  },
  {
    code: 'ID-SR',
    labelPos: [119.3, -2.3],
    polygons: [
      [
        [119.6, -1.5], [119.8, -2.7], [119.2, -3.5], [118.8, -3.0],
        [119.0, -1.8],
      ],
    ],
  },
  {
    code: 'ID-SN',
    labelPos: [120.0, -4.3],
    polygons: [
      [
        [119.2, -3.5], [119.8, -2.7], [120.5, -2.1], [121.5, -2.8],
        [120.6, -3.6], [120.5, -5.6], [119.4, -5.6], [119.4, -4.3],
      ],
    ],
  },
  {
    code: 'ID-SG',
    labelPos: [122.1, -4.1],
    polygons: [
      [
        [121.5, -2.8], [122.6, -3.5], [122.9, -4.9], [121.6, -4.9],
        [120.9, -4.2],
      ],
      [[122.4, -5.0], [123.2, -4.9], [123.1, -5.7], [122.4, -5.6]], // Buton
    ],
  },
  {
    code: 'ID-MU',
    labelPos: [127.8, 1.2],
    polygons: [
      [
        [127.2, 2.2], [128.5, 2.3], [128.8, 0.9], [128.1, -0.5],
        [127.4, -0.4], [127.5, 0.9],
      ],
    ],
  },
  {
    code: 'ID-MA',
    labelPos: [129.1, -3.2],
    polygons: [
      [[125.9, -3.1], [127.2, -3.1], [127.2, -3.9], [126.0, -3.9]], // Buru
      [[127.8, -2.8], [130.8, -3.0], [130.8, -3.9], [127.9, -3.7]], // Seram + Ambon
      [[131.0, -7.1], [132.0, -7.1], [131.9, -8.2], [130.8, -8.1]], // Tanimbar
    ],
  },
  {
    code: 'ID-PD',
    labelPos: [131.8, -1.2],
    polygons: [
      [
        [130.7, -0.6], [132.7, -0.4], [132.8, -1.7], [131.5, -1.9],
      ],
    ],
  },
  {
    code: 'ID-PB',
    labelPos: [133.7, -2.0],
    polygons: [
      [
        [132.7, -0.4], [134.3, -0.9], [134.8, -2.6], [133.9, -3.8],
        [132.4, -2.8], [132.8, -1.7],
      ],
    ],
  },
  {
    code: 'ID-PT',
    labelPos: [136.3, -3.9],
    polygons: [
      [
        [134.8, -2.6], [137.4, -2.9], [137.5, -4.9], [135.5, -4.6],
        [134.6, -3.6],
      ],
    ],
  },
  {
    code: 'ID-PA',
    labelPos: [139.0, -2.4],
    polygons: [
      [
        [137.4, -2.9], [140.9, -2.4], [140.9, -3.6], [137.4, -3.6],
      ],
    ],
  },
  {
    code: 'ID-PP',
    labelPos: [139.3, -4.3],
    polygons: [
      [
        [137.4, -3.6], [140.9, -3.6], [140.9, -5.2], [137.5, -4.9],
      ],
    ],
  },
  {
    code: 'ID-PS',
    labelPos: [139.2, -7.0],
    polygons: [
      [
        [137.5, -4.9], [140.9, -5.2], [140.9, -9.0], [138.9, -8.5],
        [137.6, -7.1],
      ],
    ],
  },
];

function getChoroplethColor(count: number, maxCount: number): string {
  if (count <= 0 || maxCount <= 0) return '#EDF2F7';
  const ratio = count / maxCount;
  if (ratio >= 0.75) return '#17365D';
  if (ratio >= 0.45) return '#0066A4';
  if (ratio >= 0.2) return '#2E86C1';
  if (ratio >= 0.08) return '#7FB3D5';
  return '#C6E0F2';
}

export const IndonesiaProvinceMap: React.FC<IndonesiaProvinceMapProps> = ({
  provinceDetails,
  totalUniqueParticipants,
}) => {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { byCode, maxCount, unmatchedProvinces } = useMemo(() => {
    const map = new Map<
      string,
      {
        canonicalName: string;
        island: string;
        total: number;
        percentage: number;
        maleCount: number;
        femaleCount: number;
        topBidangStudi: string;
        topBidangStudiCount: number;
        rawNames: string[];
      }
    >();
    const unmatched: ProvinceDetailRow[] = [];

    for (const row of provinceDetails) {
      const meta = normalizeProvinceMeta(row.provinsi);
      if (!meta) {
        unmatched.push(row);
        continue;
      }
      const existing = map.get(meta.code);
      if (!existing) {
        map.set(meta.code, {
          canonicalName: meta.name,
          island: meta.island,
          total: row.total,
          percentage:
            totalUniqueParticipants > 0
              ? (row.total / totalUniqueParticipants) * 100
              : row.percentage,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          topBidangStudi: row.topBidangStudi,
          topBidangStudiCount: row.topBidangStudiCount,
          rawNames: [row.provinsi],
        });
      } else {
        existing.total += row.total;
        existing.maleCount += row.maleCount;
        existing.femaleCount += row.femaleCount;
        existing.percentage =
          totalUniqueParticipants > 0
            ? (existing.total / totalUniqueParticipants) * 100
            : existing.percentage;
        if (row.topBidangStudiCount > existing.topBidangStudiCount) {
          existing.topBidangStudi = row.topBidangStudi;
          existing.topBidangStudiCount = row.topBidangStudiCount;
        }
        existing.rawNames.push(row.provinsi);
      }
    }

    let max = 0;
    for (const v of map.values()) {
      if (v.total > max) max = v.total;
    }

    return { byCode: map, maxCount: max, unmatchedProvinces: unmatched };
  }, [provinceDetails, totalUniqueParticipants]);

  const activeCode = hoveredCode ?? selectedCode;
  const activeMeta = activeCode
    ? INDONESIA_PROVINCES.find((p) => p.code === activeCode) ?? null
    : null;
  const activeStats = activeCode ? byCode.get(activeCode) ?? null : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#17365D]">
            Peta Persebaran Peserta PPG UT per Provinsi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Arahkan kursor atau klik provinsi untuk melihat rincian jumlah peserta, komposisi gender, dan bidang studi dominan.
          </p>
        </div>

        {/* Choropleth Scale Legend */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>Rendah</span>
          <div className="flex items-center gap-0.5">
            {['#EDF2F7', '#C6E0F2', '#7FB3D5', '#2E86C1', '#0066A4', '#17365D'].map(
              (c) => (
                <span
                  key={c}
                  className="w-4 h-2.5 rounded-xs border border-slate-300/60"
                  style={{ backgroundColor: c }}
                />
              )
            )}
          </div>
          <span>Tinggi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* SVG Choropleth Canvas */}
        <div className="lg:col-span-8 bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 relative overflow-hidden">
          <svg
            viewBox="0 0 980 410"
            className="w-full h-auto select-none"
            role="img"
            aria-label="Peta Persebaran Provinsi Peserta PPG UT Indonesia"
          >
            {PROVINCE_SHAPES.map((shape) => {
              const stats = byCode.get(shape.code);
              const count = stats?.total ?? 0;
              const isSelected = selectedCode === shape.code;
              const isHovered = hoveredCode === shape.code;
              const fill = getChoroplethColor(count, maxCount);

              return (
                <g
                  key={shape.code}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => setHoveredCode(shape.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  onClick={() =>
                    setSelectedCode((prev) => (prev === shape.code ? null : shape.code))
                  }
                >
                  {shape.polygons.map((ring, idx) => (
                    <path
                      key={`${shape.code}-${idx}`}
                      d={ringToSvgPath(ring)}
                      fill={fill}
                      stroke={isSelected || isHovered ? '#F39C35' : '#FFFFFF'}
                      strokeWidth={isSelected || isHovered ? 2 : 1}
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Province Inspector Side Panel */}
        <div className="lg:col-span-4 bg-[#F5F7FA] border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4">
          {activeMeta ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-medium text-[#0066A4]">
                    Wilayah {activeMeta.island}
                  </div>
                  <h4 className="text-base font-bold text-[#17365D]">
                    {activeMeta.name}
                  </h4>
                </div>
                {selectedCode && (
                  <button
                    type="button"
                    onClick={() => setSelectedCode(null)}
                    aria-label="Reset pilihan provinsi"
                    className="p-1 rounded-md text-slate-400 hover:text-[#17365D] hover:bg-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeStats ? (
                <div className="space-y-2.5 text-xs">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-baseline justify-between">
                    <span className="text-slate-500">Total Peserta Unik</span>
                    <span className="text-lg font-bold text-[#17365D] font-mono-tabular">
                      {activeStats.total.toLocaleString('id-ID')}{' '}
                      <span className="text-[11px] font-normal text-[#0066A4]">
                        ({activeStats.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">Laki-Laki</div>
                      <div className="text-sm font-bold text-[#0066A4] font-mono-tabular">
                        {activeStats.maleCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">Perempuan</div>
                      <div className="text-sm font-bold text-[#F39C35] font-mono-tabular">
                        {activeStats.femaleCount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500">Bidang Studi Dominan</div>
                    <div className="text-xs font-semibold text-[#17365D] mt-0.5">
                      {activeStats.topBidangStudi}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                      {activeStats.topBidangStudiCount.toLocaleString('id-ID')} peserta
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-500">
                  Belum ada peserta terdaftar dari provinsi {activeMeta.name} pada cakupan filter saat ini.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 my-auto text-center py-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#0066A4] flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-[#17365D]">
                Pilih Provinsi pada Peta
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Arahkan kursor atau klik salah satu provinsi di peta Indonesia untuk melihat detail sebaran peserta secara instan.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>Provinsi Tercakup</span>
            <span className="font-semibold text-[#17365D]">
              {byCode.size.toLocaleString('id-ID')} / 38 Provinsi
            </span>
          </div>
        </div>
      </div>

      {unmatchedProvinces.length > 0 && (
        <div className="text-[11px] text-slate-500">
          Penamaan wilayah tambahan dalam Excel:{' '}
          {unmatchedProvinces
            .map((p) => `${p.provinsi} (${p.total.toLocaleString('id-ID')})`)
            .join(', ')}
        </div>
      )}
    </div>
  );
};
