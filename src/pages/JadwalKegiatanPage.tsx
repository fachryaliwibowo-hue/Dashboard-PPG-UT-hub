import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  Table2,
} from 'lucide-react';

const OFFICIAL_SCHEDULE_PDF_URL =
  '/assets/aistudio/1089_Pengumuman_Penyesuaian_Linimasa_Perkuliahan_PPG_Calon_Guru_Tahun_2026_Gelombang_2_d4dcbf60.pdf';

const OFFICIAL_PDF_FILENAME =
  '1089_Pengumuman_Penyesuaian_Linimasa_Perkuliahan_PPG_Calon_Guru_Tahun_2026_Gelombang_2.pdf';

interface OfficialTimelineRow {
  no: string;
  aktivitas: string;
  tanggal: string;
}

const OFFICIAL_TIMELINE_ROWS: OfficialTimelineRow[] = [
  {
    no: '1.',
    aktivitas: 'Penetapan Peserta PPG Calon Guru Tahun Akademik 2026/2027',
    tanggal: '2 Oktober 2026',
  },
  {
    no: '3.',
    aktivitas: 'Lapor Diri Peserta PPG Calon Guru di LPTK secara daring.',
    tanggal: '17 s.d. 21 November 2026',
  },
  {
    no: '4.',
    aktivitas: 'Matrikulasi secara Luring di LPTK**',
    tanggal: '23 November s.d. 4 Desember 2026',
  },
  {
    no: '5.',
    aktivitas: 'Lapor Diri Peserta PPG Calon Guru secara Luring di LPTK',
    tanggal: '30 November s.d. 4 Desember 2026',
  },
  {
    no: '6.',
    aktivitas: 'Orientasi Peserta PPG Calon Guru Tahun Akademik 2026/2027 secara Luring',
    tanggal: '7 s.d. 8 Desember 2026',
  },
  {
    no: '7.',
    aktivitas: 'Perkuliahan Semester 1 secara Luring Dimulai',
    tanggal: '9 Desember 2026',
  },
];

export const JadwalKegiatanPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'pdf' | 'table'>('pdf');

  return (
    <div className="space-y-6">
      {/* Primary Official PDF Document Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-bold text-[#17365D] leading-snug">
              Pengumuman Penyesuaian Linimasa Perkuliahan PPG Calon Guru Tahun 2026 Gelombang 2
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
              <span>Nomor 1089/B/B2/GT.00.02/2026</span>
              <span aria-hidden="true">·</span>
              <span>Direktorat Pendidikan Profesi Guru Kemendikdasmen</span>
              <span aria-hidden="true">·</span>
              <span>2 Oktober 2026</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center p-1 bg-[#F5F7FA] border border-slate-200 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'pdf'
                    ? 'bg-white text-[#17365D] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-[#17365D]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tampilan PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'table'
                    ? 'bg-white text-[#17365D] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-[#17365D]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Ringkasan Tabel</span>
              </button>
            </div>

            <a
              href={OFFICIAL_SCHEDULE_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#17365D] bg-white border border-slate-200 hover:bg-[#F5F7FA] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab Baru</span>
            </a>

            <a
              href={OFFICIAL_SCHEDULE_PDF_URL}
              download={OFFICIAL_PDF_FILENAME}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </a>
          </div>
        </div>

        {viewMode === 'pdf' ? (
          <div>
            <iframe
              src={`${OFFICIAL_SCHEDULE_PDF_URL}#view=FitH`}
              title="Pengumuman Penyesuaian Linimasa Perkuliahan PPG Calon Guru Tahun 2026 Gelombang 2"
              className="w-full h-[78vh] min-h-[720px] border-0 block bg-slate-100"
            />
            <div className="px-5 py-2.5 bg-[#F5F7FA] border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Jika dokumen PDF tidak tampil otomatis pada peramban seluler, gunakan tombol Ringkasan Tabel atau Unduh PDF di atas.
              </span>
              <a
                href="https://ppg.kemendikdasmen.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0066A4] hover:underline font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>ppg.kemendikdasmen.go.id</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Menindaklanjuti Surat Pengumuman Direktur Jenderal Guru dan Tenaga Kependidikan Nomor 0419/B/B.B2/GT.00.02/2026 tanggal 22 September 2026 perihal Pengumuman Hasil Seleksi PPG Calon Guru Tahun 2026, penyesuaian linimasa perkuliahan PPG Calon Guru Tahun 2026 Gelombang 2 adalah sebagai berikut:
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-slate-200 text-[11px] font-semibold text-[#17365D] uppercase tracking-wide">
                    <th className="py-3 px-4 w-16">No.</th>
                    <th className="py-3 px-4">Aktivitas</th>
                    <th className="py-3 px-4 w-64">Tanggal*</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {OFFICIAL_TIMELINE_ROWS.map((row) => (
                    <tr key={row.no} className="hover:bg-[#F5F7FA]/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#17365D] tabular-nums align-top">
                        {row.no}
                      </td>
                      <td className="py-3 px-4 text-[#17365D] font-medium leading-relaxed">
                        {row.aktivitas}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold tabular-nums whitespace-nowrap align-top">
                        {row.tanggal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-[11px] text-slate-500 leading-relaxed">
              <p>
                *Tanggal sewaktu-waktu dapat berubah dan perubahan jadwal akan disampaikan pada laman{' '}
                <a
                  href="https://ppg.kemendikdasmen.go.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0066A4] hover:underline font-medium"
                >
                  https://ppg.kemendikdasmen.go.id
                </a>
              </p>
              <p>
                **Khusus bagi mahasiswa dengan latar belakang non-kependidikan atau yang berbeda dengan bidang studi yang dituju
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
