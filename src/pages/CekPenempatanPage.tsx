import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Search,
  Shield,
  UserCheck,
} from 'lucide-react';
import { lookupPlacementInCloud } from '../engine/cloudSync';
import { getSafeGoogleMapsHref } from '../engine/mapsUrl';
import { maskAkunSimpkb, maskPtkId } from '../engine/privacyMasking';
import {
  LectureLocation,
  ParticipantRecord,
  PrivacyConfig,
  PublicPlacementResult,
  UserRole,
} from '../types/participant';

interface CekPenempatanPageProps {
  allRecords: ParticipantRecord[];
  activeRevisionId: string;
  locations: LectureLocation[];
  userRole: UserRole;
  privacyConfig: PrivacyConfig;
  onNavigateToPage: (page: 'lokasi-perkuliahan') => void;
}

interface PlacementDisplayCard {
  key: string;
  nama: string;
  ptkId: string;
  akunSimpkb: string;
  jenisKelamin: string;
  kotaKab: string;
  provinsi: string;
  lptk: string;
  bidangStudi: string;
  statusMatrikulasi: string;
}

export const CekPenempatanPage: React.FC<CekPenempatanPageProps> = ({
  allRecords,
  activeRevisionId,
  locations,
  userRole,
  privacyConfig,
  onNavigateToPage,
}) => {
  const [queryText, setQueryText] = useState('');
  const isUserMode = userRole === 'user';

  // State for secure exact-ID cloud lookup in Mode User
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [userLookupDone, setUserLookupDone] = useState(false);
  const [userLookupQuery, setUserLookupQuery] = useState('');
  const [userLookupError, setUserLookupError] = useState<string | null>(null);
  const [userLookupResult, setUserLookupResult] = useState<PublicPlacementResult | null>(null);

  const trimmed = queryText.trim().toLowerCase();

  // Admin mode in-memory instant search (supports PTK ID, SIMPKB, or Name)
  const adminMatches = useMemo(() => {
    if (isUserMode || trimmed.length < 4) return [];
    const exactOrPartial = allRecords.filter((r) => {
      return (
        r.normPtkId.toLowerCase().includes(trimmed) ||
        r.normAkunSimpkb.toLowerCase().includes(trimmed) ||
        r.normNamaPeserta.toLowerCase().includes(trimmed)
      );
    });
    exactOrPartial.sort((a, b) => {
      const aExact =
        a.normPtkId.toLowerCase() === trimmed ||
        a.normAkunSimpkb.toLowerCase() === trimmed;
      const bExact =
        b.normPtkId.toLowerCase() === trimmed ||
        b.normAkunSimpkb.toLowerCase() === trimmed;
      if (aExact !== bExact) return aExact ? -1 : 1;
      return a.namaPeserta.localeCompare(b.namaPeserta, 'id');
    });
    return exactOrPartial.slice(0, 12);
  }, [allRecords, isUserMode, trimmed]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = queryText.trim();
    setUserLookupError(null);

    if (cleaned.length < 5) {
      setUserLookupError(
        'Masukkan PTK ID atau Akun SIMPKB (@guruku.id) secara lengkap (minimal 5 karakter).'
      );
      return;
    }

    setIsSearchingUser(true);
    setUserLookupQuery(cleaned);
    try {
      const result = await lookupPlacementInCloud(cleaned, activeRevisionId);
      setUserLookupResult(result);
      setUserLookupDone(true);
    } catch (err) {
      setUserLookupError(
        err instanceof Error ? err.message : 'Gagal memeriksa data penempatan di cloud.'
      );
    } finally {
      setIsSearchingUser(false);
    }
  };

  const displayCards: PlacementDisplayCard[] = useMemo(() => {
    if (isUserMode) {
      if (!userLookupResult) return [];
      return [
        {
          key: `lookup_${userLookupResult.revisionId}_${userLookupResult.maskedPtkId}`,
          nama: userLookupResult.maskedName || '(Peserta Terverifikasi)',
          ptkId: userLookupResult.maskedPtkId,
          akunSimpkb: userLookupResult.maskedSimpkb,
          jenisKelamin: userLookupResult.jenisKelamin,
          kotaKab: userLookupResult.kotaKab,
          provinsi: userLookupResult.provinsi,
          lptk: userLookupResult.lptk,
          bidangStudi: userLookupResult.bidangStudi,
          statusMatrikulasi: userLookupResult.statusMatrikulasi,
        },
      ];
    }

    return adminMatches.map((p) => ({
      key: `${p.rowIndex}-${p.excelRowNumber}`,
      nama: p.namaPeserta || '(Nama Tidak Tercantum)',
      ptkId: isUserMode ? maskPtkId(p.ptkId, privacyConfig.maskPtkId) : p.ptkId,
      akunSimpkb: isUserMode
        ? maskAkunSimpkb(p.akunSimpkb, privacyConfig.maskAkunSimpkb)
        : p.akunSimpkb,
      jenisKelamin: p.jenisKelamin,
      kotaKab: p.kotaKab,
      provinsi: p.provinsi,
      lptk: p.lptk,
      bidangStudi: p.bidangStudi,
      statusMatrikulasi: p.statusMatrikulasi,
    }));
  }, [isUserMode, userLookupResult, adminMatches, privacyConfig]);

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#17365D]">
            {isUserMode
              ? 'Cek Penempatan Mandiri Peserta'
              : 'Cek Penempatan & Informasi Akademik Peserta'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isUserMode
              ? 'Masukkan PTK ID atau Akun SIMPKB (@guruku.id) Anda secara lengkap untuk melihat LPTK penempatan, status matrikulasi, serta lokasi perkuliahan terkait.'
              : 'Masukkan PTK ID, Akun SIMPKB, atau Nama Lengkap (minimal 4 karakter) untuk melihat LPTK penempatan, status matrikulasi, serta lokasi perkuliahan terkait.'}
          </p>
        </div>

        {isUserMode ? (
          <form onSubmit={handleUserSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Ketik PTK ID atau Akun SIMPKB (@guruku.id) secara lengkap..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F7FA] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0066A4]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingUser}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              {isSearchingUser ? 'Memeriksa...' : 'Cek Penempatan'}
            </button>
          </form>
        ) : (
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ketik PTK ID, Akun SIMPKB (@guruku.id), atau Nama Peserta..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F7FA] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0066A4]"
            />
          </div>
        )}

        {isUserMode && (
          <div className="inline-flex items-center gap-2 text-[11px] text-[#0066A4]">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>
              Untuk melindungi data pribadi peserta dari penyalahgunaan dan phishing, pencarian publik hanya melayani pencocokan PTK ID atau Akun SIMPKB lengkap dan nomor pengenal sensitif (PTK ID &amp; SIMPKB) disamarkan.
            </span>
          </div>
        )}

        {userLookupError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 max-w-2xl">
            {userLookupError}
          </div>
        )}
      </div>

      {/* Results State */}
      {isUserMode ? (
        !userLookupDone ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-[#17365D]">
                Pencarian Mandiri Penempatan Peserta
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan PTK ID atau Akun SIMPKB lengkap Anda lalu tekan tombol Cek Penempatan untuk menampilkan informasi LPTK dan lokasi perkuliahan yang sesuai.
              </p>
            </div>
          </div>
        ) : displayCards.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-1.5">
            <div className="text-sm font-bold text-[#17365D]">Data Penempatan Tidak Ditemukan</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tidak ada data yang cocok dengan identitas <strong className="text-[#17365D]">"{userLookupQuery}"</strong>. Pastikan penulisan PTK ID atau Akun SIMPKB lengkap tanpa spasi berlebih.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayCards.map((card) => renderPlacementCard(card, locations, onNavigateToPage))}
          </div>
        )
      ) : trimmed.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-[#17365D]">
              Pencarian Cepat Penempatan Peserta
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mulai mengetik pada kotak pencarian di atas untuk menampilkan kartu ringkasan penempatan beserta rujukan lokasi perkuliahan yang sesuai.
            </p>
          </div>
        </div>
      ) : trimmed.length < 4 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Ketik minimal 4 karakter untuk memulai pencarian data penempatan peserta.
        </div>
      ) : displayCards.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-1.5">
          <div className="text-sm font-bold text-[#17365D]">Data Peserta Tidak Ditemukan</div>
          <p className="text-xs text-slate-500">
            Pastikan penulisan PTK ID, Akun SIMPKB, atau Nama Peserta sesuai dengan database aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-500 tabular-nums">
            Menampilkan <strong className="text-[#17365D]">{displayCards.length}</strong> hasil teratas untuk{' '}
            <strong className="text-[#17365D]">"{queryText.trim()}"</strong>
          </div>

          {displayCards.map((card) => renderPlacementCard(card, locations, onNavigateToPage))}
        </div>
      )}
    </div>
  );
};

function renderPlacementCard(
  p: PlacementDisplayCard,
  locations: LectureLocation[],
  onNavigateToPage: (page: 'lokasi-perkuliahan') => void
) {
  const pLptkLower = p.lptk.trim().toLowerCase();
  const pProvLower = p.provinsi.trim().toLowerCase();

  const relatedLocations = locations.filter((loc) => {
    const lptkMatch =
      pLptkLower &&
      loc.lptkTerkait &&
      (loc.lptkTerkait.toLowerCase().includes(pLptkLower) ||
        pLptkLower.includes(loc.lptkTerkait.toLowerCase()));
    const provMatch =
      pProvLower &&
      loc.provinsi &&
      loc.provinsi.toLowerCase().includes(pProvLower);
    return Boolean(lptkMatch || provMatch);
  });

  return (
    <div
      key={p.key}
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
    >
      {/* Participant Identity & Placement */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="text-[11px] font-semibold text-[#0066A4] uppercase tracking-wide">
            Hasil Penempatan Peserta
          </div>
          <h3 className="text-lg font-bold text-[#17365D] mt-0.5">{p.nama}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1 font-mono-tabular">
            <span>PTK ID: {p.ptkId || '-'}</span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <span>SIMPKB: {p.akunSimpkb || '-'}</span>
            {p.jenisKelamin && (
              <>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span>{p.jenisKelamin}</span>
              </>
            )}
          </div>
        </div>

        {(() => {
          const statusVal = (p.statusMatrikulasi || '').trim();
          const statusLower = statusVal.toLowerCase();
          const isPositive =
            statusLower.includes('ya') ||
            statusLower.includes('lulus') ||
            statusLower.includes('sudah') ||
            statusLower.includes('selesai');
          return (
            <div className="flex flex-col sm:items-end text-left sm:text-right">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#17365D]">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    isPositive ? 'text-[#16A34A]' : 'text-[#0066A4]'
                  }`}
                />
                <span>
                  Status Matrikulasi:{' '}
                  <span className={isPositive ? 'text-[#16A34A] font-bold' : 'text-[#17365D] font-bold'}>
                    {statusVal || 'Belum Tercantum'}
                  </span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Menunjukkan status matrikulasi peserta
              </span>
            </div>
          );
        })()}
      </div>

      {/* Core Academic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
          <div className="text-[11px] text-slate-500">LPTK Penyelenggara</div>
          <div className="font-bold text-[#17365D] mt-0.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#0066A4] shrink-0" />
            <span>{p.lptk || '-'}</span>
          </div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
          <div className="text-[11px] text-slate-500">Bidang Studi</div>
          <div className="font-bold text-[#17365D] mt-0.5">{p.bidangStudi || '-'}</div>
        </div>
        <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/80">
          <div className="text-[11px] text-slate-500">Domisili Peserta</div>
          <div className="font-bold text-[#17365D] mt-0.5">
            {[p.kotaKab, p.provinsi].filter(Boolean).join(', ') || '-'}
          </div>
        </div>
      </div>

      {/* Cross-linked Locations */}
      <div className="pt-1 text-xs">
        <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#17365D] inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0066A4]" />
              Lokasi Perkuliahan ({relatedLocations.length})
            </span>
            <button
              type="button"
              onClick={() => onNavigateToPage('lokasi-perkuliahan')}
              className="text-[11px] text-[#0066A4] hover:underline whitespace-nowrap"
            >
              Lihat Semua
            </button>
          </div>
          {relatedLocations.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Belum ada lokasi spesifik untuk LPTK/provinsi ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedLocations.slice(0, 2).map((loc) => {
                const mapsInfo = getSafeGoogleMapsHref(loc);
                return (
                  <div key={loc.id} className="text-[11px] text-slate-600 space-y-1">
                    <div className="font-semibold text-[#17365D]">{loc.namaLokasi}</div>
                    <div className="line-clamp-2">{loc.alamatLengkap}</div>
                    <a
                      href={mapsInfo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0066A4] hover:underline"
                    >
                      <span>
                        {mapsInfo.isDirectPin ? 'Buka di Google Maps' : 'Cari di Google Maps'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
