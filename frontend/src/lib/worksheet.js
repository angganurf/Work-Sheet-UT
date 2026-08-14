// ---------------- Per-row Monitoring & SQ3R ----------------
export function emptyRowMonitoring() {
  return {
    enabled: false,
    halaman_target: "", halaman_realisasi: "",
    waktu_target: "", waktu_realisasi: "",
    media: "", ketercapaian: "", penyebab: "", solusi: "",
  };
}

export function emptyRowSQ3R() {
  return {
    enabled: false,
    survey: {
      judul_bmp: "", penulis_bmp: "", jumlah_sks: "", jumlah_modul: "",
      judul_modul: "", jumlah_halaman: "", judul_kegiatan: [""],
    },
    questions: [""],
    read: "",
    recite: [""],
    review: { terjawab: [""], dipahami: [""], belum_dipahami: [""] },
  };
}

export function emptyPlanningRow() {
  return { minggu: "", target: "", halaman: "", media: "", jam: "", monitoring: emptyRowMonitoring(), sq3r: emptyRowSQ3R() };
}

function normalizeRow(r) {
  const base = emptyPlanningRow();
  return {
    minggu: r.minggu || "", target: r.target || "", halaman: r.halaman || "",
    media: r.media || "", jam: r.jam || "",
    monitoring: { ...base.monitoring, ...(r.monitoring || {}) },
    sq3r: {
      ...base.sq3r,
      ...(r.sq3r || {}),
      survey: { ...base.sq3r.survey, ...((r.sq3r || {}).survey || {}) },
      review: { ...base.sq3r.review, ...((r.sq3r || {}).review || {}) },
    },
  };
}

// ---------------- Worksheet ----------------
export function defaultWorksheetData() {
  return {
    semester: "",
    weeks: 9,
    jadwal_semester: [{ mata_kuliah: "", minggu: Array(9).fill(""), catatan: "" }],
    // Target & Jadwal Belajar Mingguan (perencanaan) — tiap baris (modul) punya monitoring & SQ3R sendiri
    target_mingguan: [{ mata_kuliah: "", rows: [emptyPlanningRow()] }],
    peta_konsep: "",
  };
}

export function mergeWorksheetData(data) {
  const base = defaultWorksheetData();
  if (!data) return base;
  const merged = { ...base, ...data };
  const weeks = Number(merged.weeks) || 9;
  merged.weeks = weeks;
  merged.jadwal_semester = (data.jadwal_semester || base.jadwal_semester).map((r) => {
    const minggu = Array.isArray(r.minggu) ? [...r.minggu] : [];
    while (minggu.length < weeks) minggu.push("");
    return { mata_kuliah: r.mata_kuliah || "", minggu: minggu.slice(0, weeks), catatan: r.catatan || "" };
  });
  merged.target_mingguan = (data.target_mingguan || base.target_mingguan).map((b) => ({
    mata_kuliah: b.mata_kuliah || "",
    rows: (b.rows && b.rows.length ? b.rows : [emptyPlanningRow()]).map(normalizeRow),
  }));
  return merged;
}

// Copy planning row values into its monitoring target fields
export function planToMonitoring(row) {
  return {
    ...row.monitoring,
    enabled: true,
    halaman_target: row.halaman || row.monitoring.halaman_target || "",
    waktu_target: row.jam || row.monitoring.waktu_target || "",
    media: row.media || row.monitoring.media || "",
  };
}

// ---------------- Progress (from per-row monitoring) ----------------
export function computeCourseProgress(targetMingguan) {
  return (targetMingguan || [])
    .filter((b) => (b.mata_kuliah || "").trim())
    .map((b) => {
      const rows = (b.rows || []).filter((r) => r.monitoring?.enabled && (r.monitoring?.ketercapaian || "").trim());
      const done = rows.filter((r) => (r.monitoring.ketercapaian || "").toLowerCase() === "ya").length;
      const total = rows.length;
      return { mata_kuliah: b.mata_kuliah, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    })
    .filter((c) => c.total > 0);
}

export function overallProgress(worksheets) {
  let done = 0, total = 0;
  (worksheets || []).forEach((w) => {
    computeCourseProgress(w.data?.target_mingguan).forEach((c) => { done += c.done; total += c.total; });
  });
  return total ? Math.round((done / total) * 100) : 0;
}

// Flatten rows that have monitoring or sq3r filled, with context
export function collectResults(targetMingguan) {
  const out = [];
  (targetMingguan || []).forEach((b) => {
    (b.rows || []).forEach((r) => {
      if (r.monitoring?.enabled || r.sq3r?.enabled) {
        out.push({ mata_kuliah: b.mata_kuliah, minggu: r.minggu, target: r.target, monitoring: r.monitoring, sq3r: r.sq3r });
      }
    });
  });
  return out;
}

// ---------------- Reminders (from "Catatan (Waktu)" day) ----------------
const DAY_ORDER = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_KEYS = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6 };

export function parseDays(text) {
  if (!text) return [];
  const low = text.toLowerCase();
  const found = new Set();
  Object.keys(DAY_KEYS).forEach((k) => { if (low.includes(k)) found.add(DAY_KEYS[k]); });
  return [...found].sort((a, b) => a - b);
}

export function dayName(idx) { return DAY_ORDER[idx] || ""; }

export function buildReminders(worksheets) {
  const byDay = {};
  (worksheets || []).forEach((w) => {
    (w.data?.jadwal_semester || []).forEach((row) => {
      parseDays(row.catatan).forEach((d) => {
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push({ mata_kuliah: row.mata_kuliah || "Mata kuliah", catatan: row.catatan, worksheet: w.title });
      });
    });
  });
  return byDay;
}

// ---------------- Profile ----------------
export function defaultProfile(user) {
  return {
    identitas: {
      nama: user?.nama || "", nim: user?.nim || "", alamat_rumah: "",
      nomor_hp: "", nomor_kontak: "", email: "", awal_tahun_kuliah: "",
    },
    tujuan_belajar: "",
    target_belajar: [""],
    mata_kuliah: [{ kode: "", nama: "", sks: "" }],
  };
}

export function mergeProfile(p, user) {
  const base = defaultProfile(user);
  if (!p) return base;
  return {
    ...base, ...p,
    identitas: { ...base.identitas, ...(p.identitas || {}) },
    target_belajar: p.target_belajar && p.target_belajar.length ? p.target_belajar : base.target_belajar,
    mata_kuliah: p.mata_kuliah && p.mata_kuliah.length ? p.mata_kuliah : base.mata_kuliah,
  };
}

export function isProfileComplete(p) {
  if (!p) return false;
  const id = p.identitas || {};
  const hasMk = (p.mata_kuliah || []).some((m) => (m.nama || "").trim());
  return Boolean((id.nama || "").trim() && (id.nim || "").trim() && hasMk);
}

export function courseOptions(profile) {
  return (profile?.mata_kuliah || [])
    .filter((m) => (m.nama || "").trim())
    .map((m) => (m.sks ? `${m.nama} (${m.sks})` : m.nama));
}


// A weekly hour value counts as "no study time" when empty or 0.
export function isNoStudyHour(v) {
  const s = String(v ?? "").trim();
  return s === "" || parseFloat(s.replace(",", ".")) === 0;
}

// Weeks that have NO study hours across ALL courses in jadwal_semester.
export function countEmptyStudyWeeks(data) {
  const rows = (data && data.jadwal_semester) || [];
  const weeks = Number(data && data.weeks) || (rows[0] && rows[0].minggu ? rows[0].minggu.length : 0);
  if (!rows.length || !weeks) return { count: 0, total: weeks || 0, weekNums: [] };
  const weekNums = [];
  for (let w = 0; w < weeks; w++) {
    const anyHours = rows.some((r) => !isNoStudyHour(r.minggu ? r.minggu[w] : ""));
    if (!anyHours) weekNums.push(w + 1);
  }
  return { count: weekNums.length, total: weeks, weekNums };
}
