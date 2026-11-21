import React, { useMemo, useState } from 'react';
import {
  Building,
  Building2,
  Check,
  Copy,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { RICH_TEXT_VIEW_CLASSES, RichTextEditor } from '../components/RichTextEditor';
import { getSafeGoogleMapsHref, normalizeGoogleMapsUrl } from '../engine/mapsUrl';
import { isRichTextEmpty, sanitizeRichHtml } from '../engine/richTextSanitizer';
import {
  LectureLocation,
  LocationPageNote,
  UserRole,
} from '../types/participant';

interface LokasiPerkuliahanPageProps {
  locations: LectureLocation[];
  locationNote: LocationPageNote | null;
  userRole: UserRole;
  isAdminAuthenticated: boolean;
  availableLptks: string[];
  onSaveLocation: (
    locationId: string,
    payload: Omit<LectureLocation, 'id' | 'updatedAt'>,
    isUpdate: boolean
  ) => Promise<void>;
  onDeleteLocation: (locationId: string) => Promise<void>;
  onSaveLocationNote: (noteText: string) => Promise<void>;
  onRequestAdminLogin: () => void;
}

interface LocationFormState {
  namaLokasi: string;
  lptkTerkait: string;
  alamatLengkap: string;
  kotaKab: string;
  provinsi: string;
  kodePos: string;
  ruangAtauGedung: string;
  kontakPenanggungJawab: string;
  catatan: string;
  googleMapsUrl: string;
}

const EMPTY_FORM: LocationFormState = {
  namaLokasi: '',
  lptkTerkait: '',
  alamatLengkap: '',
  kotaKab: '',
  provinsi: '',
  kodePos: '',
  ruangAtauGedung: '',
  kontakPenanggungJawab: '',
  catatan: '',
  googleMapsUrl: '',
};

function createLocationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const LokasiPerkuliahanPage: React.FC<LokasiPerkuliahanPageProps> = ({
  locations,
  locationNote,
  userRole,
  isAdminAuthenticated,
  availableLptks,
  onSaveLocation,
  onDeleteLocation,
  onSaveLocationNote,
  onRequestAdminLogin,
}) => {
  const isAdmin = userRole === 'admin' && isAdminAuthenticated;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvinsi, setFilterProvinsi] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(key);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Clipboard API unavailable in restricted context
    }
  };

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const loc of locations) {
      if (loc.provinsi.trim()) set.add(loc.provinsi.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locations.filter((loc) => {
      if (filterProvinsi && loc.provinsi.trim() !== filterProvinsi) {
        return false;
      }
      if (!q) return true;
      return (
        loc.namaLokasi.toLowerCase().includes(q) ||
        loc.alamatLengkap.toLowerCase().includes(q) ||
        loc.kotaKab.toLowerCase().includes(q) ||
        loc.provinsi.toLowerCase().includes(q) ||
        loc.lptkTerkait.toLowerCase().includes(q) ||
        loc.ruangAtauGedung.toLowerCase().includes(q)
      );
    });
  }, [locations, searchQuery, filterProvinsi]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (loc: LectureLocation) => {
    setEditingId(loc.id);
    setForm({
      namaLokasi: loc.namaLokasi,
      lptkTerkait: loc.lptkTerkait,
      alamatLengkap: loc.alamatLengkap,
      kotaKab: loc.kotaKab,
      provinsi: loc.provinsi,
      kodePos: loc.kodePos,
      ruangAtauGedung: loc.ruangAtauGedung,
      kontakPenanggungJawab: loc.kontakPenanggungJawab,
      catatan: loc.catatan,
      googleMapsUrl: loc.googleMapsUrl ?? '',
    });
    setFormError(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.namaLokasi.trim()) {
      setFormError('Nama lokasi perkuliahan wajib diisi.');
      return;
    }
    if (!form.alamatLengkap.trim()) {
      setFormError('Alamat lengkap wajib diisi.');
      return;
    }

    const normalizedMapsUrl = normalizeGoogleMapsUrl(form.googleMapsUrl);
    if (normalizedMapsUrl === null) {
      setFormError(
        'Tautan Google Maps tidak valid. Gunakan tautan resmi Google Maps (contoh: https://maps.app.goo.gl/... atau https://www.google.com/maps/...).'
      );
      return;
    }

    const targetId = editingId ?? createLocationId();
    const isUpdate = Boolean(editingId);

    setIsSaving(true);
    try {
      await onSaveLocation(
        targetId,
        {
          namaLokasi: form.namaLokasi.trim(),
          lptkTerkait: form.lptkTerkait.trim(),
          alamatLengkap: form.alamatLengkap.trim(),
          kotaKab: form.kotaKab.trim(),
          provinsi: form.provinsi.trim(),
          kodePos: form.kodePos.trim(),
          ruangAtauGedung: form.ruangAtauGedung.trim(),
          kontakPenanggungJawab: form.kontakPenanggungJawab.trim(),
          catatan: form.catatan.trim(),
          googleMapsUrl: normalizedMapsUrl,
        },
        isUpdate
      );

      setIsFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan alamat lokasi ke cloud.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    setDeletingId(id);
    try {
      await onDeleteLocation(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal menghapus alamat lokasi.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openNoteEditor = () => {
    setNoteDraft(locationNote?.noteText ?? '');
    setNoteError(null);
    setIsEditingNote(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);
    if (noteDraft.length > 15000) {
      setNoteError(
        'Ukuran format catatan melebihi batas maksimal (15.000 karakter). Harap ringkas isi catatan.'
      );
      return;
    }
    setIsSavingNote(true);
    try {
      await onSaveLocationNote(noteDraft);
      setIsEditingNote(false);
    } catch (err) {
      setNoteError(
        err instanceof Error ? err.message : 'Gagal menyimpan catatan ke cloud.'
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleClearNote = async () => {
    setNoteError(null);
    setIsSavingNote(true);
    try {
      await onSaveLocationNote('');
      setNoteDraft('');
      setIsEditingNote(false);
    } catch (err) {
      setNoteError(
        err instanceof Error ? err.message : 'Gagal menghapus catatan dari cloud.'
      );
    } finally {
      setIsSavingNote(false);
    }
  };

  const sanitizedActiveNoteHtml = locationNote?.noteText
    ? sanitizeRichHtml(locationNote.noteText)
    : '';
  const hasActiveNote = !isRichTextEmpty(sanitizedActiveNoteHtml);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17365D]">
              Daftar Lokasi Perkuliahan PPG UT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Informasi alamat resmi lokasi perkuliahan, ujian, atau kegiatan tatap muka · Total{' '}
              <strong className="text-[#17365D]">
                {locations.length.toLocaleString('id-ID')}
              </strong>{' '}
              lokasi terdaftar
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Alamat Lokasi</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama lokasi, alamat, LPTK, atau kota..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
            />
          </div>

          {provinceOptions.length > 0 && (
            <select
              value={filterProvinsi}
              onChange={(e) => setFilterProvinsi(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-[#17365D] focus:outline-none focus:border-[#0066A4]"
            >
              <option value="">Semua Provinsi</option>
              {provinceOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {actionError}
          </div>
        )}
      </div>


      {/* Admin Add / Edit Form Drawer Card */}
      {isAdmin && isFormOpen && (
        <div className="bg-white border border-[#0066A4]/40 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#17365D]">
                {editingId ? 'Edit Alamat Lokasi Perkuliahan' : 'Tambah Lokasi Perkuliahan Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Isikan alamat dan keterangan lokasi secara manual. Perubahan langsung tersinkronisasi ke seluruh perangkat.
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsFormOpen(false);
                setEditingId(null);
              }}
              aria-label="Tutup formulir"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#17365D] hover:bg-[#F5F7FA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {formError}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Nama Lokasi / Kampus / UPBJJ *
                </label>
                <input
                  type="text"
                  required
                  value={form.namaLokasi}
                  onChange={(e) => setForm((f) => ({ ...f, namaLokasi: e.target.value }))}
                  placeholder="Contoh: Universitas Terbuka Pusat — Gedung Serba Guna"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  LPTK / Unit Penyelenggara Terkait
                </label>
                <input
                  type="text"
                  list="lptk-suggestions"
                  value={form.lptkTerkait}
                  onChange={(e) => setForm((f) => ({ ...f, lptkTerkait: e.target.value }))}
                  placeholder="Contoh: Universitas Terbuka (opsional)"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
                {availableLptks.length > 0 && (
                  <datalist id="lptk-suggestions">
                    {availableLptks.map((lptk) => (
                      <option key={lptk} value={lptk} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17365D] mb-1">
                Alamat Lengkap *
              </label>
              <textarea
                required
                rows={3}
                value={form.alamatLengkap}
                onChange={(e) => setForm((f) => ({ ...f, alamatLengkap: e.target.value }))}
                placeholder="Masukkan alamat jalan, nomor gedung, kelurahan, kecamatan..."
                className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  value={form.kotaKab}
                  onChange={(e) => setForm((f) => ({ ...f, kotaKab: e.target.value }))}
                  placeholder="Contoh: Kota Tangerang Selatan"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={form.provinsi}
                  onChange={(e) => setForm((f) => ({ ...f, provinsi: e.target.value }))}
                  placeholder="Contoh: Banten"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={form.kodePos}
                  onChange={(e) => setForm((f) => ({ ...f, kodePos: e.target.value }))}
                  placeholder="Contoh: 15437"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Gedung / Ruangan
                </label>
                <input
                  type="text"
                  value={form.ruangAtauGedung}
                  onChange={(e) => setForm((f) => ({ ...f, ruangAtauGedung: e.target.value }))}
                  placeholder="Contoh: Gedung Wisma 2, Lantai 3 Ruang 301–305"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17365D] mb-1">
                  Kontak / Narahubung Lokasi
                </label>
                <input
                  type="text"
                  value={form.kontakPenanggungJawab}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kontakPenanggungJawab: e.target.value }))
                  }
                  placeholder="Contoh: Sekretariat PPG UT · (021) 7490941"
                  className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17365D] mb-1">
                Tautan / Alamat Google Maps
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={form.googleMapsUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, googleMapsUrl: e.target.value }))
                  }
                  placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/..."
                  className="flex-1 px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
                />
                {(() => {
                  const previewMaps = getSafeGoogleMapsHref({
                    googleMapsUrl: form.googleMapsUrl,
                    namaLokasi: form.namaLokasi,
                    alamatLengkap: form.alamatLengkap,
                    kotaKab: form.kotaKab,
                    provinsi: form.provinsi,
                    kodePos: form.kodePos,
                  });
                  return (
                    <a
                      href={previewMaps.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>
                        {previewMaps.isDirectPin ? 'Uji Tautan Maps' : 'Cari di Maps'}
                      </span>
                    </a>
                  );
                })()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Opsional. Tempel tautan berbagi Google Maps untuk titik lokasi akurat. Jika dikosongkan, tombol pencarian otomatis menggunakan alamat lengkap di atas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17365D] mb-1">
                Catatan Tambahan
              </label>
              <input
                type="text"
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                placeholder="Contoh: Lokasi orientasi mahasiswa baru & ujian tatap muka"
                className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#0066A4]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-[#F5F7FA] disabled:opacity-50 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:opacity-60 rounded-lg transition-colors"
              >
                {isSaving
                  ? 'Menyimpan ke Cloud...'
                  : editingId
                  ? 'Simpan Perubahan'
                  : 'Simpan Lokasi Perkuliahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Catatan Lokasi Perkuliahan (di atas daftar lokasi) */}
      {isAdmin && isEditingNote ? (
        <div className="bg-white border border-[#0066A4]/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0066A4] shrink-0" />
              <h3 className="text-sm font-bold text-[#17365D]">
                Catatan Lokasi Perkuliahan
              </h3>
            </div>
            <button
              type="button"
              disabled={isSavingNote}
              onClick={() => setIsEditingNote(false)}
              aria-label="Tutup editor catatan"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#17365D] hover:bg-[#F5F7FA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {noteError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {noteError}
            </div>
          )}

          <form onSubmit={handleSaveNote} className="space-y-3">
            <RichTextEditor
              initialValue={noteDraft}
              onChange={setNoteDraft}
              maxHtmlLength={15000}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {hasActiveNote && (
                  <button
                    type="button"
                    disabled={isSavingNote}
                    onClick={handleClearNote}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    Kosongkan Catatan
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingNote}
                  onClick={() => setIsEditingNote(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-[#F5F7FA] disabled:opacity-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:opacity-60 rounded-lg transition-colors"
                >
                  {isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : hasActiveNote ? (
        <div className="bg-[#EAF3F9]/60 border border-[#0066A4]/25 rounded-xl p-5 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0066A4] shrink-0" />
              <h3 className="text-sm font-bold text-[#17365D]">
                Catatan Lokasi Perkuliahan
              </h3>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openNoteEditor}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0066A4] bg-white border border-[#0066A4]/30 hover:bg-[#EAF3F9] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Catatan</span>
              </button>
            )}
          </div>
          <div
            className={`text-[14px] ${RICH_TEXT_VIEW_CLASSES}`}
            dangerouslySetInnerHTML={{ __html: sanitizedActiveNoteHtml }}
          />
          {locationNote?.updatedAt && (
            <div className="text-[11px] text-slate-500 tabular-nums">
              Diperbarui{' '}
              {new Date(locationNote.updatedAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {' · oleh Admin'}
            </div>
          )}
        </div>
      ) : isAdmin ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#17365D]">
                Catatan Lokasi Perkuliahan
              </div>
              <p className="text-[11px] text-slate-500">
                Belum ada catatan. Tambahkan informasi atau pengumuman di atas daftar lokasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNoteEditor}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0066A4] bg-[#EAF3F9] hover:bg-[#dcecf7] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Tulis Catatan</span>
          </button>
        </div>
      ) : null}

      {/* Locations List */}
      {filteredLocations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-[#17365D]">
              {locations.length === 0
                ? 'Belum Ada Alamat Lokasi Perkuliahan'
                : 'Tidak Ada Lokasi yang Cocok'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {locations.length === 0
                ? isAdmin
                  ? 'Klik tombol "Tambah Alamat Lokasi" di atas untuk menambahkan alamat lokasi perkuliahan secara manual.'
                  : 'Admin belum menambahkan alamat lokasi perkuliahan. Silakan login sebagai Admin untuk mengisi alamat lokasi.'
                : 'Coba ubah kata kunci pencarian atau filter provinsi di atas.'}
            </p>
          </div>
          {locations.length === 0 && !isAdmin && (
            <button
              type="button"
              onClick={onRequestAdminLogin}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Login Admin untuk Mengisi Alamat</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLocations.map((loc) => {
            const regionLine = [loc.kotaKab, loc.provinsi, loc.kodePos]
              .filter(Boolean)
              .join(' · ');
            const updatedLabel = new Date(loc.updatedAt).toLocaleDateString('id-ID', {
              dateStyle: 'medium',
            });

            const mapsInfo = getSafeGoogleMapsHref(loc);
            const fullCopyAddress = [
              loc.namaLokasi,
              loc.alamatLengkap,
              regionLine,
            ]
              .filter(Boolean)
              .join(' — ');
            const isAddressCopied = copiedId === `addr_${loc.id}`;
            const isLinkCopied = copiedId === `link_${loc.id}`;

            return (
              <div
                key={loc.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#17365D] leading-snug">
                        {loc.namaLokasi}
                      </h3>
                      {(loc.lptkTerkait || regionLine) && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          {loc.lptkTerkait && (
                            <span className="font-medium text-[#0066A4]">
                              {loc.lptkTerkait}
                            </span>
                          )}
                          {loc.lptkTerkait && regionLine && (
                            <span aria-hidden="true">·</span>
                          )}
                          {regionLine && <span>{regionLine}</span>}
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditForm(loc)}
                          title="Edit alamat lokasi"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#0066A4] hover:bg-[#EAF3F9] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === loc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === loc.id}
                              onClick={() => handleDelete(loc.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded"
                            >
                              {deletingId === loc.id ? '...' : 'Hapus'}
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === loc.id}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(loc.id)}
                            title="Hapus lokasi"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Address block */}
                  <div className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/70 space-y-2 text-xs text-[#17365D]">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#0066A4] shrink-0 mt-0.5" />
                      <p className="leading-relaxed whitespace-pre-line">{loc.alamatLengkap}</p>
                    </div>
                    {mapsInfo.isDirectPin && (
                      <div className="pl-6 text-[11px] text-[#0066A4] truncate">
                        Google Maps:{' '}
                        <a
                          href={mapsInfo.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-[#17365D]"
                        >
                          {mapsInfo.href}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Google Maps & Quick Copy Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={mapsInfo.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>
                        {mapsInfo.isDirectPin ? 'Buka Google Maps' : 'Cari di Google Maps'}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-85" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyText(`addr_${loc.id}`, fullCopyAddress)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#17365D] bg-[#F5F7FA] hover:bg-slate-200/70 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {isAddressCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span className="text-[#16A34A]">Alamat Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Alamat</span>
                        </>
                      )}
                    </button>

                    {mapsInfo.isDirectPin && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(`link_${loc.id}`, mapsInfo.href)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0066A4] bg-[#EAF3F9]/70 hover:bg-[#EAF3F9] border border-[#0066A4]/20 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {isLinkCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                            <span className="text-[#16A34A]">Link Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Link Maps</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Additional details */}
                  {(loc.ruangAtauGedung || loc.kontakPenanggungJawab || loc.catatan) && (
                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      {loc.ruangAtauGedung && (
                        <div className="flex items-start gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{loc.ruangAtauGedung}</span>
                        </div>
                      )}
                      {loc.kontakPenanggungJawab && (
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{loc.kontakPenanggungJawab}</span>
                        </div>
                      )}
                      {loc.catatan && (
                        <div className="flex items-start gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{loc.catatan}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 tabular-nums">
                  Diperbarui {updatedLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
