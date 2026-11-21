import {
  AggregatedAnalytics,
  BidangStudiDetailRow,
  DistributionItem,
  LptkSummaryRow,
  ParticipantRecord,
  ProvinceDetailRow,
  StackedSeriesRow,
} from '../types/participant';

/**
 * Single source of truth for all KPIs, charts, and summary tables.
 * Deduplicates by valid PTK ID within the filtered dataset so every metric
 * matches "Total peserta dihitung menggunakan PTK ID unik yang valid".
 */
export function computeAnalytics(filteredRecords: ParticipantRecord[]): AggregatedAnalytics {
  const totalBarisTerfilter = filteredRecords.length;
  let rowsWithoutPtkInFilter = 0;
  let duplicateRowsInFilter = 0;

  const uniquePtkMap = new Map<string, ParticipantRecord>();

  for (const r of filteredRecords) {
    if (r.isPtkEmpty) {
      rowsWithoutPtkInFilter += 1;
      continue;
    }
    if (!uniquePtkMap.has(r.normPtkId)) {
      uniquePtkMap.set(r.normPtkId, r);
    } else {
      duplicateRowsInFilter += 1;
    }
  }

  const pool = Array.from(uniquePtkMap.values());
  const totalPesertaUnik = pool.length;

  let pesertaLakiLaki = 0;
  let pesertaPerempuan = 0;
  let pesertaGenderLainnya = 0;
  let pesertaGenderKosong = 0;

  const lptkCounts = new Map<string, ParticipantRecord[]>();
  const bidangCounts = new Map<string, ParticipantRecord[]>();
  const genderCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const provCounts = new Map<string, ParticipantRecord[]>();
  const kotaCounts = new Map<string, { count: number; provinsi: string }>();

  const omittedEmpty = {
    lptk: 0,
    bidangStudi: 0,
    jenisKelamin: 0,
    statusMatrikulasi: 0,
    provinsi: 0,
    kotaKab: 0,
  };

  for (const r of pool) {
    if (r.genderCategory === 'Laki-Laki') pesertaLakiLaki += 1;
    else if (r.genderCategory === 'Perempuan') pesertaPerempuan += 1;
    else if (r.genderCategory === 'Lainnya') pesertaGenderLainnya += 1;
    else pesertaGenderKosong += 1;

    if (r.normLptk) {
      const list = lptkCounts.get(r.normLptk) ?? [];
      list.push(r);
      lptkCounts.set(r.normLptk, list);
    } else {
      omittedEmpty.lptk += 1;
    }

    if (r.normBidangStudi) {
      const list = bidangCounts.get(r.normBidangStudi) ?? [];
      list.push(r);
      bidangCounts.set(r.normBidangStudi, list);
    } else {
      omittedEmpty.bidangStudi += 1;
    }

    if (r.normJenisKelamin) {
      genderCounts.set(r.normJenisKelamin, (genderCounts.get(r.normJenisKelamin) ?? 0) + 1);
    } else {
      omittedEmpty.jenisKelamin += 1;
    }

    if (r.normStatusMatrikulasi) {
      statusCounts.set(
        r.normStatusMatrikulasi,
        (statusCounts.get(r.normStatusMatrikulasi) ?? 0) + 1
      );
    } else {
      omittedEmpty.statusMatrikulasi += 1;
    }

    if (r.normProvinsi) {
      const list = provCounts.get(r.normProvinsi) ?? [];
      list.push(r);
      provCounts.set(r.normProvinsi, list);
    } else {
      omittedEmpty.provinsi += 1;
    }

    if (r.normKotaKab) {
      const existing = kotaCounts.get(r.normKotaKab);
      if (existing) {
        existing.count += 1;
      } else {
        kotaCounts.set(r.normKotaKab, { count: 1, provinsi: r.normProvinsi });
      }
    } else {
      omittedEmpty.kotaKab += 1;
    }
  }

  const pct = (count: number) =>
    totalPesertaUnik > 0 ? (count / totalPesertaUnik) * 100 : 0;

  const byLptk: DistributionItem[] = Array.from(lptkCounts.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      percentage: pct(items.length),
      maleCount: items.filter((i) => i.genderCategory === 'Laki-Laki').length,
      femaleCount: items.filter((i) => i.genderCategory === 'Perempuan').length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const byBidangStudi: DistributionItem[] = Array.from(bidangCounts.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      percentage: pct(items.length),
      maleCount: items.filter((i) => i.genderCategory === 'Laki-Laki').length,
      femaleCount: items.filter((i) => i.genderCategory === 'Perempuan').length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const byJenisKelamin: DistributionItem[] = Array.from(genderCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: pct(count),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const byStatusMatrikulasi: DistributionItem[] = Array.from(statusCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: pct(count),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const byProvinsi: DistributionItem[] = Array.from(provCounts.entries())
    .map(([name, items]) => ({
      name,
      count: items.length,
      percentage: pct(items.length),
      maleCount: items.filter((i) => i.genderCategory === 'Laki-Laki').length,
      femaleCount: items.filter((i) => i.genderCategory === 'Perempuan').length,
      otherGenderCount: items.filter(
        (i) => i.genderCategory !== 'Laki-Laki' && i.genderCategory !== 'Perempuan'
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const byKotaKab: DistributionItem[] = Array.from(kotaCounts.entries())
    .map(([name, info]) => ({
      name,
      count: info.count,
      percentage: pct(info.count),
      extraLabel: info.provinsi || undefined,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));

  const statusCategories = byStatusMatrikulasi.map((s) => s.name);
  const bidangStudiCategories = byBidangStudi.map((b) => b.name);

  // Stacked: Status Matrikulasi by LPTK
  const matrikulasiByLptk: StackedSeriesRow[] = byLptk.map((lptkItem) => {
    const items = lptkCounts.get(lptkItem.name) ?? [];
    const row: StackedSeriesRow = {
      category: lptkItem.name,
      total: items.length,
    };
    for (const status of statusCategories) {
      row[status] = 0;
    }
    for (const r of items) {
      if (r.normStatusMatrikulasi) {
        row[r.normStatusMatrikulasi] = (Number(row[r.normStatusMatrikulasi]) || 0) + 1;
      }
    }
    return row;
  });

  // Stacked: Status Matrikulasi by Bidang Studi
  const matrikulasiByBidangStudi: StackedSeriesRow[] = byBidangStudi.map((bItem) => {
    const items = bidangCounts.get(bItem.name) ?? [];
    const row: StackedSeriesRow = {
      category: bItem.name,
      total: items.length,
    };
    for (const status of statusCategories) {
      row[status] = 0;
    }
    for (const r of items) {
      if (r.normStatusMatrikulasi) {
        row[r.normStatusMatrikulasi] = (Number(row[r.normStatusMatrikulasi]) || 0) + 1;
      }
    }
    return row;
  });

  // Stacked: Status Matrikulasi by Jenis Kelamin
  const genderGroups = new Map<string, ParticipantRecord[]>();
  for (const r of pool) {
    if (!r.normJenisKelamin) continue;
    const list = genderGroups.get(r.normJenisKelamin) ?? [];
    list.push(r);
    genderGroups.set(r.normJenisKelamin, list);
  }
  const matrikulasiByJenisKelamin: StackedSeriesRow[] = byJenisKelamin.map((gItem) => {
    const items = genderGroups.get(gItem.name) ?? [];
    const row: StackedSeriesRow = {
      category: gItem.name,
      total: items.length,
    };
    for (const status of statusCategories) {
      row[status] = 0;
    }
    for (const r of items) {
      if (r.normStatusMatrikulasi) {
        row[r.normStatusMatrikulasi] = (Number(row[r.normStatusMatrikulasi]) || 0) + 1;
      }
    }
    return row;
  });

  // Province Details for Demografi page
  const provinceDetails: ProvinceDetailRow[] = byProvinsi.map((pItem) => {
    const items = provCounts.get(pItem.name) ?? [];
    const bidangMap: Record<string, number> = {};
    for (const r of items) {
      if (r.normBidangStudi) {
        bidangMap[r.normBidangStudi] = (bidangMap[r.normBidangStudi] ?? 0) + 1;
      }
    }
    let topBidang = '-';
    let topBidangCount = 0;
    for (const [bName, bCount] of Object.entries(bidangMap)) {
      if (bCount > topBidangCount) {
        topBidang = bName;
        topBidangCount = bCount;
      }
    }
    return {
      provinsi: pItem.name,
      total: items.length,
      percentage: pItem.percentage,
      maleCount: pItem.maleCount ?? 0,
      femaleCount: pItem.femaleCount ?? 0,
      otherGenderCount: pItem.otherGenderCount ?? 0,
      topBidangStudi: topBidang,
      topBidangStudiCount: topBidangCount,
      bidangStudiBreakdown: bidangMap,
    };
  });

  // Bidang Studi Details (used by Monitoring LPTK & Export)
  const bidangStudiDetails: BidangStudiDetailRow[] = byBidangStudi.map((bItem) => {
    const items = bidangCounts.get(bItem.name) ?? [];
    const statusBreakdown: Record<string, number> = {};
    for (const st of statusCategories) {
      statusBreakdown[st] = 0;
    }
    for (const r of items) {
      if (r.normStatusMatrikulasi) {
        statusBreakdown[r.normStatusMatrikulasi] =
          (statusBreakdown[r.normStatusMatrikulasi] ?? 0) + 1;
      }
    }
    return {
      bidangStudi: bItem.name,
      total: items.length,
      percentage: bItem.percentage,
      maleCount: bItem.maleCount ?? 0,
      femaleCount: bItem.femaleCount ?? 0,
      statusBreakdown,
    };
  });

  // LPTK Summary Rows (for Export & Reporting)
  const lptkSummaries: LptkSummaryRow[] = byLptk.map((lItem) => {
    const items = lptkCounts.get(lItem.name) ?? [];
    const bSet = new Set<string>();
    const pSet = new Set<string>();
    const statusBreakdown: Record<string, number> = {};
    for (const st of statusCategories) {
      statusBreakdown[st] = 0;
    }
    for (const r of items) {
      if (r.normBidangStudi) bSet.add(r.normBidangStudi);
      if (r.normProvinsi) pSet.add(r.normProvinsi);
      if (r.normStatusMatrikulasi) {
        statusBreakdown[r.normStatusMatrikulasi] =
          (statusBreakdown[r.normStatusMatrikulasi] ?? 0) + 1;
      }
    }
    return {
      lptk: lItem.name,
      total: items.length,
      percentage: lItem.percentage,
      maleCount: lItem.maleCount ?? 0,
      femaleCount: lItem.femaleCount ?? 0,
      bidangStudiCount: bSet.size,
      provinsiCount: pSet.size,
      statusBreakdown,
    };
  });

  return {
    totalBarisTerfilter,
    totalPesertaUnik,
    rowsWithoutPtkInFilter,
    duplicateRowsInFilter,
    totalLptk: byLptk.length,
    totalBidangStudi: byBidangStudi.length,
    totalProvinsi: byProvinsi.length,
    totalKotaKab: byKotaKab.length,
    pesertaLakiLaki,
    pesertaPerempuan,
    pesertaGenderLainnya,
    pesertaGenderKosong,
    byLptk,
    byBidangStudi,
    byJenisKelamin,
    byStatusMatrikulasi,
    byProvinsi,
    byKotaKab,
    omittedEmpty,
    statusCategories,
    bidangStudiCategories,
    matrikulasiByLptk,
    matrikulasiByBidangStudi,
    matrikulasiByJenisKelamin,
    provinceDetails,
    bidangStudiDetails,
    lptkSummaries,
  };
}
