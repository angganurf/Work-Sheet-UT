import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { isProfileComplete, overallProgress, buildReminders, dayName } from "@/lib/worksheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, FileText, Loader2, Pencil, Eye, Trash2, Calendar,
  LayoutGrid, BookOpen, Clock, Library, UserCog, AlertTriangle, Gauge, Bell, CalendarClock,
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

  const profileOk = isProfileComplete(profile);

  const nav = [
    { label: "Lembar Kerja", icon: LayoutGrid, to: "/dashboard", testid: "worksheets", match: (p) => p.startsWith("/dashboard") },
    { label: "Profil Saya", icon: UserCog, to: "/profile", testid: "profile" },
    { label: "Buat Baru", icon: Plus, testid: "create", onClick: handleCreate },
  ];

  return (
    <DashboardLayout
      nav={nav}
      title="Dashboard"
      subtitle={`Selamat datang, ${user?.nama || ""}`}
      headerRight={
        <Button onClick={handleCreate} disabled={creating} data-testid="create-worksheet-button"
          className="bg-[#404080] hover:bg-[#29166F] text-white font-semibold transition-colors active:scale-[0.98]">
          {creating ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Plus className="w-4 h-4 sm:mr-2" />}
          <span className="hidden sm:inline">Buat Lembar Kerja</span>
        </Button>
      }
    >
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
        <StatCard icon={FileText} label="Total Lembar Kerja" value={worksheets ? stats.total : "—"} caption="Rencana belajar yang Anda buat" testid="stat-total" />
        <StatCard icon={Library} label="Mata Kuliah" value={profile ? stats.mkCount : "—"} caption="MK diregistrasi (dari profil)" testid="stat-mk" />
        <StatCard icon={Clock} label="Jam Belajar" value={worksheets ? `${stats.jam}` : "—"} caption="Akumulasi rencana jam mingguan" testid="stat-jam" />
        <StatCard icon={Gauge} label="Ketercapaian" value={worksheets ? `${stats.pct}%` : "—"} caption="Rata-rata dari tabel monitoring" testid="stat-progress" />
      </div>

      {/* Reminder card */}
      {worksheets && reminderDays.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-8" data-testid="reminder-card">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-[#404080]" />
            <h3 className="font-heading font-bold text-slate-800">Pengingat Belajar</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Berdasarkan hari pada kolom "Catatan (Waktu)" di jadwal per semester Anda</p>

          <div className={`rounded-lg p-4 mb-4 border ${todayItems.length ? "bg-[#EAEAF2] border-[#c9c9e6]" : "bg-slate-50 border-slate-200"}`} data-testid="reminder-today">
            <p className="text-xs font-bold uppercase tracking-wide text-[#404080] mb-2">
              Hari ini · {dayName(todayIdx)}
            </p>
            {todayItems.length ? (
              <div className="flex flex-wrap gap-2">
                {todayItems.map((it, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-[#c9c9e6] text-[#404080] text-sm font-medium px-3 py-1.5 rounded-full">
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
              <div key={d} className={`flex items-start gap-2.5 rounded-md border p-3 ${d === todayIdx ? "border-[#404080] bg-[#F5F5FB]" : "border-slate-100"}`} data-testid={`reminder-day-${d}`}>
                <CalendarClock className={`w-4 h-4 mt-0.5 shrink-0 ${d === todayIdx ? "text-[#404080]" : "text-slate-400"}`} />
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
          <BookOpen className="w-5 h-5 text-[#404080]" />
          <h2 className="font-heading text-lg font-bold tracking-tight text-slate-800">Lembar Kerja Saya</h2>
        </div>
        {worksheets && worksheets.length > 0 && <span className="text-sm text-slate-400">{worksheets.length} item</span>}
      </div>

      {worksheets === null ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#404080]" /></div>
      ) : worksheets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white">
          <div className="w-14 h-14 rounded-full bg-[#EAEAF2] flex items-center justify-center mx-auto mb-4"><FileText className="w-7 h-7 text-[#404080]" /></div>
          <p className="font-heading font-semibold text-slate-700 mb-1">Belum ada lembar kerja</p>
          <p className="text-slate-400 text-sm mb-6">Mulai dengan membuat lembar kerja pertama Anda.</p>
          <Button onClick={handleCreate} disabled={creating} data-testid="create-worksheet-empty-button" className="bg-[#404080] hover:bg-[#29166F] text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {worksheets.map((w) => (
            <div key={w.id} data-testid={`worksheet-card-${w.id}`} className="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:border-[#404080] hover:shadow-sm transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-[#EAEAF2] flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-[#404080]" /></div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-slate-800 leading-snug truncate">{w.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> {formatDate(w.updated_at)}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3 border-t border-slate-100">
                <Button size="sm" onClick={() => navigate(`/worksheet/${w.id}`)} data-testid={`edit-worksheet-${w.id}`} className="flex-1 bg-[#404080] hover:bg-[#29166F] text-white h-9">
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
