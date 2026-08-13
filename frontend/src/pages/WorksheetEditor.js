import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cloneDeep, set as lodashSet } from "lodash";
import api, { formatApiErrorDetail } from "@/lib/api";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import {
  mergeWorksheetData, mergeProfile, courseOptions, isProfileComplete,
  emptyPlanningRow, emptyRowMonitoring, emptyRowSQ3R, planToMonitoring,
  computeCourseProgress, collectResults,
} from "@/lib/worksheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Save, Eye, Plus, Trash2, Check, ArrowLeft, Minus, Copy,
  BookOpen, CalendarDays, ClipboardList, Network, AlertTriangle, UserCog, Activity, Gauge,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- reusable ---------- */
const SectionCard = ({ num, icon: Icon, title, subtitle, children }) => (
  <section className="print-break bg-white border border-slate-200 rounded-lg overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
      <div className="w-9 h-9 rounded-md bg-[#404080] text-white flex items-center justify-center shrink-0">
        {Icon ? <Icon className="w-4.5 h-4.5" /> : <span className="font-heading font-bold">{num}</span>}
      </div>
      <div>
        <h3 className="font-heading font-bold text-slate-800 leading-tight"><span className="text-[#404080] mr-1.5">{num}.</span>{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="p-6">{children}</div>
  </section>
);

const AreaField = ({ label, value, onChange, placeholder, rows = 3, testid }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
    <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} data-testid={testid}
      className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080] resize-y" />
  </div>
);

const MField = ({ label, value, onChange, placeholder, testid }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
    <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid}
      className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
  </div>
);

const ListEditor = ({ items, onChange, placeholder, testidPrefix }) => {
  const update = (i, v) => { const next = [...items]; next[i] = v; onChange(next); };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#404080] w-5 shrink-0">{i + 1}.</span>
          <Input value={it} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} data-testid={`${testidPrefix}-${i}`}
            className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, idx) => idx !== i))} disabled={items.length === 1} className="text-slate-400 hover:text-red-500 shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])} data-testid={`${testidPrefix}-add`} className="border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah
      </Button>
    </div>
  );
};

const AddRowButton = ({ onClick, testid, label = "Tambah Baris" }) => (
  <Button type="button" variant="outline" size="sm" onClick={onClick} data-testid={testid} className="mt-3 border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
    <Plus className="w-3.5 h-3.5 mr-1.5" /> {label}
  </Button>
);

const CourseSelect = ({ value, onChange, options, testid, placeholder = "Pilih mata kuliah" }) => {
  const opts = [...options];
  if (value && !opts.includes(value)) opts.unshift(value);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger data-testid={testid} className="h-9 bg-white border-slate-200 focus:ring-1 focus:ring-[#404080] text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opts.length === 0 ? (
          <div className="px-3 py-2 text-xs text-slate-400">Belum ada mata kuliah di profil</div>
        ) : opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

const cellInput = "w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-[#EAEAF2]/40 rounded";

/* ---------- main ---------- */
export default function WorksheetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dlg, setDlg] = useState(null); // {bi, ri, type}
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: w }, { data: pr }] = await Promise.all([api.get(`/worksheets/${id}`), api.get(`/profile`)]);
        setTitle(w.title || "");
        setData(mergeWorksheetData(w.data));
        setProfile(mergeProfile(pr.profile, null));
      } catch (e) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail));
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const doSave = useCallback(async (silent = false) => {
    setSaving(true);
    try {
      await api.put(`/worksheets/${id}`, { title, data });
      setDirty(false);
      if (!silent) toast.success("Tersimpan");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  }, [id, title, data]);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(true), 1500);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [data, title, dirty, doSave]);

  const upd = (path, value) => {
    setData((prev) => { const next = cloneDeep(prev); lodashSet(next, path, value); return next; });
    setDirty(true);
  };
  const setTitleDirty = (v) => { setTitle(v); setDirty(true); };

  const addWeek = () => {
    setData((prev) => { const n = cloneDeep(prev); n.weeks = (Number(n.weeks) || 9) + 1; n.jadwal_semester.forEach((r) => r.minggu.push("")); return n; });
    setDirty(true);
  };
  const removeWeek = () => {
    setData((prev) => { const w = Number(prev.weeks) || 9; if (w <= 1) return prev; const n = cloneDeep(prev); n.weeks = w - 1; n.jadwal_semester.forEach((r) => r.minggu.pop()); return n; });
    setDirty(true);
  };

  const openDialog = (bi, ri, type) => {
    upd(`target_mingguan[${bi}].rows[${ri}].${type}.enabled`, true);
    setDlg({ bi, ri, type });
  };
  const clearDialogData = () => {
    if (!dlg) return;
    const empty = dlg.type === "monitoring" ? emptyRowMonitoring() : emptyRowSQ3R();
    upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].${dlg.type}`, empty);
    setDlg(null);
    toast.success("Data dihapus");
  };
  const salinRencana = () => {
    if (!dlg) return;
    const row = data.target_mingguan[dlg.bi].rows[dlg.ri];
    upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring`, planToMonitoring(row));
    toast.success("Rencana disalin ke monitoring");
  };

  if (loading || !data) {
    return (<div className="min-h-screen bg-[#F8F9FA]"><TopNav /><div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#404080]" /></div></div>);
  }

  const weeks = Number(data.weeks) || 9;
  const options = courseOptions(profile);
  const profileOk = isProfileComplete(profile);
  const progress = computeCourseProgress(data.target_mingguan);
  const results = collectResults(data.target_mingguan);
  const curRow = dlg ? data.target_mingguan[dlg.bi].rows[dlg.ri] : null;
  const mkLabel = dlg ? (data.target_mingguan[dlg.bi].mata_kuliah || "Mata kuliah") : "";

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <TopNav right={
        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400" data-testid="save-status">
            {saving ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>) : dirty ? "Perubahan belum tersimpan" : (<><Check className="w-3.5 h-3.5 text-green-600" /> Tersimpan</>)}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(`/worksheet/${id}/view`)} data-testid="preview-button" className="border-slate-200"><Eye className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Pratinjau</span></Button>
          <Button size="sm" onClick={() => doSave(false)} disabled={saving} data-testid="save-button" className="bg-[#404080] hover:bg-[#29166F] text-white"><Save className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Simpan</span></Button>
        </div>
      } />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#404080] mb-5 transition-colors" data-testid="back-button">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </button>

        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="text-center mb-5 pb-5 border-b border-slate-100">
            <p className="font-heading font-black text-[#404080] tracking-tight text-lg">UNIVERSITAS TERBUKA</p>
            <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-1">Lembar Kerja Pelatihan Belajar Mandiri · 2026</p>
          </div>
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Judul Lembar Kerja</Label>
          <Input value={title} onChange={(e) => setTitleDirty(e.target.value)} data-testid="worksheet-title-input" className="mt-1.5 text-lg font-heading font-bold bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" placeholder="Judul lembar kerja" />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span><span className="text-slate-400">Nama:</span> <span className="font-medium text-slate-700">{profile?.identitas?.nama || "-"}</span></span>
            <span><span className="text-slate-400">NIM:</span> <span className="font-medium text-slate-700">{profile?.identitas?.nim || "-"}</span></span>
            <Link to="/profile" className="ml-auto text-[#404080] font-semibold hover:underline inline-flex items-center gap-1" data-testid="edit-profile-link"><UserCog className="w-3.5 h-3.5" /> Ubah Profil</Link>
          </div>
        </div>

        {!profileOk && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4" data-testid="profile-warning">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">Lengkapi <Link to="/profile" className="font-semibold underline">Profil Saya</Link> (identitas & mata kuliah) terlebih dahulu agar pilihan mata kuliah muncul dan lembar kerja lengkap saat dicetak.</div>
          </div>
        )}

        <div className="space-y-6" data-testid="worksheet-form">
          {/* 3. Jadwal per semester */}
          <SectionCard num="3" icon={CalendarDays} title="Jadwal Belajar Per Semester" subtitle="Isi dengan jumlah jam belajar pada tiap minggu">
            <div className="mb-4 max-w-xs">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Semester</Label>
              <Input value={data.semester} onChange={(e) => upd("semester", e.target.value)} placeholder="Contoh: 1 (Satu)" data-testid="f-semester" className="mt-1.5 bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">Nilai pada kolom minggu = jumlah jam belajar</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{weeks} minggu</span>
                <Button type="button" variant="outline" size="icon" onClick={removeWeek} disabled={weeks <= 1} data-testid="remove-week-button" className="h-8 w-8 border-slate-200"><Minus className="w-4 h-4" /></Button>
                <Button type="button" variant="outline" size="sm" onClick={addWeek} data-testid="add-week-button" className="h-8 border-slate-200 text-[#404080]"><Plus className="w-4 h-4 mr-1" /> Minggu</Button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#EAEAF2] text-[#404080]">
                    <th rowSpan={2} className="text-left font-semibold p-2.5 min-w-[220px] align-middle border-r border-white/60">Mata Kuliah</th>
                    <th colSpan={weeks} className="font-semibold p-1.5 text-center border-b border-white/60">Minggu ke- (Jumlah Jam)</th>
                    <th rowSpan={2} className="text-left font-semibold p-2.5 min-w-[120px] align-middle border-l border-white/60">Catatan (Waktu)</th>
                    <th rowSpan={2} className="w-10 p-2"></th>
                  </tr>
                  <tr className="bg-[#EAEAF2] text-[#404080]">
                    {Array.from({ length: weeks }).map((_, w) => <th key={w} className="font-semibold p-2 w-10 text-center border-l border-white/50">{w + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.jadwal_semester.map((row, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="p-1.5 border-r border-slate-100 align-middle"><CourseSelect value={row.mata_kuliah} onChange={(v) => upd(`jadwal_semester[${i}].mata_kuliah`, v)} options={options} testid={`js-mk-${i}`} /></td>
                      {row.minggu.map((val, w) => <td key={w} className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center px-0`} value={val} onChange={(e) => upd(`jadwal_semester[${i}].minggu[${w}]`, e.target.value)} data-testid={`js-${i}-w${w}`} /></td>)}
                      <td className="p-1 border-r border-slate-100"><input className={cellInput} value={row.catatan} onChange={(e) => upd(`jadwal_semester[${i}].catatan`, e.target.value)} data-testid={`js-catatan-${i}`} placeholder="Senin" /></td>
                      <td className="p-1 text-center"><button type="button" onClick={() => upd("jadwal_semester", data.jadwal_semester.filter((_, idx) => idx !== i))} disabled={data.jadwal_semester.length === 1} className="text-slate-300 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddRowButton onClick={() => upd("jadwal_semester", [...data.jadwal_semester, { mata_kuliah: "", minggu: Array(weeks).fill(""), catatan: "" }])} testid="js-add" label="Tambah Mata Kuliah" />
          </SectionCard>

          {/* 4. Target & Jadwal Belajar Mingguan (planning + aksi monitoring/sq3r per modul) */}
          <SectionCard num="4" icon={ClipboardList} title="Target & Jadwal Belajar Mingguan" subtitle="Rencana per modul. Klik Monitoring / SQ3R untuk mengisi tiap modul.">
            <div className="space-y-8">
              {data.target_mingguan.map((block, bi) => (
                <div key={bi} className="border border-slate-200 rounded-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1"><CourseSelect value={block.mata_kuliah} onChange={(v) => upd(`target_mingguan[${bi}].mata_kuliah`, v)} options={options} testid={`pl-mk-${bi}`} /></div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => upd("target_mingguan", data.target_mingguan.filter((_, idx) => idx !== bi))} disabled={data.target_mingguan.length === 1} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="border border-slate-200 rounded-md overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#EAEAF2] text-[#404080] text-xs">
                          <th className="font-semibold p-2 w-14">Minggu Ke-</th>
                          <th className="text-left font-semibold p-2 min-w-[180px]">Target Belajar</th>
                          <th className="font-semibold p-2 w-28">Jml Halaman Modul</th>
                          <th className="text-left font-semibold p-2 min-w-[110px]">Media Belajar</th>
                          <th className="font-semibold p-2 w-24">Lama Belajar (Jam)</th>
                          <th className="font-semibold p-2 w-40">Monitoring & SQ3R</th>
                          <th className="w-8 p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((r, ri) => (
                          <tr key={ri} className="border-t border-slate-200">
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center px-0`} value={r.minggu} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].minggu`, e.target.value)} data-testid={`pl-${bi}-${ri}-minggu`} /></td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.target} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].target`, e.target.value)} data-testid={`pl-${bi}-${ri}-target`} placeholder="Modul 1: Pengenalan …" /></td>
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center`} value={r.halaman} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].halaman`, e.target.value)} data-testid={`pl-${bi}-${ri}-halaman`} placeholder="34" /></td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.media} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].media`, e.target.value)} data-testid={`pl-${bi}-${ri}-media`} placeholder="Modul, Google" /></td>
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center`} value={r.jam} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].jam`, e.target.value)} data-testid={`pl-${bi}-${ri}-jam`} placeholder="3" /></td>
                            <td className="p-1.5 border-r border-slate-100">
                              <div className="flex items-center gap-1.5 justify-center">
                                <Button type="button" size="sm" variant={r.monitoring?.enabled ? "default" : "outline"} onClick={() => openDialog(bi, ri, "monitoring")} data-testid={`monitor-btn-${bi}-${ri}`}
                                  className={r.monitoring?.enabled ? "h-7 px-2 bg-[#404080] hover:bg-[#29166F] text-white text-xs" : "h-7 px-2 border-slate-200 text-[#404080] text-xs"}>
                                  {r.monitoring?.enabled && <Check className="w-3 h-3 mr-1" />} Monitoring
                                </Button>
                                <Button type="button" size="sm" variant={r.sq3r?.enabled ? "default" : "outline"} onClick={() => openDialog(bi, ri, "sq3r")} data-testid={`sq3r-btn-${bi}-${ri}`}
                                  className={r.sq3r?.enabled ? "h-7 px-2 bg-[#404080] hover:bg-[#29166F] text-white text-xs" : "h-7 px-2 border-slate-200 text-[#404080] text-xs"}>
                                  {r.sq3r?.enabled && <Check className="w-3 h-3 mr-1" />} SQ3R
                                </Button>
                              </div>
                            </td>
                            <td className="p-1 text-center"><button type="button" onClick={() => upd(`target_mingguan[${bi}].rows`, block.rows.filter((_, idx) => idx !== ri))} disabled={block.rows.length === 1} className="text-slate-300 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AddRowButton onClick={() => upd(`target_mingguan[${bi}].rows`, [...block.rows, emptyPlanningRow()])} testid={`pl-${bi}-addrow`} label="Tambah Modul/Baris" />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => upd("target_mingguan", [...data.target_mingguan, { mata_kuliah: "", rows: [emptyPlanningRow()] }])} data-testid="pl-add-block" className="border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Blok Mata Kuliah
              </Button>
            </div>
          </SectionCard>

          {/* 5. Hasil Monitoring & SQ3R */}
          <SectionCard num="5" icon={Activity} title="Hasil Monitoring & SQ3R" subtitle="Ringkasan monitoring dan SQ3R yang telah Anda isi per modul">
            {progress.length > 0 && (
              <div className="mb-6 rounded-lg bg-[#F5F5FB] border border-slate-200 p-5" data-testid="progress-panel">
                <div className="flex items-center gap-2 mb-4"><Gauge className="w-4.5 h-4.5 text-[#404080]" /><h4 className="font-heading font-bold text-slate-800">Progres Belajar</h4><span className="text-xs text-slate-400">(dari Ketercapaian monitoring)</span></div>
                <div className="flex flex-wrap gap-6">
                  {progress.map((c, i) => <div key={i} data-testid={`progress-ring-${i}`}><ProgressRing pct={c.pct} label={c.mata_kuliah} sub={`${c.done}/${c.total} minggu`} /></div>)}
                </div>
              </div>
            )}
            {results.length === 0 ? (
              <p className="text-sm text-slate-400" data-testid="results-empty">Belum ada. Klik tombol <b>Monitoring</b> atau <b>SQ3R</b> pada tabel di atas untuk menambahkan.</p>
            ) : (
              <div className="space-y-4" data-testid="results-list">
                {results.map((res, i) => (
                  <div key={i} className="border border-slate-200 rounded-md overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="font-heading font-bold text-slate-800 text-sm">{res.mata_kuliah || "Mata kuliah"}</span>
                      {res.minggu && <span className="text-xs bg-[#EAEAF2] text-[#404080] px-2 py-0.5 rounded-full">Minggu {res.minggu}</span>}
                      {res.target && <span className="text-xs text-slate-500 truncate">· {res.target}</span>}
                    </div>
                    <div className="p-4 space-y-4">
                      {res.monitoring?.enabled && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#404080] mb-2">Monitoring</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-sm">
                            <div><span className="text-slate-400 text-xs block">Halaman (T/R)</span>{(res.monitoring.halaman_target || "-")}/{(res.monitoring.halaman_realisasi || "-")}</div>
                            <div><span className="text-slate-400 text-xs block">Waktu (T/R)</span>{(res.monitoring.waktu_target || "-")}/{(res.monitoring.waktu_realisasi || "-")}</div>
                            <div><span className="text-slate-400 text-xs block">Media</span>{res.monitoring.media || "-"}</div>
                            <div><span className="text-slate-400 text-xs block">Ketercapaian</span><span className={res.monitoring.ketercapaian === "Ya" ? "text-green-600 font-semibold" : res.monitoring.ketercapaian === "Tidak" ? "text-amber-600 font-semibold" : ""}>{res.monitoring.ketercapaian || "-"}</span></div>
                            <div className="col-span-2"><span className="text-slate-400 text-xs block">Penyebab</span>{res.monitoring.penyebab || "-"}</div>
                            <div className="col-span-2"><span className="text-slate-400 text-xs block">Solusi</span>{res.monitoring.solusi || "-"}</div>
                          </div>
                        </div>
                      )}
                      {res.sq3r?.enabled && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#404080] mb-2">SQ3R</p>
                          <div className="text-sm space-y-1 text-slate-700">
                            <p><span className="text-slate-400">Judul BMP:</span> {res.sq3r.survey.judul_bmp || "-"} · <span className="text-slate-400">Modul:</span> {res.sq3r.survey.judul_modul || "-"}</p>
                            <p><span className="text-slate-400">Questions:</span> {(res.sq3r.questions || []).filter((x) => x.trim()).length} · <span className="text-slate-400">Recite:</span> {(res.sq3r.recite || []).filter((x) => x.trim()).length} · <span className="text-slate-400">Belum dipahami:</span> {(res.sq3r.review.belum_dipahami || []).filter((x) => x.trim()).length}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 6. Peta konsep */}
          <SectionCard num="6" icon={Network} title="Peta Konsep">
            <AreaField label="Peta Konsep" value={data.peta_konsep} onChange={(v) => upd("peta_konsep", v)} rows={6} testid="peta-konsep" placeholder="Tuliskan peta konsep / poin-poin utama secara terstruktur…" />
          </SectionCard>

          <div className="flex justify-end gap-3 pb-12">
            <Button variant="outline" onClick={() => navigate(`/worksheet/${id}/view`)} className="border-slate-200" data-testid="bottom-preview-button"><Eye className="w-4 h-4 mr-1.5" /> Pratinjau & Unduh PDF</Button>
            <Button onClick={() => doSave(false)} disabled={saving} className="bg-[#404080] hover:bg-[#29166F] text-white" data-testid="bottom-save-button">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />} Simpan</Button>
          </div>
        </div>
      </main>

      {/* Dialog: Monitoring / SQ3R per modul */}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="row-dialog">
          {dlg && curRow && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {dlg.type === "monitoring" ? "Monitoring Belajar" : "SQ3R"} — {mkLabel}
                  {curRow.minggu ? ` · Minggu ${curRow.minggu}` : ""}
                </DialogTitle>
              </DialogHeader>

              {dlg.type === "monitoring" ? (
                <div className="space-y-4">
                  <Button type="button" variant="outline" size="sm" onClick={salinRencana} data-testid="salin-rencana-button" className="border-dashed border-[#404080] text-[#404080] hover:bg-[#EAEAF2]">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Salin dari Rencana (target halaman, jam, media)
                  </Button>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <MField label="Jumlah Halaman — Target" value={curRow.monitoring.halaman_target} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.halaman_target`, v)} testid="mo-halt" />
                    <MField label="Jumlah Halaman — Realisasi" value={curRow.monitoring.halaman_realisasi} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.halaman_realisasi`, v)} testid="mo-halr" />
                    <MField label="Waktu Belajar — Target" value={curRow.monitoring.waktu_target} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.waktu_target`, v)} testid="mo-wt" />
                    <MField label="Waktu Belajar — Realisasi" value={curRow.monitoring.waktu_realisasi} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.waktu_realisasi`, v)} testid="mo-wr" />
                    <MField label="Media Belajar" value={curRow.monitoring.media} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.media`, v)} testid="mo-media" />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Ketercapaian</Label>
                      <Select value={curRow.monitoring.ketercapaian || undefined} onValueChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.ketercapaian`, v)}>
                        <SelectTrigger data-testid="mo-tercapai" className="bg-white"><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent><SelectItem value="Ya">Ya</SelectItem><SelectItem value="Tidak">Tidak</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <AreaField label="Penyebab Tidak Terlaksana" value={curRow.monitoring.penyebab} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.penyebab`, v)} rows={2} testid="mo-penyebab" />
                  <AreaField label="Solusi" value={curRow.monitoring.solusi} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].monitoring.solusi`, v)} rows={2} testid="mo-solusi" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="font-heading font-bold text-[#404080] mb-2 text-sm">Survey</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[["Judul BMP", "judul_bmp", "sv-judul"], ["Nama Penulis BMP", "penulis_bmp", "sv-penulis"], ["Jumlah SKS", "jumlah_sks", "sv-sks"], ["Jumlah Modul", "jumlah_modul", "sv-modul"], ["Judul Modul", "judul_modul", "sv-judulmodul"], ["Jumlah Halaman", "jumlah_halaman", "sv-halaman"]].map(([lbl, key, tid]) => (
                        <MField key={key} label={lbl} value={curRow.sq3r.survey[key]} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.survey.${key}`, v)} testid={tid} />
                      ))}
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Judul Kegiatan Belajar</Label>
                      <ListEditor items={curRow.sq3r.survey.judul_kegiatan} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.survey.judul_kegiatan`, v)} placeholder="Judul kegiatan…" testidPrefix="sv-kegiatan" />
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Questions</Label><ListEditor items={curRow.sq3r.questions} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.questions`, v)} placeholder="Pertanyaan…" testidPrefix="q-item" /></div>
                  <AreaField label="Read (Catatan Membaca)" value={curRow.sq3r.read} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.read`, v)} rows={3} testid="read-notes" />
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Recite</Label><ListEditor items={curRow.sq3r.recite} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.recite`, v)} placeholder="Poin yang dipahami…" testidPrefix="recite-item" /></div>
                  <div className="space-y-3">
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Review — Pertanyaan terjawab</Label><ListEditor items={curRow.sq3r.review.terjawab} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.review.terjawab`, v)} placeholder="…" testidPrefix="rv-terjawab" /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Review — Konsep dipahami</Label><ListEditor items={curRow.sq3r.review.dipahami} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.review.dipahami`, v)} placeholder="…" testidPrefix="rv-dipahami" /></div>
                    <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Review — Belum dipahami</Label><ListEditor items={curRow.sq3r.review.belum_dipahami} onChange={(v) => upd(`target_mingguan[${dlg.bi}].rows[${dlg.ri}].sq3r.review.belum_dipahami`, v)} placeholder="…" testidPrefix="rv-belum" /></div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={clearDialogData} data-testid="dialog-clear-button" className="border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 mr-auto"><Trash2 className="w-4 h-4 mr-1.5" /> Hapus Data</Button>
                <Button type="button" onClick={() => { setDlg(null); toast.success("Tersimpan"); }} data-testid="dialog-done-button" className="bg-[#404080] hover:bg-[#29166F] text-white"><Check className="w-4 h-4 mr-1.5" /> Selesai</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
