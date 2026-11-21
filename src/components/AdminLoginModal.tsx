import React, { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { AlertCircle, LogIn, ShieldCheck, X } from 'lucide-react';
import { checkIsUserAdmin } from '../engine/cloudSync';
import { auth, googleProvider } from '../firebase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isAdmin = await checkIsUserAdmin(result.user);
      if (isAdmin) {
        onLoginSuccess();
      } else {
        const email = result.user.email ?? 'Akun tidak diketahui';
        await signOut(auth);
        setErrorMsg(
          `Akun Google (${email}) belum terdaftar sebagai Admin. Hubungi Admin utama untuk menambahkan email tersebut melalui menu Data Management → Daftar Admin.`
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal melakukan login Google.';
      if (message.includes('auth/popup-closed-by-user')) {
        setErrorMsg('Jendela login Google ditutup sebelum proses selesai.');
      } else {
        setErrorMsg(`Login Admin gagal: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17365D]/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#17365D] text-white px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0066A4] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 id="admin-login-title" className="text-sm font-bold leading-tight">
                Login Pengelola Data (Admin)
              </h2>
              <p className="text-[11px] text-slate-300">
                PPG UT — Participant Data Dashboard
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog login"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Masuk menggunakan akun Google Admin resmi untuk mengunggah database Excel ke cloud, mengelola lokasi perkuliahan, dan mengakses seluruh fitur ekspor. Setiap data yang Anda unggah otomatis tersinkronisasi ke seluruh perangkat.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-1 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] disabled:opacity-60 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Memverifikasi Akun...' : 'Masuk dengan Akun Google Admin'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-[#F5F7FA] rounded-lg transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
