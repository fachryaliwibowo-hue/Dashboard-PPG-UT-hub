import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  db,
  handleFirestoreError,
} from '../firebase';
import {
  AuditLogEntry,
  DatasetHistoryEntry,
  DatasetMetadata,
  ExpectedColumnKey,
  GenderCategory,
  LectureLocation,
  LocationPageNote,
  ParsedExcelPreview,
  ParticipantRecord,
  PrivacyConfig,
  PublicPlacementResult,
  ValidationReport,
} from '../types/participant';
import { computeAnalytics } from './analyticsEngine';
import { RawInputRow, validateAndBuildRecords } from './dataValidation';
import {
  buildAnonymizedPtkToken,
  buildPlacementLookupId,
  maskAkunSimpkb,
  maskPtkId,
} from './privacyMasking';
import { isRichTextEmpty, sanitizeRichHtml } from './richTextSanitizer';

const CHUNK_SIZE = 350;

export interface CloudDataset {
  revisionId: string;
  metadata: DatasetMetadata;
  records: ParticipantRecord[];
  validation: ValidationReport;
  uploadedByEmail: string;
}

export interface AdminMemberRecord {
  id: string;
  email: string;
  addedByUid: string;
  createdAt: string;
}

interface CompactRowPayload {
  r: number; // excelRowNumber
  n: string; // no
  p: string; // ptkId
  s: string; // akunSimpkb
  nm: string; // namaPeserta
  jk: string; // jenisKelamin
  kk: string; // kotaKab
  pr: string; // provinsi
  lp: string; // lptk
  bs: string; // bidangStudi
  sm: string; // statusMatrikulasi
}

interface CloudDatasetMetaDoc {
  isPublic: boolean;
  revisionId: string;
  fileName: string;
  fileSize: number;
  sheetName: string;
  availableSheets: string[];
  uploadedAt: string;
  uploadedByUid: string;
  uploadedByEmail: string;
  totalRows: number;
  chunkCount: number;
  matchedHeaders: Record<ExpectedColumnKey, string | null>;
  missingRequiredHeaders: string[];
  extraHeaders: string[];
}

export function toSafeEmailId(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
}

export async function checkIsUserAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.email || !user.emailVerified) {
    return false;
  }
  if (user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const safeId = toSafeEmailId(user.email);
  const path = `admins/${safeId}`;
  try {
    const snap = await getDoc(doc(db, 'admins', safeId));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function listAuthorizedAdmins(): Promise<AdminMemberRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, path));
    const list: AdminMemberRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as {
        email?: string;
        addedByUid?: string;
        createdAt?: Timestamp;
      };
      list.push({
        id: docSnap.id,
        email: data.email ?? '',
        addedByUid: data.addedByUid ?? '',
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      });
    });
    return list.sort((a, b) => a.email.localeCompare(b.email));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addAuthorizedAdmin(
  email: string,
  addedByUid: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const safeId = toSafeEmailId(normalized);
  const path = `admins/${safeId}`;
  try {
    await setDoc(doc(db, 'admins', safeId), {
      email: normalized,
      addedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAuthorizedAdmin(adminId: string): Promise<void> {
  const path = `admins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

function toCompactRow(r: ParticipantRecord): CompactRowPayload {
  return {
    r: r.excelRowNumber,
    n: r.no,
    p: r.ptkId,
    s: r.akunSimpkb,
    nm: r.namaPeserta,
    jk: r.jenisKelamin,
    kk: r.kotaKab,
    pr: r.provinsi,
    lp: r.lptk,
    bs: r.bidangStudi,
    sm: r.statusMatrikulasi,
  };
}

function fromCompactRow(c: CompactRowPayload): RawInputRow {
  return {
    excelRowNumber: c.r ?? 0,
    values: {
      no: c.n ?? '',
      ptkId: c.p ?? '',
      akunSimpkb: c.s ?? '',
      namaPeserta: c.nm ?? '',
      jenisKelamin: c.jk ?? '',
      kotaKab: c.kk ?? '',
      provinsi: c.pr ?? '',
      lptk: c.lp ?? '',
      bidangStudi: c.bs ?? '',
      statusMatrikulasi: c.sm ?? '',
    },
  };
}

interface PublicAnalyticsRowPayload {
  tk: string; // anonymized SHA-256 token for deduplication only
  jk: string; // normJenisKelamin
  gc: GenderCategory;
  kk: string; // normKotaKab
  pr: string; // normProvinsi
  lp: string; // normLptk
  bs: string; // normBidangStudi
  sm: string; // normStatusMatrikulasi
  em: boolean; // isPtkEmpty
  dp: boolean; // isPtkDuplicate
}

interface PublicAnalyticsMetaDoc {
  isPublic: boolean;
  revisionId: string;
  uploadedAt: string;
  totalRows: number;
  validUniquePtkCount: number;
  chunkCount: number;
}

const syncingPublicRevisions = new Set<string>();

async function publishPlacementLookup(
  revisionId: string,
  records: ParticipantRecord[],
  user: User
): Promise<void> {
  // Write hashed exact-match placement lookup documents (PTK ID & SIMPKB pre-masked; full participant name preserved)
  const lookupMap = new Map<string, Omit<PublicPlacementResult, 'revisionId'>>();
  for (const r of records) {
    const entry: Omit<PublicPlacementResult, 'revisionId'> = {
      maskedPtkId: maskPtkId(r.ptkId, true).slice(0, 120),
      maskedSimpkb: maskAkunSimpkb(r.akunSimpkb, true).slice(0, 200),
      maskedName: r.namaPeserta.trim().slice(0, 200),
      jenisKelamin: r.jenisKelamin.slice(0, 60),
      kotaKab: r.kotaKab.slice(0, 150),
      provinsi: r.provinsi.slice(0, 150),
      lptk: r.lptk.slice(0, 200),
      bidangStudi: r.bidangStudi.slice(0, 200),
      statusMatrikulasi: r.statusMatrikulasi.slice(0, 150),
    };

    if (r.normPtkId) {
      const ptkKey = await buildPlacementLookupId('ptk', r.normPtkId);
      if (!lookupMap.has(ptkKey)) {
        lookupMap.set(ptkKey, entry);
      }
    }
    if (r.normAkunSimpkb) {
      const simpkbKey = await buildPlacementLookupId('simpkb', r.normAkunSimpkb);
      if (!lookupMap.has(simpkbKey)) {
        lookupMap.set(simpkbKey, entry);
      }
    }
  }

  const lookupEntries = Array.from(lookupMap.entries());
  const LOOKUP_BATCH_SIZE = 300;
  for (let i = 0; i < lookupEntries.length; i += LOOKUP_BATCH_SIZE) {
    const batch = writeBatch(db);
    const slice = lookupEntries.slice(i, i + LOOKUP_BATCH_SIZE);
    for (const [lookupId, entry] of slice) {
      batch.set(doc(db, 'placement_lookup', lookupId), {
        isPublic: true,
        revisionId,
        ...entry,
        updatedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `placement_lookup/batch_${i}`);
    }
  }
}

async function publishPublicLayers(
  revisionId: string,
  uploadedAt: string,
  records: ParticipantRecord[],
  validUniquePtkCount: number,
  user: User
): Promise<void> {
  // 1. Build zero-PII anonymized analytics rows
  const publicRows: PublicAnalyticsRowPayload[] = await Promise.all(
    records.map(async (r) => ({
      tk: r.isPtkEmpty ? '' : await buildAnonymizedPtkToken(r.normPtkId),
      jk: r.normJenisKelamin,
      gc: r.genderCategory,
      kk: r.normKotaKab,
      pr: r.normProvinsi,
      lp: r.normLptk,
      bs: r.normBidangStudi,
      sm: r.normStatusMatrikulasi,
      em: r.isPtkEmpty,
      dp: r.isPtkDuplicate,
    }))
  );

  const totalPublicChunks = Math.ceil(publicRows.length / CHUNK_SIZE);
  for (let i = 0; i < totalPublicChunks; i += 2) {
    const batch = writeBatch(db);
    const endIdx = Math.min(i + 2, totalPublicChunks);
    for (let j = i; j < endIdx; j++) {
      const slice = publicRows.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, 'public_analytics', 'active', 'chunks', `${revisionId}_${j}`);
      batch.set(chunkRef, {
        isPublic: true,
        revisionId,
        chunkIndex: j,
        updatedByUid: user.uid,
        rows: slice,
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `public_analytics/active/chunks/${revisionId}_${i}`
      );
    }
  }

  // 2. Write hashed exact-match placement lookup documents
  await publishPlacementLookup(revisionId, records, user);

  // 3. Publish anonymized public analytics meta pointer
  try {
    await setDoc(doc(db, 'public_analytics', 'active'), {
      isPublic: true,
      revisionId,
      uploadedAt,
      totalRows: records.length,
      validUniquePtkCount,
      chunkCount: totalPublicChunks,
      updatedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'public_analytics/active');
  }
}

export async function ensurePublicAnalyticsSynced(
  dataset: CloudDataset,
  user: User
): Promise<void> {
  if (syncingPublicRevisions.has(dataset.revisionId)) return;
  syncingPublicRevisions.add(dataset.revisionId);
  try {
    const snap = await getDoc(doc(db, 'public_analytics', 'active'));
    const existingRev = snap.exists()
      ? (snap.data() as Partial<PublicAnalyticsMetaDoc>).revisionId
      : null;
    if (existingRev === dataset.revisionId) {
      const sampleRecord = dataset.records.find(
        (r) => (r.normPtkId || r.normAkunSimpkb) && r.namaPeserta.trim().length > 2
      );
      if (!sampleRecord) {
        return;
      }
      const sampleKey = sampleRecord.normPtkId
        ? await buildPlacementLookupId('ptk', sampleRecord.normPtkId)
        : await buildPlacementLookupId('simpkb', sampleRecord.normAkunSimpkb);
      const sampleSnap = await getDoc(doc(db, 'placement_lookup', sampleKey));
      if (
        sampleSnap.exists() &&
        (sampleSnap.data() as Partial<PublicPlacementResult>).revisionId === dataset.revisionId &&
        (sampleSnap.data() as Partial<PublicPlacementResult>).maskedName ===
          sampleRecord.namaPeserta.trim().slice(0, 200)
      ) {
        return;
      }
      await publishPlacementLookup(dataset.revisionId, dataset.records, user);
      return;
    }
    await publishPublicLayers(
      dataset.revisionId,
      dataset.metadata.uploadedAt,
      dataset.records,
      dataset.validation.validUniquePtkCount,
      user
    );
  } catch {
    // Non-blocking auto-sync
  } finally {
    syncingPublicRevisions.delete(dataset.revisionId);
  }
}

export async function publishDatasetToCloud(
  preview: ParsedExcelPreview,
  user: User,
  onProgress?: (percent: number) => void
): Promise<CloudDataset> {
  const revisionId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const compactRows = preview.records.map(toCompactRow);
  const totalChunks = Math.ceil(compactRows.length / CHUNK_SIZE);

  // 1. Write private admin-only raw chunks
  for (let i = 0; i < totalChunks; i += 2) {
    const batch = writeBatch(db);
    const endIdx = Math.min(i + 2, totalChunks);
    for (let j = i; j < endIdx; j++) {
      const slice = compactRows.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
      const chunkId = `${revisionId}_${j}`;
      const chunkRef = doc(db, 'datasets', 'active', 'chunks', chunkId);
      batch.set(chunkRef, {
        isPublic: false,
        revisionId,
        chunkIndex: j,
        uploadedByUid: user.uid,
        rows: slice,
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `datasets/active/chunks/${revisionId}_${i}`
      );
    }
    if (onProgress && totalChunks > 0) {
      onProgress(Math.round((endIdx / (totalChunks + 2)) * 100));
    }
  }

  // 2. Atomically publish private admin-only active dataset metadata pointer
  const metaPath = 'datasets/active';
  const uploadedByEmail = user.email ?? '';
  try {
    await setDoc(doc(db, 'datasets', 'active'), {
      isPublic: false,
      revisionId,
      fileName: preview.metadata.fileName,
      fileSize: preview.metadata.fileSize,
      sheetName: preview.metadata.sheetName,
      availableSheets: preview.metadata.availableSheets.slice(0, 50),
      uploadedAt: preview.metadata.uploadedAt,
      uploadedByUid: user.uid,
      uploadedByEmail,
      totalRows: preview.records.length,
      chunkCount: totalChunks,
      matchedHeaders: preview.validation.matchedHeaders,
      missingRequiredHeaders: preview.validation.missingRequiredHeaders.slice(0, 20),
      extraHeaders: preview.validation.extraHeaders.slice(0, 100),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, metaPath);
  }

  // 3. Publish anonymized public analytics & hashed placement lookup index
  await publishPublicLayers(
    revisionId,
    preview.metadata.uploadedAt,
    preview.records,
    preview.validation.validUniquePtkCount,
    user
  );

  if (onProgress) onProgress(100);

  // Best-effort snapshot for Wave History & Comparison
  try {
    const computed = computeAnalytics(preview.records);
    const statusCounts: Record<string, number> = {};
    for (const s of computed.byStatusMatrikulasi.slice(0, 40)) {
      statusCounts[s.name] = s.count;
    }
    const topLptks = computed.byLptk.slice(0, 15).map((l) => ({
      name: l.name,
      count: l.count,
    }));
    await setDoc(doc(db, 'dataset_history', revisionId), {
      revisionId,
      sheetName: preview.metadata.sheetName.slice(0, 150),
      uploadedAt: preview.metadata.uploadedAt,
      uploadedByUid: user.uid,
      uploadedByEmail,
      totalRows: preview.records.length,
      validUniquePtkCount: preview.validation.validUniquePtkCount,
      totalLptk: computed.totalLptk,
      totalBidangStudi: computed.totalBidangStudi,
      totalProvinsi: computed.totalProvinsi,
      maleCount: computed.pesertaLakiLaki,
      femaleCount: computed.pesertaPerempuan,
      statusCounts,
      topLptks,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking: dataset publish succeeded
  }

  return {
    revisionId,
    metadata: preview.metadata,
    records: preview.records,
    validation: preview.validation,
    uploadedByEmail,
  };
}

export async function clearDatasetInCloud(): Promise<void> {
  const path = 'datasets/active';
  try {
    await deleteDoc(doc(db, 'datasets', 'active'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
  try {
    await deleteDoc(doc(db, 'public_analytics', 'active'));
  } catch {
    // Best-effort cleanup of public analytics pointer
  }
}

export function subscribeToActiveDataset(
  onData: (dataset: CloudDataset | null) => void,
  onLoadingChange: (loading: boolean) => void,
  onError: (err: Error) => void
): () => void {
  let currentLoadedRevision: string | null = null;
  let activeFetchToken = 0;

  const metaRef = doc(db, 'datasets', 'active');
  return onSnapshot(
    metaRef,
    async (snap) => {
      if (!snap.exists()) {
        currentLoadedRevision = null;
        onData(null);
        onLoadingChange(false);
        return;
      }

      const meta = snap.data() as CloudDatasetMetaDoc;
      if (!meta.revisionId || meta.chunkCount === 0) {
        currentLoadedRevision = null;
        onData(null);
        onLoadingChange(false);
        return;
      }

      if (currentLoadedRevision === meta.revisionId) {
        onLoadingChange(false);
        return;
      }

      const fetchToken = ++activeFetchToken;
      onLoadingChange(true);

      try {
        const allRawRows: RawInputRow[] = [];
        // Fetch chunks in parallel batches of 10
        for (let i = 0; i < meta.chunkCount; i += 10) {
          const batchIndices: number[] = [];
          for (let j = i; j < Math.min(i + 10, meta.chunkCount); j++) {
            batchIndices.push(j);
          }
          const snaps = await Promise.all(
            batchIndices.map(async (idx) => {
              const chunkPath = `datasets/active/chunks/${meta.revisionId}_${idx}`;
              try {
                return await getDoc(
                  doc(db, 'datasets', 'active', 'chunks', `${meta.revisionId}_${idx}`)
                );
              } catch (err) {
                handleFirestoreError(err, OperationType.GET, chunkPath);
              }
            })
          );

          if (fetchToken !== activeFetchToken) {
            return; // Superseded by newer revision
          }

          for (const chunkSnap of snaps) {
            if (chunkSnap.exists()) {
              const data = chunkSnap.data() as { rows?: CompactRowPayload[] };
              if (Array.isArray(data.rows)) {
                for (const row of data.rows) {
                  allRawRows.push(fromCompactRow(row));
                }
              }
            }
          }
        }

        if (fetchToken !== activeFetchToken) return;

        const { records, validation } = validateAndBuildRecords(
          allRawRows,
          meta.matchedHeaders,
          meta.missingRequiredHeaders ?? [],
          meta.extraHeaders ?? []
        );

        currentLoadedRevision = meta.revisionId;
        onData({
          revisionId: meta.revisionId,
          metadata: {
            fileName: meta.fileName,
            fileSize: meta.fileSize,
            sheetName: meta.sheetName,
            availableSheets: meta.availableSheets ?? [meta.sheetName],
            uploadedAt: meta.uploadedAt,
          },
          records,
          validation,
          uploadedByEmail: meta.uploadedByEmail ?? '',
        });
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (fetchToken === activeFetchToken) {
          onLoadingChange(false);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'datasets/active');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
      onLoadingChange(false);
    }
  );
}

export function subscribeToPublicAnalytics(
  onData: (dataset: CloudDataset | null) => void,
  onLoadingChange: (loading: boolean) => void,
  onError: (err: Error) => void
): () => void {
  let currentLoadedRevision: string | null = null;
  let activeFetchToken = 0;

  const metaRef = doc(db, 'public_analytics', 'active');
  return onSnapshot(
    metaRef,
    async (snap) => {
      if (!snap.exists()) {
        currentLoadedRevision = null;
        onData(null);
        onLoadingChange(false);
        return;
      }

      const meta = snap.data() as PublicAnalyticsMetaDoc;
      if (!meta.revisionId || meta.chunkCount === 0) {
        currentLoadedRevision = null;
        onData(null);
        onLoadingChange(false);
        return;
      }

      if (currentLoadedRevision === meta.revisionId) {
        onLoadingChange(false);
        return;
      }

      const fetchToken = ++activeFetchToken;
      onLoadingChange(true);

      try {
        const publicRows: PublicAnalyticsRowPayload[] = [];
        for (let i = 0; i < meta.chunkCount; i += 10) {
          const batchIndices: number[] = [];
          for (let j = i; j < Math.min(i + 10, meta.chunkCount); j++) {
            batchIndices.push(j);
          }
          const snaps = await Promise.all(
            batchIndices.map(async (idx) => {
              const chunkPath = `public_analytics/active/chunks/${meta.revisionId}_${idx}`;
              try {
                return await getDoc(
                  doc(db, 'public_analytics', 'active', 'chunks', `${meta.revisionId}_${idx}`)
                );
              } catch (err) {
                handleFirestoreError(err, OperationType.GET, chunkPath);
              }
            })
          );

          if (fetchToken !== activeFetchToken) return;

          for (const chunkSnap of snaps) {
            if (chunkSnap.exists()) {
              const data = chunkSnap.data() as { rows?: PublicAnalyticsRowPayload[] };
              if (Array.isArray(data.rows)) {
                publicRows.push(...data.rows);
              }
            }
          }
        }

        if (fetchToken !== activeFetchToken) return;

        const records: ParticipantRecord[] = publicRows.map((row, idx) => ({
          rowIndex: idx + 1,
          excelRowNumber: 0,
          no: '',
          ptkId: '',
          akunSimpkb: '',
          namaPeserta: '',
          jenisKelamin: row.jk ?? '',
          kotaKab: row.kk ?? '',
          provinsi: row.pr ?? '',
          lptk: row.lp ?? '',
          bidangStudi: row.bs ?? '',
          statusMatrikulasi: row.sm ?? '',
          normPtkId: row.tk ?? '',
          normAkunSimpkb: '',
          normNamaPeserta: '',
          normJenisKelamin: row.jk ?? '',
          genderCategory: row.gc ?? 'Kosong',
          normKotaKab: row.kk ?? '',
          normProvinsi: row.pr ?? '',
          normLptk: row.lp ?? '',
          normBidangStudi: row.bs ?? '',
          normStatusMatrikulasi: row.sm ?? '',
          isPtkEmpty: Boolean(row.em),
          isPtkDuplicate: Boolean(row.dp),
          ptkOccurrenceIndex: row.dp ? 2 : 1,
          ptkTotalOccurrences: 1,
          missingColumns: [],
          needsVerification: Boolean(row.em || row.dp),
        }));

        const emptyPtkRowCount = records.filter((r) => r.isPtkEmpty).length;
        const duplicateExtraRowCount = records.filter((r) => r.isPtkDuplicate).length;

        const validation: ValidationReport = {
          totalRowsRead: records.length,
          validUniquePtkCount: meta.validUniquePtkCount ?? 0,
          validRowCount: records.length - emptyPtkRowCount - duplicateExtraRowCount,
          duplicatePtkGroupCount: 0,
          duplicateExtraRowCount,
          emptyPtkRowCount,
          rowsNeedingVerificationCount: emptyPtkRowCount + duplicateExtraRowCount,
          columnNullStats: [],
          duplicateGroups: [],
          emptyPtkRows: [],
          matchedHeaders: {
            no: null,
            ptkId: null,
            akunSimpkb: null,
            namaPeserta: null,
            jenisKelamin: null,
            kotaKab: null,
            provinsi: null,
            lptk: null,
            bidangStudi: null,
            statusMatrikulasi: null,
          },
          missingRequiredHeaders: [],
          extraHeaders: [],
          isStructureValid: true,
        };

        currentLoadedRevision = meta.revisionId;
        onData({
          revisionId: meta.revisionId,
          metadata: {
            fileName: '',
            fileSize: 0,
            sheetName: '',
            availableSheets: [],
            uploadedAt: meta.uploadedAt ?? new Date().toISOString(),
          },
          records,
          validation,
          uploadedByEmail: '',
        });
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (fetchToken === activeFetchToken) {
          onLoadingChange(false);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'public_analytics/active');
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
      onLoadingChange(false);
    }
  );
}

export async function lookupPlacementInCloud(
  rawIdentifier: string,
  activeRevisionId: string
): Promise<PublicPlacementResult | null> {
  const normalized = rawIdentifier.trim().toLowerCase();
  if (normalized.length < 5) return null;

  const candidateIds: string[] = [];
  if (normalized.includes('@')) {
    candidateIds.push(await buildPlacementLookupId('simpkb', normalized));
  } else {
    candidateIds.push(await buildPlacementLookupId('ptk', normalized));
    candidateIds.push(await buildPlacementLookupId('simpkb', normalized));
  }

  for (const lookupId of candidateIds) {
    const path = `placement_lookup/${lookupId}`;
    try {
      const snap = await getDoc(doc(db, 'placement_lookup', lookupId));
      if (!snap.exists()) continue;
      const data = snap.data() as Partial<PublicPlacementResult>;
      if (activeRevisionId && data.revisionId !== activeRevisionId) {
        continue;
      }
      return {
        revisionId: data.revisionId ?? '',
        maskedPtkId: data.maskedPtkId ?? '',
        maskedSimpkb: data.maskedSimpkb ?? '',
        maskedName: data.maskedName ?? '',
        jenisKelamin: data.jenisKelamin ?? '',
        kotaKab: data.kotaKab ?? '',
        provinsi: data.provinsi ?? '',
        lptk: data.lptk ?? '',
        bidangStudi: data.bidangStudi ?? '',
        statusMatrikulasi: data.statusMatrikulasi ?? '',
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  return null;
}

// ==========================================
// Lecture Locations (Lokasi Perkuliahan) Sync
// ==========================================

export function subscribeToLocations(
  onLocations: (locations: LectureLocation[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'locations';
  const q = query(collection(db, path), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LectureLocation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as {
          namaLokasi?: string;
          lptkTerkait?: string;
          alamatLengkap?: string;
          kotaKab?: string;
          provinsi?: string;
          kodePos?: string;
          ruangAtauGedung?: string;
          kontakPenanggungJawab?: string;
          catatan?: string;
          googleMapsUrl?: string;
          updatedAt?: Timestamp;
        };
        items.push({
          id: docSnap.id,
          namaLokasi: d.namaLokasi ?? '',
          lptkTerkait: d.lptkTerkait ?? '',
          alamatLengkap: d.alamatLengkap ?? '',
          kotaKab: d.kotaKab ?? '',
          provinsi: d.provinsi ?? '',
          kodePos: d.kodePos ?? '',
          ruangAtauGedung: d.ruangAtauGedung ?? '',
          kontakPenanggungJawab: d.kontakPenanggungJawab ?? '',
          catatan: d.catatan ?? '',
          googleMapsUrl: d.googleMapsUrl ?? '',
          updatedAt: d.updatedAt?.toDate
            ? d.updatedAt.toDate().toISOString()
            : new Date().toISOString(),
        });
      });

      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onLocations(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveLocationToCloud(
  locationId: string,
  payload: Omit<LectureLocation, 'id' | 'updatedAt'>,
  userUid: string,
  isUpdate: boolean
): Promise<void> {
  const path = `locations/${locationId}`;
  try {
    await setDoc(doc(db, 'locations', locationId), {
      isPublic: true,
      namaLokasi: payload.namaLokasi.trim().slice(0, 200),
      lptkTerkait: payload.lptkTerkait.trim().slice(0, 200),
      alamatLengkap: payload.alamatLengkap.trim().slice(0, 1000),
      kotaKab: payload.kotaKab.trim().slice(0, 150),
      provinsi: payload.provinsi.trim().slice(0, 150),
      kodePos: payload.kodePos.trim().slice(0, 20),
      ruangAtauGedung: payload.ruangAtauGedung.trim().slice(0, 250),
      kontakPenanggungJawab: payload.kontakPenanggungJawab.trim().slice(0, 200),
      catatan: payload.catatan.trim().slice(0, 500),
      googleMapsUrl: payload.googleMapsUrl.trim().slice(0, 500),
      updatedByUid: userUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteLocationFromCloud(locationId: string): Promise<void> {
  const path = `locations/${locationId}`;
  try {
    await deleteDoc(doc(db, 'locations', locationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// Lecture Locations Page Note (/settings/lokasi_note)
// ==========================================

export function subscribeToLocationNote(
  onNote: (note: LocationPageNote | null) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'settings/lokasi_note';
  return onSnapshot(
    doc(db, 'settings', 'lokasi_note'),
    (snap) => {
      if (!snap.exists()) {
        onNote(null);
        return;
      }
      const d = snap.data() as {
        noteText?: string;
        updatedByEmail?: string;
        updatedAt?: Timestamp;
      };
      onNote({
        noteText: d.noteText ?? '',
        updatedByEmail: d.updatedByEmail ?? '',
        updatedAt: d.updatedAt?.toDate
          ? d.updatedAt.toDate().toISOString()
          : new Date().toISOString(),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveLocationNoteToCloud(
  noteText: string,
  user: User,
  isUpdate: boolean
): Promise<void> {
  const path = 'settings/lokasi_note';
  const sanitized = isRichTextEmpty(noteText) ? '' : sanitizeRichHtml(noteText);
  if (sanitized.length > 15000) {
    throw new Error(
      'Ukuran format catatan melebihi batas maksimal (15.000 karakter). Harap ringkas isi catatan.'
    );
  }
  try {
    await setDoc(doc(db, 'settings', 'lokasi_note'), {
      isPublic: true,
      noteText: sanitized,
      updatedByUid: user.uid,
      updatedByEmail: 'Admin',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

// ==========================================
// Privacy Configuration (/settings/privacy_config)
// ==========================================

export function subscribeToPrivacyConfig(
  onConfig: (config: PrivacyConfig) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'settings/privacy_config';
  return onSnapshot(
    doc(db, 'settings', 'privacy_config'),
    (snap) => {
      if (!snap.exists()) {
        onConfig({ maskPtkId: true, maskAkunSimpkb: true, updatedAt: '' });
        return;
      }
      const d = snap.data() as {
        maskPtkId?: boolean;
        maskAkunSimpkb?: boolean;
        updatedAt?: Timestamp;
      };
      onConfig({
        maskPtkId: Boolean(d.maskPtkId),
        maskAkunSimpkb: Boolean(d.maskAkunSimpkb),
        updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : '',
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function savePrivacyConfigToCloud(
  config: { maskPtkId: boolean; maskAkunSimpkb: boolean },
  userUid: string,
  isUpdate: boolean
): Promise<void> {
  const path = 'settings/privacy_config';
  try {
    await setDoc(doc(db, 'settings', 'privacy_config'), {
      isPublic: true,
      maskPtkId: config.maskPtkId,
      maskAkunSimpkb: config.maskAkunSimpkb,
      updatedByUid: userUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

// ==========================================
// Admin-only Dataset History & Audit Logs
// ==========================================

export function subscribeToDatasetHistory(
  onHistory: (items: DatasetHistoryEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'dataset_history';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: DatasetHistoryEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as Partial<DatasetHistoryEntry>;
        items.push({
          id: docSnap.id,
          revisionId: d.revisionId ?? docSnap.id,
          sheetName: d.sheetName ?? '',
          uploadedAt: d.uploadedAt ?? '',
          uploadedByEmail: d.uploadedByEmail ?? '',
          totalRows: d.totalRows ?? 0,
          validUniquePtkCount: d.validUniquePtkCount ?? 0,
          totalLptk: d.totalLptk ?? 0,
          totalBidangStudi: d.totalBidangStudi ?? 0,
          totalProvinsi: d.totalProvinsi ?? 0,
          maleCount: d.maleCount ?? 0,
          femaleCount: d.femaleCount ?? 0,
          statusCounts: d.statusCounts ?? {},
          topLptks: Array.isArray(d.topLptks) ? d.topLptks : [],
        });
      });
      items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      onHistory(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToAuditLogs(
  onLogs: (items: AuditLogEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'audit_logs';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as {
          aksi?: string;
          ringkasan?: string;
          actorEmail?: string;
          createdAt?: Timestamp;
        };
        items.push({
          id: docSnap.id,
          aksi: d.aksi ?? '',
          ringkasan: d.ringkasan ?? '',
          actorEmail: d.actorEmail ?? '',
          createdAt: d.createdAt?.toDate
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        });
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onLogs(items.slice(0, 100));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function logAdminAction(
  user: User | null,
  aksi: string,
  ringkasan: string
): Promise<void> {
  if (!user || !user.email) return;
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      aksi: aksi.slice(0, 80),
      ringkasan: ringkasan.slice(0, 500),
      actorUid: user.uid,
      actorEmail: user.email,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking audit trail write
  }
}
