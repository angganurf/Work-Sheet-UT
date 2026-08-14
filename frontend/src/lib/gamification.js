// Lightweight, presentational gamification derived from EXISTING worksheet data.
// No backend/persistence. All computed on the frontend.
import { buildReminders, computeCourseProgress } from "@/lib/worksheet";

// Streak: consecutive days (ending today) that have a scheduled study day
// according to the "Catatan (Waktu)" day parsing in reminders.
export function computeStreak(worksheets) {
  const byDay = buildReminders(worksheets || []); // { dayIdx: [...] }
  const scheduled = new Set(Object.keys(byDay).map(Number));
  if (scheduled.size === 0) return 0;
  let streak = 0;
  const today = new Date().getDay();
  for (let i = 0; i < 7; i++) {
    const d = (today - i + 7) % 7;
    if (scheduled.has(d)) streak++;
    else break;
  }
  return streak;
}

// Total scheduled study-days in a week (for context)
export function weeklyStudyDays(worksheets) {
  const byDay = buildReminders(worksheets || []);
  return Object.keys(byDay).length;
}

// Badges / milestones based on existing data.
export function computeBadges({ worksheets = [], profile = null, jam = 0, pct = 0 }) {
  const mkCount = (profile?.mata_kuliah || []).filter((m) => (m.nama || "").trim()).length;
  let monitoredRows = 0;
  (worksheets || []).forEach((w) => {
    computeCourseProgress(w.data?.target_mingguan).forEach((c) => { monitoredRows += c.total; });
  });
  return [
    {
      id: "first-sheet", label: "Langkah Pertama", emoji: "\uD83D\uDCDD",
      desc: "Membuat lembar kerja pertama", earned: (worksheets?.length || 0) >= 1,
    },
    {
      id: "planner", label: "Perencana Ulung", emoji: "\uD83D\uDDC2\uFE0F",
      desc: "Membuat 3+ lembar kerja", earned: (worksheets?.length || 0) >= 3,
    },
    {
      id: "courses", label: "Multi Mata Kuliah", emoji: "\uD83D\uDCDA",
      desc: "5+ mata kuliah terdaftar", earned: mkCount >= 5,
    },
    {
      id: "hours", label: "Kutu Buku", emoji: "\u23F0",
      desc: "Rencana 20+ jam belajar", earned: jam >= 20,
    },
    {
      id: "monitor", label: "Disiplin Monitoring", emoji: "\u2705",
      desc: "Mengisi 5+ baris monitoring", earned: monitoredRows >= 5,
    },
    {
      id: "achiever", label: "Target Tercapai", emoji: "\uD83C\uDFC6",
      desc: "Ketercapaian rata-rata 80%+", earned: pct >= 80,
    },
  ];
}

// Dynamic motivation message based on overall progress.
export function motivationMessage(pct, hasData) {
  if (!hasData) return "Ayo mulai! Buat lembar kerja pertamamu dan susun rencana belajar. \uD83D\uDE80";
  if (pct >= 80) return "Luar biasa! Kamu konsisten dan hampir menuntaskan semua target. \uD83C\uDFC6";
  if (pct >= 50) return "Kerja bagus! Setengah jalan tercapai \u2014 pertahankan ritmemu. \uD83D\uDCAA";
  if (pct >= 20) return "Terus melangkah! Sedikit demi sedikit targetmu makin dekat. \uD83C\uDF31";
  return "Semangat! Mulai isi tabel monitoring untuk melihat progresmu naik. \uD83C\uDFAF";
}
