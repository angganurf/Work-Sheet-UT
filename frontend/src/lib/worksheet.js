// ---------------- Worksheet (per lembar kerja) ----------------
export function defaultWorksheetData() {
  return {
    semester: "",
    weeks: 9,
    jadwal_semester: [{ mata_kuliah: "", minggu: Array(9).fill(""), catatan: "" }],
    target_mingguan: [
      {
        mata_kuliah: "",
        rows: [
          { minggu: "", target: "", halaman: "", waktu: "", media: "", ketercapaian: "", penyebab: "", solusi: "" },
        ],
      },
    ],
    sq3r: {
      survey: {
        judul_bmp: "",
        penulis_bmp: "",
        jumlah_sks: "",
        jumlah_modul: "",
        judul_modul: "",
        jumlah_halaman: "",
        judul_kegiatan: [""],
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
  merged.sq3r = {
    ...base.sq3r,
    ...(data.sq3r || {}),
    survey: { ...base.sq3r.survey, ...((data.sq3r || {}).survey || {}) },
    review: { ...base.sq3r.review, ...((data.sq3r || {}).review || {}) },
  };
  return merged;
}

// ---------------- Profile (diisi sekali per mahasiswa) ----------------
export function defaultProfile(user) {
  return {
    identitas: {
      nama: user?.nama || "",
      nim: user?.nim || "",
      alamat_rumah: "",
      nomor_hp: "",
      nomor_kontak: "",
      email: "",
      awal_tahun_kuliah: "",
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
    ...base,
    ...p,
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

// Course options as "Nama (SKS)" strings for dropdowns
export function courseOptions(profile) {
  return (profile?.mata_kuliah || [])
    .filter((m) => (m.nama || "").trim())
    .map((m) => (m.sks ? `${m.nama} (${m.sks})` : m.nama));
}
