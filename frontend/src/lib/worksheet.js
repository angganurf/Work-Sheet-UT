// ---------------- Worksheet (per lembar kerja) ----------------
export function defaultWorksheetData() {
  return {
    semester: "",
    weeks: 9,
    jadwal_semester: [{ mata_kuliah: "", minggu: Array(9).fill(""), catatan: "" }],
    // Perencanaan (Gambar 1): Minggu, Target Belajar, Jumlah Halaman Modul, Media Belajar, Lama Belajar (jam)
    target_mingguan: [
      {
        mata_kuliah: "",
        rows: [{ minggu: "", target: "", halaman: "", media: "", jam: "" }],
      },
    ],
    // Monitoring (Gambar 2): Minggu, Target, Jumlah Halaman (Target/Realisasi),
    // Waktu Belajar (Target/Realisasi), Media, Ketercapaian, Penyebab, Solusi
    monitoring_mingguan: [
      {
        mata_kuliah: "",
        rows: [
          {
            minggu: "",
            target: "",
            halaman_target: "",
            halaman_realisasi: "",
            waktu_target: "",
            waktu_realisasi: "",
            media: "",
            ketercapaian: "",
            penyebab: "",
            solusi: "",
          },
        ],
      },
    ],
    sq3r: {
      survey: {
        judul_bmp: "", penulis_bmp: "", jumlah_sks: "", jumlah_modul: "",
        judul_modul: "", jumlah_halaman: "", judul_kegiatan: [""],
      },
      questions: [""],
      read: "",
      recite: [""],
      review: { terjawab: [""], dipahami: [""], belum_dipahami: [""] },
    },
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
  merged.target_mingguan = data.target_mingguan || base.target_mingguan;
  merged.monitoring_mingguan = data.monitoring_mingguan || base.monitoring_mingguan;
  merged.sq3r = {
    ...base.sq3r,
    ...(data.sq3r || {}),
    survey: { ...base.sq3r.survey, ...((data.sq3r || {}).survey || {}) },
    review: { ...base.sq3r.review, ...((data.sq3r || {}).review || {}) },
  };
  return merged;
}

export function emptyPlanningRow() {
  return { minggu: "", target: "", halaman: "", media: "", jam: "" };
}
export function emptyMonitoringRow() {
  return {
    minggu: "", target: "", halaman_target: "", halaman_realisasi: "",
    waktu_target: "", waktu_realisasi: "", media: "", ketercapaian: "", penyebab: "", solusi: "",
  };
}

// ---------------- Progress ----------------
export function computeCourseProgress(monitoring) {
  return (monitoring || [])
    .filter((b) => (b.mata_kuliah || "").trim())
    .map((b) => {
      const rows = (b.rows || []).filter((r) => (r.ketercapaian || "").trim());
      const done = rows.filter((r) => (r.ketercapaian || "").toLowerCase() === "ya").length;
      const total = rows.length;
      return { mata_kuliah: b.mata_kuliah, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    });
}

export function overallProgress(worksheets) {
  let done = 0, total = 0;
  (worksheets || []).forEach((w) => {
    computeCourseProgress(w.data?.monitoring_mingguan).forEach((c) => { done += c.done; total += c.total; });
  });
  return total ? Math.round((done / total) * 100) : 0;
}

// ---------------- Reminders (from "Catatan (Waktu)" day) ----------------
const DAY_ORDER = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_KEYS = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6,
};

export function parseDays(text) {
  if (!text) return [];
  const low = text.toLowerCase();
  const found = new Set();
  Object.keys(DAY_KEYS).forEach((k) => { if (low.includes(k)) found.add(DAY_KEYS[k]); });
  return [...found].sort((a, b) => a - b);
}

export function dayName(idx) {
  return DAY_ORDER[idx] || "";
}

// Build a map dayIdx -> [{mata_kuliah, catatan, worksheetTitle}]
export function buildReminders(worksheets) {
  const byDay = {};
  (worksheets || []).forEach((w) => {
    (w.data?.jadwal_semester || []).forEach((row) => {
      const days = parseDays(row.catatan);
      days.forEach((d) => {
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push({ mata_kuliah: row.mata_kuliah || "Mata kuliah", catatan: row.catatan, worksheet: w.title });
      });
    });
  });
  return byDay;
}

// ---------------- Profile (diisi sekali per mahasiswa) ----------------
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
