import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Eye,
  FileDown,
  Globe2,
  GraduationCap,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  ShieldCheck,
  Table2,
  UserCheck,
  X,
} from 'lucide-react';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DataOnboardingUpload } from './components/DataOnboardingUpload';
import { computeAnalytics } from './engine/analyticsEngine';
import {
  CloudDataset,
  checkIsUserAdmin,
  clearDatasetInCloud,
  deleteLocationFromCloud,
  ensurePublicAnalyticsSynced,
  logAdminAction,
  publishDatasetToCloud,
  saveLocationNoteToCloud,
  saveLocationToCloud,
  savePrivacyConfigToCloud,
  subscribeToActiveDataset,
  subscribeToAuditLogs,
  subscribeToDatasetHistory,
  subscribeToLocationNote,
  subscribeToLocations,
  subscribeToPrivacyConfig,
  subscribeToPublicAnalytics,
} from './engine/cloudSync';
import {
  INITIAL_FILTERS,
  applyFilters,
  extractFilterOptions,
} from './engine/filteringEngine';
import { auth } from './firebase';
import { AnalisisDemografiPage } from './pages/AnalisisDemografiPage';
import { AnalisisMatrikulasiPage } from './pages/AnalisisMatrikulasiPage';
import { CekPenempatanPage } from './pages/CekPenempatanPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { DatabasePesertaPage } from './pages/DatabasePesertaPage';
import { ExecutiveOverviewPage } from './pages/ExecutiveOverviewPage';
import { ExportReportsPage } from './pages/ExportReportsPage';
import { JadwalKegiatanPage } from './pages/JadwalKegiatanPage';
import { LokasiPerkuliahanPage } from './pages/LokasiPerkuliahanPage';
import { MonitoringLptkPage } from './pages/MonitoringLptkPage';
import {
  AuditLogEntry,
  DatasetHistoryEntry,
  GlobalFilters,
  LectureLocation,
  LocationPageNote,
  NavPageId,
  ParsedExcelPreview,
  PrivacyConfig,
  UserRole,
} from './types/participant';

interface NavSubItem {
  id: NavPageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  id: NavPageId | 'overview-group' | 'info-perkuliahan';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  isGroupOnly?: boolean;
  children?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview-group',
    label: 'Statistik & Analisis',
    icon: BarChart3,
    isGroupOnly: true,
    children: [
      { id: 'overview', label: 'Ringkasan Utama', icon: BarChart3 },
      { id: 'lptk', label: 'Monitoring LPTK', icon: Building2 },
      { id: 'demografi', label: 'Analisis Demografi', icon: Globe2 },
      { id: 'matrikulasi', label: 'Analisis Matrikulasi', icon: ClipboardCheck },
    ],
  },
  {
    id: 'info-perkuliahan',
    label: 'Info Perkuliahan',
    icon: BookOpen,
    isGroupOnly: true,
    children: [
      { id: 'jadwal-kegiatan', label: 'Jadwal Kegiatan', icon: CalendarClock },
      { id: 'lokasi-perkuliahan', label: 'Lokasi Perkuliahan', icon: MapPin },
    ],
  },
  { id: 'cek-penempatan', label: 'Cek Penempatan', icon: UserCheck },
  { id: 'database', label: 'Database Peserta', icon: Table2, adminOnly: true },
  { id: 'data-management', label: 'Data Management', icon: Database, adminOnly: true },
  { id: 'export-reports', label: 'Export & Reports', icon: FileDown },
];

export default function App() {
  const [dataset, setDataset] = useState<CloudDataset | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [authResolved, setAuthResolved] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [activePage, setActivePage] = useState<NavPageId>('overview');
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'overview-group': true,
    'info-perkuliahan': false,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (activePage === 'jadwal-kegiatan' || activePage === 'lokasi-perkuliahan') {
      setOpenMenus((prev) => ({ ...prev, 'info-perkuliahan': true }));
    } else if (
      activePage === 'overview' ||
      activePage === 'lptk' ||
      activePage === 'demografi' ||
      activePage === 'matrikulasi'
    ) {
      setOpenMenus((prev) => ({ ...prev, 'overview-group': true }));
    }
  }, [activePage]);

  const [locations, setLocations] = useState<LectureLocation[]>([]);
  const [locationNote, setLocationNote] = useState<LocationPageNote | null>(null);
  const [privacyConfig, setPrivacyConfig] = useState<PrivacyConfig>({
    maskPtkId: true,
    maskAkunSimpkb: true,
    updatedAt: '',
  });
  const [datasetHistory, setDatasetHistory] = useState<DatasetHistoryEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessBanner, setUploadSuccessBanner] = useState<{
    uniqueCount: number;
    totalRows: number;
  } | null>(null);

  useEffect(() => {
    if (!uploadSuccessBanner) return;
    const timer = window.setTimeout(() => {
      setUploadSuccessBanner(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [uploadSuccessBanner]);

  const [filters, setFilters] = useState<GlobalFilters>(INITIAL_FILTERS);
  const [selectedMonitorLptk, setSelectedMonitorLptk] = useState<string>('');
  const [selectedDemografiLptk, setSelectedDemografiLptk] = useState<string>('');

  // Keep Firebase Auth admin status synchronized across sessions & devices
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdminAuthenticated(false);
        setUserRole('user');
        setActivePage((prev) =>
          prev === 'data-management' || prev === 'database' ? 'overview' : prev
        );
        setAuthResolved(true);
        return;
      }

      try {
        const isAdmin = await checkIsUserAdmin(user);
        setIsAdminAuthenticated(isAdmin);
        if (isAdmin) {
          setUserRole('admin');
        } else {
          setUserRole('user');
          setActivePage((prev) =>
            prev === 'data-management' || prev === 'database' ? 'overview' : prev
          );
        }
      } catch {
        setIsAdminAuthenticated(false);
        setUserRole('user');
        setActivePage((prev) =>
          prev === 'data-management' || prev === 'database' ? 'overview' : prev
        );
      } finally {
        setAuthResolved(true);
      }
    });

    return unsubscribe;
  }, []);

  // Subscribe to dataset: verified Admin receives full dataset (and auto-syncs zero-PII public layer),
  // whereas public User Mode strictly receives zero-PII anonymized analytics only.
  useEffect(() => {
    if (!authResolved) return;

    const subscriber = isAdminAuthenticated
      ? subscribeToActiveDataset
      : subscribeToPublicAnalytics;

    const unsubDataset = subscriber(
      (cloudData) => {
        setDataset(cloudData);
        setCloudError(null);
        if (isAdminAuthenticated && cloudData && auth.currentUser) {
          void ensurePublicAnalyticsSynced(cloudData, auth.currentUser);
        }
      },
      (loading) => {
        setIsCloudSyncing(loading);
        if (!loading) {
          setIsHydrating(false);
        }
      },
      (err) => {
        setCloudError(err.message);
        setIsHydrating(false);
        setIsCloudSyncing(false);
      }
    );

    return () => {
      unsubDataset();
    };
  }, [authResolved, isAdminAuthenticated]);

  // Subscribe to shared public Firestore reference collections across all devices
  useEffect(() => {
    const unsubLocations = subscribeToLocations(
      (cloudLocs) => setLocations(cloudLocs),
      (err) => setCloudError(err.message)
    );

    const unsubLocationNote = subscribeToLocationNote(
      (note) => setLocationNote(note),
      (err) => setCloudError(err.message)
    );

    const unsubPrivacy = subscribeToPrivacyConfig(
      (cfg) => setPrivacyConfig(cfg),
      (err) => setCloudError(err.message)
    );

    return () => {
      unsubLocations();
      unsubLocationNote();
      unsubPrivacy();
    };
  }, []);

  // Subscribe to Admin-only Dataset History & Audit Logs when authenticated as Admin
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setDatasetHistory([]);
      setAuditLogs([]);
      return;
    }

    const unsubHistory = subscribeToDatasetHistory(
      (items) => setDatasetHistory(items),
      (err) => setCloudError(err.message)
    );
    const unsubLogs = subscribeToAuditLogs(
      (items) => setAuditLogs(items),
      (err) => setCloudError(err.message)
    );

    return () => {
      unsubHistory();
      unsubLogs();
    };
  }, [isAdminAuthenticated]);

  const handleSaveLocation = useCallback(
    async (
      locationId: string,
      payload: Omit<LectureLocation, 'id' | 'updatedAt'>,
      isUpdate: boolean
    ) => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Sesi login Admin tidak aktif. Silakan login ulang.');
      }
      await saveLocationToCloud(locationId, payload, user.uid, isUpdate);
      await logAdminAction(
        user,
        isUpdate ? 'UBAH_LOKASI' : 'TAMBAH_LOKASI',
        `${isUpdate ? 'Memperbarui' : 'Menambahkan'} lokasi perkuliahan "${payload.namaLokasi}"`
      );
    },
    []
  );

  const handleDeleteLocation = useCallback(async (locationId: string) => {
    await deleteLocationFromCloud(locationId);
    await logAdminAction(
      auth.currentUser,
      'HAPUS_LOKASI',
      'Menghapus entri lokasi perkuliahan'
    );
  }, []);

  const handleSaveLocationNote = useCallback(
    async (noteText: string) => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Sesi login Admin tidak aktif. Silakan login ulang.');
      }
      await saveLocationNoteToCloud(noteText, user, Boolean(locationNote));
      await logAdminAction(
        user,
        'UBAH_CATATAN_LOKASI',
        noteText.trim()
          ? 'Memperbarui catatan pada halaman Lokasi Perkuliahan'
          : 'Mengosongkan catatan pada halaman Lokasi Perkuliahan'
      );
    },
    [locationNote]
  );


  const handleSavePrivacyConfig = useCallback(
    async (config: { maskPtkId: boolean; maskAkunSimpkb: boolean }) => {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Sesi login Admin tidak aktif. Silakan login ulang.');
      }
      await savePrivacyConfigToCloud(
        config,
        user.uid,
        Boolean(privacyConfig.updatedAt)
      );
      await logAdminAction(
        user,
        'UBAH_PRIVASI',
        `Privasi Mode User: Samarkan PTK ID (${config.maskPtkId ? 'Aktif' : 'Nonaktif'}), Samarkan SIMPKB (${config.maskAkunSimpkb ? 'Aktif' : 'Nonaktif'})`
      );
    },
    [privacyConfig.updatedAt]
  );

  const handleRoleChange = useCallback(
    (nextRole: UserRole) => {
      if (nextRole === 'admin' && !isAdminAuthenticated) {
        setLoginModalOpen(true);
        return;
      }
      setUserRole(nextRole);
      if (
        nextRole === 'user' &&
        (activePage === 'data-management' || activePage === 'database')
      ) {
        setActivePage('overview');
      }
      if (nextRole === 'user') {
        setUploadSuccessBanner(null);
      }
    },
    [activePage, isAdminAuthenticated]
  );

  const handleLoginSuccess = useCallback(() => {
    setIsAdminAuthenticated(true);
    setUserRole('admin');
    setLoginModalOpen(false);
  }, []);

  const handleLogoutAdmin = useCallback(async () => {
    await signOut(auth);
    setIsAdminAuthenticated(false);
    setUserRole('user');
    setUploadSuccessBanner(null);
    if (activePage === 'data-management' || activePage === 'database') {
      setActivePage('overview');
    }
  }, [activePage]);

  const handleConfirmImport = useCallback(async (preview: ParsedExcelPreview) => {
    const user = auth.currentUser;
    if (!user) {
      const msg = 'Sesi login Admin tidak aktif. Silakan login ulang.';
      setUploadError(msg);
      throw new Error(msg);
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccessBanner(null);
    try {
      const published = await publishDatasetToCloud(preview, user, (pct) => {
        setUploadProgress(pct);
      });
      await logAdminAction(
        user,
        'UNGGAH_DATASET',
        `Mempublikasikan dataset (${published.validation.validUniquePtkCount.toLocaleString('id-ID')} PTK unik dari ${published.records.length.toLocaleString('id-ID')} baris)`
      );
      setDataset(published);
      setFilters(INITIAL_FILTERS);
      setSelectedMonitorLptk('');
      setSelectedDemografiLptk('');
      setActivePage('overview');
      setUploadSuccessBanner({
        uniqueCount: published.validation.validUniquePtkCount,
        totalRows: published.records.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mengunggah database ke cloud. Silakan coba lagi.';
      setUploadError(msg);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, []);

  const handleClearDataset = useCallback(async () => {
    await clearDatasetInCloud();
    await logAdminAction(
      auth.currentUser,
      'HAPUS_DATASET',
      'Mengosongkan database peserta aktif dari cloud'
    );
    setDataset(null);
    setFilters(INITIAL_FILTERS);
    setSelectedMonitorLptk('');
    setSelectedDemografiLptk('');
  }, []);

  const handleUpdateFilter = useCallback(
    <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleToggleFilterValue = useCallback(
    (
      key:
        | 'lptk'
        | 'bidangStudi'
        | 'jenisKelamin'
        | 'provinsi'
        | 'kotaKab'
        | 'statusMatrikulasi',
      value: string
    ) => {
      setFilters((prev) => {
        const current = prev[key];
        const exists = current.includes(value);
        const nextArr = exists
          ? current.filter((item) => item !== value)
          : [...current, value];
        return {
          ...prev,
          [key]: nextArr,
        };
      });
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const handleInspectQualityInDatabase = useCallback(
    (qualityMode: 'duplicate_ptk' | 'empty_ptk') => {
      setFilters({
        ...INITIAL_FILTERS,
        qualityFilter: qualityMode,
      });
      setActivePage('database');
    },
    []
  );

  const allRecords = dataset?.records ?? [];

  const filterOptions = useMemo(
    () => extractFilterOptions(allRecords, filters.provinsi),
    [allRecords, filters.provinsi]
  );

  const filteredRecords = useMemo(
    () => applyFilters(allRecords, filters),
    [allRecords, filters]
  );

  const analytics = useMemo(
    () => computeAnalytics(filteredRecords),
    [filteredRecords]
  );

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || userRole === 'admin'),
    [userRole]
  );

  const activeNavTitle = useMemo(() => {
    for (const item of visibleNavItems) {
      if (item.id === activePage) return item.label;
      const child = item.children?.find((sub) => sub.id === activePage);
      if (child) return child.label;
    }
    return 'Ringkasan Utama';
  }, [visibleNavItems, activePage]);

  const RoleSwitcher = (variant: 'dark' | 'light') => {
    const isDark = variant === 'dark';
    return (
      <div
        role="group"
        aria-label="Mode Tampilan"
        className={`inline-flex items-center p-1 rounded-lg border text-xs ${
          isDark
            ? 'bg-white/10 border-white/15'
            : 'bg-[#F5F7FA] border-slate-200'
        }`}
      >
        <button
          type="button"
          onClick={() => handleRoleChange('user')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
            userRole === 'user'
              ? isDark
                ? 'bg-white text-[#17365D] font-semibold'
                : 'bg-white text-[#17365D] font-semibold shadow-xs'
              : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-600 hover:text-[#17365D]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>User</span>
        </button>
        <button
          type="button"
          onClick={() => handleRoleChange('admin')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
            userRole === 'admin'
              ? isDark
                ? 'bg-[#0066A4] text-white font-semibold'
                : 'bg-[#17365D] text-white font-semibold shadow-xs'
              : isDark
              ? 'text-slate-200 hover:text-white'
              : 'text-slate-600 hover:text-[#17365D]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>
    );
  };

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#17365D] text-white flex items-center justify-center mx-auto">
            <GraduationCap className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-[#17365D]">
            Menghubungkan & menyinkronkan data PPG UT dari Cloud...
          </p>
        </div>
      </div>
    );
  }

  const formattedUpdated = dataset
    ? new Date(dataset.metadata.uploadedAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#17365D] text-white">
      {/* Brand Block */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066A4] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight leading-tight">
              PPG UT
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              Participant Data Dashboard
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-300/90 leading-relaxed">
          Integrated Data Monitoring for Better Academic Management.
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigasi Utama">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = Boolean(item.children && item.children.length > 0);
          const isChildActive = Boolean(
            item.children?.some((sub) => sub.id === activePage)
          );
          const isActive = activePage === item.id;

          if (hasChildren && item.children) {
            const isExpanded = Boolean(openMenus[item.id]);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenus((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    isChildActive
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white font-medium'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-3 border-l border-white/15 space-y-1 pt-0.5 pb-1">
                        {item.children.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = activePage === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                setActivePage(sub.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 whitespace-nowrap ${
                                isSubActive
                                  ? 'bg-[#0066A4] text-white font-semibold shadow-xs'
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sub.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActivePage(item.id as NavPageId);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#0066A4] text-white font-semibold'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Role Summary in Sidebar Footer */}
      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-slate-300">
        <div>
          <div className="font-semibold text-white">
            {userRole === 'admin' ? 'Mode Admin · Pengelola Data' : 'Mode User · Hanya Lihat Data'}
          </div>
          {isAdminAuthenticated && (
            <div className="text-[10px] text-slate-300/90 truncate">
              Admin Terverifikasi
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMissingDatasetContent = () => {
    if (userRole === 'admin' && isAdminAuthenticated) {
      return (
        <DataOnboardingUpload
          isInitialOnboarding
          onConfirmImport={handleConfirmImport}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
        />
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl mx-auto mt-8 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#EAF3F9] text-[#0066A4] flex items-center justify-center mx-auto">
          <Database className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-[#17365D]">
            Database Peserta Belum Tersedia
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pada tampilan User, Anda hanya dapat melihat dan memantau data yang telah diunggah oleh pengelola ke cloud. Anda tetap dapat membuka menu Jadwal Kegiatan atau Lokasi Perkuliahan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleRoleChange('admin')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0066A4] hover:bg-[#17365D] rounded-lg transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Login Admin (Pengelola Data)</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#17365D]/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-200 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka menu navigasi"
                className="lg:hidden p-2 rounded-lg border border-slate-200 text-[#17365D] hover:bg-[#F5F7FA]"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-[#17365D] truncate">
                  {activeNavTitle}
                </h1>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 truncate">
                  <span>PPG UT — Participant Data Dashboard</span>
                  {dataset && formattedUpdated ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Diperbarui {formattedUpdated}</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Belum ada database Excel</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {RoleSwitcher('light')}

              {userRole === 'admin' && isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  title="Logout dari Mode Admin"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logout Admin</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          <AnimatePresence>
            {uploadSuccessBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                role="status"
                aria-live="polite"
                className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-xs text-emerald-950"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-[#16A34A]">
                      Dataset baru berhasil diunggah dan dipublikasikan.
                    </span>{' '}
                    <span className="text-emerald-900 tabular-nums">
                      Memuat {uploadSuccessBanner.uniqueCount.toLocaleString('id-ID')} peserta unik (
                      {uploadSuccessBanner.totalRows.toLocaleString('id-ID')} baris data) beserta lapisan analitik publik.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadSuccessBanner(null)}
                  aria-label="Tutup notifikasi"
                  className="p-1 text-emerald-700 hover:bg-emerald-100 rounded shrink-0 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {isCloudSyncing && (
            <div className="bg-[#EAF3F9] border border-[#0066A4]/25 rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs text-[#17365D]">
              <RefreshCw className="w-3.5 h-3.5 text-[#0066A4] animate-spin shrink-0" />
              <span>Menyinkronkan pembaruan database terbaru dari Cloud...</span>
            </div>
          )}

          {cloudError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3 text-xs text-red-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Gangguan Sinkronisasi Cloud: </span>
                  <span className="break-words">{cloudError}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloudError(null)}
                aria-label="Tutup pesan"
                className="p-1 text-red-700 hover:bg-red-100 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activePage}:${dataset ? 'ready' : 'empty'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {activePage === 'lokasi-perkuliahan' ? (
                <LokasiPerkuliahanPage
                  locations={locations}
                  locationNote={locationNote}
                  userRole={userRole}
                  isAdminAuthenticated={isAdminAuthenticated}
                  availableLptks={filterOptions.lptk.map((o) => o.value)}
                  onSaveLocation={handleSaveLocation}
                  onDeleteLocation={handleDeleteLocation}
                  onSaveLocationNote={handleSaveLocationNote}
                  onRequestAdminLogin={() => setLoginModalOpen(true)}
                />
              ) : activePage === 'jadwal-kegiatan' ? (
                <JadwalKegiatanPage />
              ) : activePage === 'data-management' && userRole === 'admin' && isAdminAuthenticated ? (
                <DataManagementPage
                  metadata={dataset?.metadata ?? null}
                  validation={dataset?.validation ?? null}
                  allRecords={allRecords}
                  uploadedByEmail={dataset?.uploadedByEmail}
                  privacyConfig={privacyConfig}
                  datasetHistory={datasetHistory}
                  auditLogs={auditLogs}
                  onSavePrivacyConfig={handleSavePrivacyConfig}
                  onReplaceDataset={handleConfirmImport}
                  onClearDataset={handleClearDataset}
                  onInspectInDatabase={handleInspectQualityInDatabase}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadError={uploadError}
                />
              ) : !dataset ? (
                renderMissingDatasetContent()
              ) : (
                <>
                  {activePage === 'overview' && (
                    <ExecutiveOverviewPage
                      analytics={analytics}
                      filters={filters}
                      filterOptions={filterOptions}
                      totalDatasetUnique={dataset.validation.validUniquePtkCount}
                      onUpdateFilter={handleUpdateFilter}
                      onToggleFilterValue={handleToggleFilterValue}
                      onResetFilters={handleResetFilters}
                    />
                  )}

                  {activePage === 'lptk' && (
                    <MonitoringLptkPage
                      allRecords={allRecords}
                      lptkOptions={filterOptions.lptk}
                      selectedLptk={selectedMonitorLptk}
                      onSelectLptk={setSelectedMonitorLptk}
                    />
                  )}

                  {activePage === 'demografi' && (
                    <AnalisisDemografiPage
                      allRecords={allRecords}
                      lptkOptions={filterOptions.lptk}
                      selectedLptk={selectedDemografiLptk}
                      onSelectLptk={setSelectedDemografiLptk}
                    />
                  )}

                  {activePage === 'matrikulasi' && (
                    <AnalisisMatrikulasiPage
                      allRecords={allRecords}
                      lptkOptions={filterOptions.lptk}
                      bidangStudiOptions={filterOptions.bidangStudi}
                    />
                  )}

                  {activePage === 'cek-penempatan' && (
                    <CekPenempatanPage
                      allRecords={allRecords}
                      activeRevisionId={dataset.revisionId}
                      locations={locations}
                      userRole={userRole}
                      privacyConfig={privacyConfig}
                      onNavigateToPage={(target) => setActivePage(target)}
                    />
                  )}

                  {activePage === 'database' &&
                    userRole === 'admin' &&
                    isAdminAuthenticated && (
                      <DatabasePesertaPage
                        filteredRecords={filteredRecords}
                        filters={filters}
                        filterOptions={filterOptions}
                        totalDatasetUnique={dataset.validation.validUniquePtkCount}
                        totalFilteredUnique={analytics.totalPesertaUnik}
                        userRole={userRole}
                        privacyConfig={privacyConfig}
                        onUpdateFilter={handleUpdateFilter}
                        onResetFilters={handleResetFilters}
                      />
                    )}

                  {activePage === 'export-reports' && (
                    <ExportReportsPage
                      allRecords={allRecords}
                      filteredRecords={filteredRecords}
                      metadata={dataset.metadata}
                      filters={filters}
                      userRole={userRole}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
