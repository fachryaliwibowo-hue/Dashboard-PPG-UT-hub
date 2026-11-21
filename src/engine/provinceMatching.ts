import { LectureLocation, ParticipantRecord } from '../types/participant';

export interface CanonicalProvinceMeta {
  code: string;
  name: string;
  island: 'Sumatera' | 'Jawa' | 'Bali & Nusa Tenggara' | 'Kalimantan' | 'Sulawesi' | 'Maluku' | 'Papua';
  aliases: string[];
}

export const INDONESIA_PROVINCES: CanonicalProvinceMeta[] = [
  { code: 'ID-AC', name: 'Aceh', island: 'Sumatera', aliases: ['aceh', 'nad', 'nanggroe aceh darussalam', 'daerah istimewa aceh'] },
  { code: 'ID-SU', name: 'Sumatera Utara', island: 'Sumatera', aliases: ['sumatera utara', 'sumatra utara', 'sumut'] },
  { code: 'ID-SB', name: 'Sumatera Barat', island: 'Sumatera', aliases: ['sumatera barat', 'sumatra barat', 'sumbar'] },
  { code: 'ID-RI', name: 'Riau', island: 'Sumatera', aliases: ['riau'] },
  { code: 'ID-KR', name: 'Kepulauan Riau', island: 'Sumatera', aliases: ['kepulauan riau', 'kep riau', 'kep. riau', 'kepri'] },
  { code: 'ID-JA', name: 'Jambi', island: 'Sumatera', aliases: ['jambi'] },
  { code: 'ID-SS', name: 'Sumatera Selatan', island: 'Sumatera', aliases: ['sumatera selatan', 'sumatra selatan', 'sumsel'] },
  { code: 'ID-BB', name: 'Kepulauan Bangka Belitung', island: 'Sumatera', aliases: ['kepulauan bangka belitung', 'bangka belitung', 'kep bangka belitung', 'kep. bangka belitung', 'babel'] },
  { code: 'ID-BE', name: 'Bengkulu', island: 'Sumatera', aliases: ['bengkulu'] },
  { code: 'ID-LA', name: 'Lampung', island: 'Sumatera', aliases: ['lampung'] },
  { code: 'ID-BT', name: 'Banten', island: 'Jawa', aliases: ['banten'] },
  { code: 'ID-JK', name: 'DKI Jakarta', island: 'Jawa', aliases: ['dki jakarta', 'jakarta', 'daerah khusus ibukota jakarta', 'dki'] },
  { code: 'ID-JB', name: 'Jawa Barat', island: 'Jawa', aliases: ['jawa barat', 'jabar'] },
  { code: 'ID-JT', name: 'Jawa Tengah', island: 'Jawa', aliases: ['jawa tengah', 'jateng'] },
  { code: 'ID-YO', name: 'DI Yogyakarta', island: 'Jawa', aliases: ['di yogyakarta', 'diy', 'yogyakarta', 'daerah istimewa yogyakarta', 'jogjakarta', 'jogja'] },
  { code: 'ID-JI', name: 'Jawa Timur', island: 'Jawa', aliases: ['jawa timur', 'jatim'] },
  { code: 'ID-BA', name: 'Bali', island: 'Bali & Nusa Tenggara', aliases: ['bali'] },
  { code: 'ID-NB', name: 'Nusa Tenggara Barat', island: 'Bali & Nusa Tenggara', aliases: ['nusa tenggara barat', 'ntb'] },
  { code: 'ID-NT', name: 'Nusa Tenggara Timur', island: 'Bali & Nusa Tenggara', aliases: ['nusa tenggara timur', 'ntt'] },
  { code: 'ID-KB', name: 'Kalimantan Barat', island: 'Kalimantan', aliases: ['kalimantan barat', 'kalbar'] },
  { code: 'ID-KT', name: 'Kalimantan Tengah', island: 'Kalimantan', aliases: ['kalimantan tengah', 'kalteng'] },
  { code: 'ID-KS', name: 'Kalimantan Selatan', island: 'Kalimantan', aliases: ['kalimantan selatan', 'kalsel'] },
  { code: 'ID-KI', name: 'Kalimantan Timur', island: 'Kalimantan', aliases: ['kalimantan timur', 'kaltim'] },
  { code: 'ID-KU', name: 'Kalimantan Utara', island: 'Kalimantan', aliases: ['kalimantan utara', 'kalut', 'kaltara'] },
  { code: 'ID-SA', name: 'Sulawesi Utara', island: 'Sulawesi', aliases: ['sulawesi utara', 'sulut'] },
  { code: 'ID-GO', name: 'Gorontalo', island: 'Sulawesi', aliases: ['gorontalo'] },
  { code: 'ID-ST', name: 'Sulawesi Tengah', island: 'Sulawesi', aliases: ['sulawesi tengah', 'sulteng'] },
  { code: 'ID-SR', name: 'Sulawesi Barat', island: 'Sulawesi', aliases: ['sulawesi barat', 'sulbar'] },
  { code: 'ID-SN', name: 'Sulawesi Selatan', island: 'Sulawesi', aliases: ['sulawesi selatan', 'sulsel'] },
  { code: 'ID-SG', name: 'Sulawesi Tenggara', island: 'Sulawesi', aliases: ['sulawesi tenggara', 'sultra'] },
  { code: 'ID-MU', name: 'Maluku Utara', island: 'Maluku', aliases: ['maluku utara', 'malut'] },
  { code: 'ID-MA', name: 'Maluku', island: 'Maluku', aliases: ['maluku'] },
  { code: 'ID-PD', name: 'Papua Barat Daya', island: 'Papua', aliases: ['papua barat daya'] },
  { code: 'ID-PB', name: 'Papua Barat', island: 'Papua', aliases: ['papua barat'] },
  { code: 'ID-PT', name: 'Papua Tengah', island: 'Papua', aliases: ['papua tengah'] },
  { code: 'ID-PP', name: 'Papua Pegunungan', island: 'Papua', aliases: ['papua pegunungan'] },
  { code: 'ID-PS', name: 'Papua Selatan', island: 'Papua', aliases: ['papua selatan'] },
  { code: 'ID-PA', name: 'Papua', island: 'Papua', aliases: ['papua', 'irian jaya'] },
];

function cleanRegionText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^provinsi\s+/i, '')
    .replace(/^prov\.?\s+/i, '')
    .replace(/^prop\.?\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProvinceMeta(raw: string): CanonicalProvinceMeta | null {
  const cleaned = cleanRegionText(raw);
  if (!cleaned) return null;

  for (const prov of INDONESIA_PROVINCES) {
    if (prov.name.toLowerCase() === cleaned || prov.aliases.includes(cleaned)) {
      return prov;
    }
  }

  // Fallback partial match (longest alias first to avoid e.g. Papua matching Papua Barat)
  const ordered = [...INDONESIA_PROVINCES].sort((a, b) => b.name.length - a.name.length);
  for (const prov of ordered) {
    for (const alias of prov.aliases) {
      if (cleaned === alias || cleaned.includes(alias)) {
        return prov;
      }
    }
  }
  return null;
}

export type CoverageGapStatus = 'belum_tercakup' | 'rasio_tinggi' | 'tercakup' | 'hanya_lokasi';

export interface ProvinceCoverageRow {
  key: string;
  provinsiName: string;
  island: string;
  participantCount: number;
  locationCount: number;
  locations: LectureLocation[];
  ratioPerLocation: number | null;
  status: CoverageGapStatus;
}

export function computeLocationCoverageGap(
  records: ParticipantRecord[],
  locations: LectureLocation[]
): ProvinceCoverageRow[] {
  const map = new Map<
    string,
    {
      provinsiName: string;
      island: string;
      ptkSet: Set<string>;
      locations: LectureLocation[];
    }
  >();

  const getOrCreate = (rawProv: string) => {
    const meta = normalizeProvinceMeta(rawProv);
    const key = meta ? meta.code : `RAW:${cleanRegionText(rawProv) || 'lainnya'}`;
    const existing = map.get(key);
    if (existing) return existing;
    const entry = {
      provinsiName: meta ? meta.name : rawProv.trim() || 'Tidak Diketahui',
      island: meta ? meta.island : 'Lainnya',
      ptkSet: new Set<string>(),
      locations: [],
    };
    map.set(key, entry);
    return entry;
  };

  for (const r of records) {
    if (r.isPtkEmpty || !r.normPtkId || !r.normProvinsi) continue;
    if (r.isPtkDuplicate && r.ptkOccurrenceIndex > 1) continue;
    const bucket = getOrCreate(r.normProvinsi);
    bucket.ptkSet.add(r.normPtkId);
  }

  for (const loc of locations) {
    const rawProv = loc.provinsi.trim();
    if (!rawProv) continue;
    const bucket = getOrCreate(rawProv);
    bucket.locations.push(loc);
  }

  const rows: ProvinceCoverageRow[] = [];
  for (const [key, item] of map.entries()) {
    const participantCount = item.ptkSet.size;
    const locationCount = item.locations.length;
    const ratioPerLocation =
      locationCount > 0 ? Math.round((participantCount / locationCount) * 10) / 10 : null;

    let status: CoverageGapStatus = 'tercakup';
    if (participantCount > 0 && locationCount === 0) {
      status = 'belum_tercakup';
    } else if (participantCount === 0 && locationCount > 0) {
      status = 'hanya_lokasi';
    } else if (ratioPerLocation !== null && ratioPerLocation >= 100) {
      status = 'rasio_tinggi';
    }

    rows.push({
      key,
      provinsiName: item.provinsiName,
      island: item.island,
      participantCount,
      locationCount,
      locations: item.locations,
      ratioPerLocation,
      status,
    });
  }

  // Prioritize provinces with participants and 0 locations at the top, then by participant count desc
  return rows.sort((a, b) => {
    const priority = (s: CoverageGapStatus) =>
      s === 'belum_tercakup' ? 0 : s === 'rasio_tinggi' ? 1 : s === 'tercakup' ? 2 : 3;
    const pa = priority(a.status);
    const pb = priority(b.status);
    if (pa !== pb) return pa - pb;
    if (b.participantCount !== a.participantCount) {
      return b.participantCount - a.participantCount;
    }
    return a.provinsiName.localeCompare(b.provinsiName, 'id');
  });
}
