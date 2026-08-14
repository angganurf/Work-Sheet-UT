import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { isProfileComplete, overallProgress, buildReminders, dayName } from "@/lib/worksheet";
import { computeStreak, computeBadges, motivationMessage } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FileText, Loader2, Pencil, Eye, Trash2, Calendar,
  LayoutGrid, BookOpen, Clock, Library, UserCog, AlertTriangle, Gauge, Bell, CalendarClock,
  Flame, Sparkles, Award,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "-";
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [worksheets, setWorksheets] = useState(null);
  const [profile, setProfile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/worksheets", { title: "Lembar Kerja Belajar Mandiri", data: {} });
      toast.success("Lembar kerja dibuat");
      navigate(`/worksheet/${data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setCreating(false);
    }
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
    list.forEach((w) => {
      (w.data?.target_mingguan || []).forEach((b) =>
        (b.rows || []).forEach((r) => {
          const n = parseFloat(String(r.jam ?? r.waktu).replace(",", "."));
          if (!isNaN(n)) jam += n;
        })
      );
    });
    const mkCount = (profile?.mata_kuliah || []).filter((m) => (m.nama || "").trim()).length;
    return { total: list.length, mkCount, jam, pct: overallProgress(list) };
  }, [worksheets, profile]);

  const reminders = useMemo(() => buildReminders(worksheets || []), [worksheets]);
  const todayIdx = new Date().getDay();
  const todayItems = reminders[todayIdx] || [];
  const reminderDays = Object.keys(reminders).map(Number).sort((a, b) => a - b);

  const streak = useMemo(() => computeStreak(worksheets || []), [worksheets]);
  const badges = useMemo(
    () => computeBadges({ worksheets: worksheets || [], profile, jam: stats.jam, pct: stats.pct }),
    [worksheets, profile, stats]
  );
  const earnedBadges = badges.filter((b) => b.earned);
  const hasData = (worksheets || []).length > 0;

  const profileOk = isProfileComplete(profile);

  const nav = [
    { label: "Lembar Kerja", short: "Beranda", icon: LayoutGrid, to: "/dashboard", testid: "worksheets", match: (p) => p.startsWith("/dashboard") },
    { label: "Buat Baru", short: "Buat", icon: Plus, testid: "create", onClick: handleCreate, primary: true },
    { label: "Profil Saya", short: "Profil", icon: UserCog, to: "/profile", testid: "profile" },
  ];

  return (
    <DashboardLayout
      nav={nav}
      title="Dashboard"
      subtitle={`Selamat datang, ${user?.nama || ""}`}
      headerRight={
        <Button onClick={handleCreate} disabled={creating} data-testid="create-worksheet-button"
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold transition-colors active:scale-[0.98]">
          {creating ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Plus className="w-4 h-4 sm:mr-2" />}
          <span className="hidden sm:inline">Buat Lembar Kerja</span>
        </Button>
      }
    >
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white p-6 sm:p-8 mb-6 shadow-soft-lg" data-testid="dashboard-hero">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div
          className="absolute inset-y-0 right-0 w-2/5 hidden md:block opacity-25 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1573496129661-bd7fcc7e532b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000')",
            WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 95%)",
            maskImage: "linear-gradient(to left, black 10%, transparent 95%)",
          }}
        />
        <div className="relative z-10 max-w-2xl">
          <p className="text-white/70 text-sm mb-1 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Dashboard Belajar Mandiri</p>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl leading-tight mb-2">
            Halo, {(user?.nama || "Mahasiswa").split(" ")[0]} 👋
          </h2>
          <p className="text-white/85 text-sm sm:text-base leading-relaxed mb-5 max-w-xl">
            {motivationMessage(stats.pct, hasData)}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-semibold" data-testid="streak-pill">
              <Flame className="w-4 h-4 text-amber-300" /> {streak} hari beruntun
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-semibold">
              <Gauge className="w-4 h-4 text-teal-200" /> {stats.pct}% ketercapaian
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-semibold">
              <Award className="w-4 h-4 text-yellow-200" /> {earnedBadges.length} lencana
            </span>
          </div>
        </div>
      </div>

      {profile && !profileOk && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4" data-testid="dashboard-profile-warning">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 flex-1">
            Lengkapi profil Anda (identitas & mata kuliah). Data ini diisi sekali dan otomatis dipakai di setiap lembar kerja.
          </div>
          <Link to="/profile" data-testid="complete-profile-link">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8">Lengkapi Profil</Button>
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} color="indigo" label="Total Lembar Kerja" value={worksheets ? stats.total : "—"} caption="Rencana belajar yang Anda buat" testid="stat-total" />
        <StatCard icon={Library} color="teal" label="Mata Kuliah" value={profile ? stats.mkCount : "—"} caption="MK diregistrasi (dari profil)" testid="stat-mk" />
        <StatCard icon={Clock} color="amber" label="Jam Belajar" value={worksheets ? `${stats.jam}` : "—"} caption="Akumulasi rencana jam mingguan" testid="stat-jam" />
        <StatCard icon={Gauge} color="coral" label="Ketercapaian" value={worksheets ? `${stats.pct}%` : "—"} caption="Rata-rata dari tabel monitoring" testid="stat-progress" />
      </div>

      {/* Achievements / badges */}
      {worksheets && (
        <div className="bg-white border border-[#E7E7F0] rounded-2xl p-5 sm:p-6 mb-8 shadow-soft" data-testid="badges-card">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-heading font-bold text-slate-800">Pencapaian</h3>
            <span className="ml-auto text-sm text-slate-400">{earnedBadges.length}/{badges.length} lencana</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">Kumpulkan lencana dengan aktif membuat & memantau lembar kerja Anda</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                data-testid={`badge-${b.id}`}
                title={b.desc}
                className={`flex flex-col items-center text-center gap-1.5 rounded-xl border p-3 transition-colors ${
                  b.earned ? "border-[#C7D2FE] bg-brand-gradient-soft animate-pop-in" : "border-slate-100 bg-slate-50 opacity-60 grayscale"
                }`}
              >
                <span className="text-2xl leading-none">{b.emoji}</span>
                <span className={`text-[11px] font-semibold leading-tight ${b.earned ? "text-[#4338CA]" : "text-slate-500"}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminder card */}
      {worksheets && reminderDays.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-8" data-testid="reminder-card">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-[#4F46E5]" />
            <h3 className="font-heading font-bold text-slate-800">Pengingat Belajar</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Berdasarkan hari pada kolom "Catatan (Waktu)" di jadwal per semester Anda</p>

          <div className={`rounded-lg p-4 mb-4 border ${todayItems.length ? "bg-[#E0E7FF] border-[#C7D2FE]" : "bg-slate-50 border-slate-200"}`} data-testid="reminder-today">
            <p className="text-xs font-bold uppercase tracking-wide text-[#4F46E5] mb-2">
              Hari ini · {dayName(todayIdx)}
            </p>
            {todayItems.length ? (
              <div className="flex flex-wrap gap-2">
                {todayItems.map((it, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-[#C7D2FE] text-[#4F46E5] text-sm font-medium px-3 py-1.5 rounded-full">
                    <BookOpen className="w-3.5 h-3.5" /> {it.mata_kuliah}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Tidak ada jadwal belajar terjadwal hari ini. Tetap semangat! 🎯</p>
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Jadwal Mingguan</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reminderDays.map((d) => (
              <div key={d} className={`flex items-start gap-2.5 rounded-md border p-3 ${d === todayIdx ? "border-[#4F46E5] bg-[#EEF2FF]" : "border-slate-100"}`} data-testid={`reminder-day-${d}`}>
                <CalendarClock className={`w-4 h-4 mt-0.5 shrink-0 ${d === todayIdx ? "text-[#4F46E5]" : "text-slate-400"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{dayName(d)}</p>
                  <p className="text-xs text-slate-500 leading-snug">
                    {[...new Set(reminders[d].map((x) => x.mata_kuliah))].join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#4F46E5]" />
          <h2 className="font-heading text-lg font-bold tracking-tight text-slate-800">Lembar Kerja Saya</h2>
        </div>
        {worksheets && worksheets.length > 0 && <span className="text-sm text-slate-400">{worksheets.length} item</span>}
      </div>

      {worksheets === null ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#4F46E5]" /></div>
      ) : worksheets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white">
          <div className="w-14 h-14 rounded-full bg-[#E0E7FF] flex items-center justify-center mx-auto mb-4"><FileText className="w-7 h-7 text-[#4F46E5]" /></div>
          <p className="font-heading font-semibold text-slate-700 mb-1">Belum ada lembar kerja</p>
          <p className="text-slate-400 text-sm mb-6">Mulai dengan membuat lembar kerja pertama Anda.</p>
          <Button onClick={handleCreate} disabled={creating} data-testid="create-worksheet-empty-button" className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {worksheets.map((w) => (
            <div key={w.id} data-testid={`worksheet-card-${w.id}`} className="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:border-[#4F46E5] hover:shadow-sm transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-[#E0E7FF] flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-[#4F46E5]" /></div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-slate-800 leading-snug truncate">{w.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> {formatDate(w.updated_at)}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" onClick={() => navigate(`/worksheet/${w.id}`)} data-testid={`edit-worksheet-${w.id}`} className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white h-9">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Isi
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/worksheet/${w.id}/view`)} data-testid={`view-worksheet-${w.id}`} className="h-9 border-slate-200"><Eye className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteTarget(w)} data-testid={`delete-worksheet-${w.id}`} className="h-9 border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
