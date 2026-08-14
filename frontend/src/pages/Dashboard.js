import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProgressRing } from "@/components/ProgressRing";
import { isProfileComplete, overallProgress, buildReminders, computeCourseProgress, countEmptyStudyWeeks } from "@/lib/worksheet";
import { computeStreak } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FileText, Loader2, Trash2, Clock, Bookmark, Flame, Check, Calendar,
  Settings, BookOpen, PenSquare, Target, User, ChevronRight, GraduationCap,
  AlertTriangle, LayoutGrid, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum"]; // Mon..Fri

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "-"; }
}

function worksheetPct(w) {
  const cs = computeCourseProgress(w.data?.target_mingguan);
  let done = 0, total = 0;
  cs.forEach((c) => { done += c.done; total += c.total; });
  return total ? Math.round((done / total) * 100) : 0;
}

function worksheetSubtitle(w) {
  const course =
    (w.data?.target_mingguan || []).find((b) => (b.mata_kuliah || "").trim())?.mata_kuliah ||
    (w.data?.jadwal_semester || []).find((r) => (r.mata_kuliah || "").trim())?.mata_kuliah ||
    "Rencana Belajar";
  return `${course} • ${w.data?.semester || "Belajar Mandiri"}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [worksheets, setWorksheets] = useState(null);
  const [profile, setProfile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const [wRes, pRes] = await Promise.all([api.get("/worksheets"), api.get("/profile")]);
      setWorksheets(wRes.data);
      setProfile(pRes.data.profile);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
      setWorksheets([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/worksheets", { title: "Lembar Kerja Belajar Mandiri", data: {} });
      toast.success("Lembar kerja dibuat");
      navigate(`/worksheet/${data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setCreating(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/worksheets/${deleteTarget.id}`);
      toast.success("Lembar kerja dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const stats = useMemo(() => {
    const list = worksheets || [];
    let jam = 0;
    list.forEach((w) =>
      (w.data?.target_mingguan || []).forEach((b) =>
        (b.rows || []).forEach((r) => {
          const n = parseFloat(String(r.jam ?? r.waktu).replace(",", "."));
          if (!isNaN(n)) jam += n;
        })
      )
    );
    const mkCount = (profile?.mata_kuliah || []).filter((m) => (m.nama || "").trim()).length;
    return { total: list.length, mkCount, jam, pct: overallProgress(list) };
  }, [worksheets, profile]);

  const reminders = useMemo(() => buildReminders(worksheets || []), [worksheets]);
  const todayIdx = new Date().getDay();
  const todayItems = reminders[todayIdx] || [];
  const streak = useMemo(() => computeStreak(worksheets || []), [worksheets]);
  const profileOk = isProfileComplete(profile);

  // Mon..Fri streak track
  const todayIso = ((new Date().getDay() + 6) % 7) + 1; // Mon=1..Sun=7
  const streakDays = DAY_LABELS.map((label, i) => {
    const d = i + 1; // 1..5
    let state = "future";
    if (d < todayIso) state = "done";
    else if (d === todayIso) state = "current";
    return { label, state };
  });

  const filtered = useMemo(() => {
    const list = worksheets || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((w) =>
      `${w.title} ${worksheetSubtitle(w)}`.toLowerCase().includes(q)
    );
  }, [worksheets, query]);

  const nav = [
    { label: "Dashboard", icon: LayoutGrid, to: "/dashboard", testid: "dashboard", match: (p) => p === "/dashboard" },
    { label: "Worksheets", icon: PenSquare, testid: "worksheets", onClick: () => document.getElementById("recent-worksheets")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Target Plan", icon: Target, testid: "target-plan", onClick: () => toast.info("Target Plan tersedia di dalam setiap lembar kerja") },
    { label: "SQ3R Method", icon: BookOpen, testid: "sq3r", onClick: () => toast.info("Metode SQ3R diisi di dalam setiap lembar kerja") },
    { label: "Profile", icon: User, to: "/profile", testid: "profile" },
  ];

  const quickActions = [
    { label: "New Entry", icon: Plus, onClick: handleCreate },
    { label: "Schedule", icon: Calendar, onClick: () => document.getElementById("today-focus")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Reports", icon: FileText, onClick: () => toast.info("Laporan ringkas segera hadir") },
    { label: "Settings", icon: Settings, onClick: () => navigate("/profile") },
  ];

  const firstName = (user?.nama || "Mahasiswa").split(" ")[0];

  return (
    <DashboardLayout
      nav={nav}
      primaryAction={{ label: "New Worksheet", onClick: handleCreate }}
      searchValue={query}
      onSearchChange={setQuery}
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white px-7 sm:px-10 py-10 sm:py-12 mb-6" data-testid="dashboard-hero">
        <GraduationCap className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 w-40 h-40 text-white/[0.06]" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl tracking-tight mb-3">Halo, {firstName}!</h1>
          <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-lg">
            Selamat datang kembali di area belajarmu. Tetap fokus pada tujuan akademismu hari ini.
          </p>
        </div>
      </div>

      {profile && !profileOk && (
        <div className="mb-6 flex items-start gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-soft" data-testid="dashboard-profile-warning">
          <AlertTriangle className="w-5 h-5 text-neutral-900 shrink-0 mt-0.5" />
          <div className="text-sm text-neutral-600 flex-1">
            Lengkapi profil Anda (identitas & mata kuliah). Data ini diisi sekali dan otomatis dipakai di setiap lembar kerja.
          </div>
          <Button size="sm" onClick={() => navigate("/profile")} data-testid="complete-profile-link" className="bg-neutral-900 hover:bg-black text-white h-8">Lengkapi</Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatBox icon={FileText} label="Total Worksheets" value={worksheets ? stats.total : "—"} topRight={stats.total > 0 ? <TrendUp text={`${stats.total} aktif`} /> : null} testid="stat-total" />
        <StatBox icon={Bookmark} label="Active Courses" value={profile ? stats.mkCount : "—"} testid="stat-mk" />
        <StatBox icon={Clock} label="Study Hours" value={worksheets ? stats.jam : "—"} unit="hrs" topRight={<span className="text-xs text-neutral-400">This Week</span>} testid="stat-jam" />
        {/* Target completion */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex items-center gap-4" data-testid="stat-progress">
          <div className="shrink-0">
            <ProgressRing pct={worksheets ? stats.pct : 0} size={72} stroke={8} />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-neutral-900 leading-tight">Target Completion</p>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">Rata-rata ketercapaian dari tabel monitoring lembar kerja Anda.</p>
          </div>
        </div>
      </div>

      {/* Streak + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Streak */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-soft" data-testid="streak-card">
          <div className="flex items-center gap-2 mb-8">
            <Flame className="w-5 h-5 text-neutral-900" />
            <h3 className="font-heading font-bold text-lg text-neutral-900">Streak Belajar</h3>
            <span className="ml-auto text-xs font-semibold bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full" data-testid="streak-pill">
              {streak} Hari Beruntun
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            {streakDays.map((d, i) => (
              <React.Fragment key={d.label}>
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold ${d.state === "current" ? "text-neutral-900" : "text-neutral-400"}`}>{d.label}</span>
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    d.state === "done" ? "bg-neutral-900 border-neutral-900 text-white"
                    : d.state === "current" ? "border-neutral-900 text-neutral-900"
                    : "border-neutral-200 text-neutral-300"
                  }`}>
                    {d.state === "done" ? <Check className="w-4 h-4" strokeWidth={3} />
                      : d.state === "current" ? <span className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
                      : null}
                  </span>
                </div>
                {i < streakDays.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-[-14px] ${streakDays[i + 1].state !== "future" ? "bg-neutral-900" : d.state === "current" ? "bg-neutral-300 border-t-2 border-dashed border-neutral-300 h-0" : "bg-neutral-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft" data-testid="quick-actions">
          <h3 className="font-heading font-bold text-lg text-neutral-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button key={a.label} onClick={a.onClick} data-testid={`qa-${a.label.toLowerCase().replace(" ", "-")}`}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-slate-200 hover:border-neutral-900 hover:bg-neutral-50 transition-colors">
                <a.icon className="w-5 h-5 text-neutral-800" />
                <span className="text-xs font-semibold text-neutral-700">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent worksheets + Today's focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent worksheets */}
        <div className="lg:col-span-2" id="recent-worksheets">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-xl text-neutral-900">Recent Worksheets</h3>
            <span className="text-sm text-neutral-400">{worksheets ? `${filtered.length} item` : ""}</span>
          </div>

          {worksheets === null ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-neutral-900" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4"><FileText className="w-7 h-7 text-neutral-700" /></div>
              <p className="font-heading font-semibold text-neutral-800 mb-1">{query ? "Tidak ada hasil" : "Belum ada lembar kerja"}</p>
              <p className="text-neutral-400 text-sm mb-6">{query ? "Coba kata kunci lain." : "Mulai dengan membuat lembar kerja pertama Anda."}</p>
              {!query && (
                <Button onClick={handleCreate} disabled={creating} data-testid="create-worksheet-empty-button" className="bg-neutral-900 hover:bg-black text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Buat Sekarang
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((w) => {
                const pct = worksheetPct(w);
                const empty = countEmptyStudyWeeks(w.data);
                return (
                  <div key={w.id} data-testid={`worksheet-card-${w.id}`}
                    className="group bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-neutral-900 transition-colors shadow-soft">
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-neutral-900 truncate">{w.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-neutral-400 truncate">{worksheetSubtitle(w)}</p>
                        {empty.count > 0 && (
                          <span data-testid={`empty-weeks-badge-${w.id}`} title={`Minggu tanpa jam belajar: ${empty.weekNums.join(", ")}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 rounded-full px-2 py-0.5 shrink-0">
                            <AlertTriangle className="w-3 h-3" /> {empty.count} minggu kosong
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:block w-40 shrink-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-neutral-400">Progress</span>
                        <span className="text-xs font-bold text-neutral-900 tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                        <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button onClick={() => navigate(`/worksheet/${w.id}`)} data-testid={`edit-worksheet-${w.id}`}
                      title="Isi lembar kerja"
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button onClick={() => setDeleteTarget(w)} data-testid={`delete-worksheet-${w.id}`}
                      title="Hapus"
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-neutral-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's focus */}
        <div id="today-focus" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft h-fit" data-testid="today-focus">
          <h3 className="font-heading font-bold text-xl text-neutral-900 mb-5">Today's Focus</h3>
          {todayItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3"><Calendar className="w-6 h-6 text-neutral-400" /></div>
              <p className="text-sm text-neutral-500">Tidak ada fokus terjadwal hari ini. Tetap semangat! 🎯</p>
            </div>
          ) : (
            <div className="space-y-5">
              {todayItems.slice(0, 5).map((it, i) => (
                <div key={i} className="flex gap-3" data-testid={`focus-item-${i}`}>
                  <div className="flex flex-col items-center pt-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 shrink-0" />
                    {i < Math.min(todayItems.length, 5) - 1 && <span className="w-px flex-1 bg-neutral-200 mt-1" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="font-semibold text-neutral-900 leading-tight truncate">{it.mata_kuliah}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{it.worksheet || "Jadwal belajar hari ini"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lembar kerja?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="confirm-delete-button" className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function StatBox({ icon: Icon, label, value, unit, topRight, testid }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft" data-testid={testid}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-neutral-800" />
        </div>
        {topRight}
      </div>
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className="font-heading font-extrabold text-3xl text-neutral-900 tabular-nums leading-none">
        {value}{unit && <span className="text-base font-semibold text-neutral-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

function TrendUp({ text }) {
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-neutral-500">
      <ArrowUpRight className="w-3.5 h-3.5" /> {text}
    </span>
  );
}
