import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cloneDeep, set as lodashSet } from "lodash";
import api, { formatApiErrorDetail } from "@/lib/api";
import { TopNav } from "@/components/TopNav";
import { mergeWorksheetData, mergeProfile, courseOptions, isProfileComplete } from "@/lib/worksheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Save, Eye, Plus, Trash2, Check, ArrowLeft, Minus,
  BookOpen, CalendarDays, ClipboardList, Network, AlertTriangle, UserCog,
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
        <h3 className="font-heading font-bold text-slate-800 leading-tight">
          <span className="text-[#404080] mr-1.5">{num}.</span>{title}
        </h3>
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

// Course dropdown that also keeps a legacy/manual value visible
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
        ) : (
          opts.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))
        )}
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
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: w }, { data: pr }] = await Promise.all([
          api.get(`/worksheets/${id}`),
          api.get(`/profile`),
        ]);
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
    setData((prev) => {
      const next = cloneDeep(prev);
      next.weeks = (Number(next.weeks) || 9) + 1;
      next.jadwal_semester.forEach((r) => r.minggu.push(""));
      return next;
    });
    setDirty(true);
  };
  const removeWeek = () => {
    setData((prev) => {
      const w = Number(prev.weeks) || 9;
      if (w <= 1) return prev;
      const next = cloneDeep(prev);
      next.weeks = w - 1;
      next.jadwal_semester.forEach((r) => r.minggu.pop());
      return next;
    });
    setDirty(true);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <TopNav />
        <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#404080]" /></div>
      </div>
    );
  }

  const weeks = Number(data.weeks) || 9;
  const options = courseOptions(profile);
  const profileOk = isProfileComplete(profile);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <TopNav
        right={
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400" data-testid="save-status">
              {saving ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>) : dirty ? "Perubahan belum tersimpan" : (<><Check className="w-3.5 h-3.5 text-green-600" /> Tersimpan</>)}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigate(`/worksheet/${id}/view`)} data-testid="preview-button" className="border-slate-200">
              <Eye className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Pratinjau</span>
            </Button>
            <Button size="sm" onClick={() => doSave(false)} disabled={saving} data-testid="save-button" className="bg-[#404080] hover:bg-[#29166F] text-white">
              <Save className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Simpan</span>
            </Button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#404080] mb-5 transition-colors" data-testid="back-button">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </button>

        {/* Header / title */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="text-center mb-5 pb-5 border-b border-slate-100">
            <p className="font-heading font-black text-[#404080] tracking-tight text-lg">UNIVERSITAS TERBUKA</p>
            <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mt-1">Lembar Kerja Pelatihan Belajar Mandiri · 2026</p>
          </div>
          <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Judul Lembar Kerja</Label>
          <Input value={title} onChange={(e) => setTitleDirty(e.target.value)} data-testid="worksheet-title-input"
            className="mt-1.5 text-lg font-heading font-bold bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" placeholder="Judul lembar kerja" />
          {/* Profile summary */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span><span className="text-slate-400">Nama:</span> <span className="font-medium text-slate-700">{profile?.identitas?.nama || "-"}</span></span>
            <span><span className="text-slate-400">NIM:</span> <span className="font-medium text-slate-700">{profile?.identitas?.nim || "-"}</span></span>
            <Link to="/profile" className="ml-auto text-[#404080] font-semibold hover:underline inline-flex items-center gap-1" data-testid="edit-profile-link">
              <UserCog className="w-3.5 h-3.5" /> Ubah Profil
            </Link>
          </div>
        </div>

        {!profileOk && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4" data-testid="profile-warning">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              Lengkapi <Link to="/profile" className="font-semibold underline">Profil Saya</Link> (identitas & mata kuliah) terlebih dahulu agar pilihan mata kuliah muncul dan lembar kerja lengkap saat dicetak.
            </div>
          </div>
        )}

        <div className="space-y-6" data-testid="worksheet-form">
          {/* 3. Jadwal per semester */}
          <SectionCard num="3" icon={CalendarDays} title="Jadwal Belajar Per Semester" subtitle="Isi dengan jumlah jam belajar pada tiap minggu">
            <div className="mb-4 max-w-xs">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Semester</Label>
              <Input value={data.semester} onChange={(e) => upd("semester", e.target.value)} placeholder="Contoh: 1 (Satu)" data-testid="f-semester"
                className="mt-1.5 bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
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
                    {Array.from({ length: weeks }).map((_, w) => (
                      <th key={w} className="font-semibold p-2 w-10 text-center border-l border-white/50">{w + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.jadwal_semester.map((row, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="p-1.5 border-r border-slate-100 align-middle">
                        <CourseSelect value={row.mata_kuliah} onChange={(v) => upd(`jadwal_semester[${i}].mata_kuliah`, v)} options={options} testid={`js-mk-${i}`} />
                      </td>
                      {row.minggu.map((val, w) => (
                        <td key={w} className="p-1 border-r border-slate-100">
                          <input className={`${cellInput} text-center px-0`} value={val} onChange={(e) => upd(`jadwal_semester[${i}].minggu[${w}]`, e.target.value)} data-testid={`js-${i}-w${w}`} />
                        </td>
                      ))}
                      <td className="p-1 border-r border-slate-100">
                        <input className={cellInput} value={row.catatan} onChange={(e) => upd(`jadwal_semester[${i}].catatan`, e.target.value)} data-testid={`js-catatan-${i}`} placeholder="Senin" />
                      </td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => upd("jadwal_semester", data.jadwal_semester.filter((_, idx) => idx !== i))} disabled={data.jadwal_semester.length === 1} className="text-slate-300 hover:text-red-500 disabled:opacity-30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddRowButton onClick={() => upd("jadwal_semester", [...data.jadwal_semester, { mata_kuliah: "", minggu: Array(weeks).fill(""), catatan: "" }])} testid="js-add" label="Tambah Mata Kuliah" />
          </SectionCard>

          {/* 4. Target mingguan (monitoring) */}
          <SectionCard num="4" icon={ClipboardList} title="Target & Jadwal Belajar Mingguan" subtitle="Monitoring mandiri: pantau ketercapaian target belajar Anda tiap minggu">
            <div className="space-y-8">
              {data.target_mingguan.map((block, bi) => (
                <div key={bi} className="border border-slate-200 rounded-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1"><CourseSelect value={block.mata_kuliah} onChange={(v) => upd(`target_mingguan[${bi}].mata_kuliah`, v)} options={options} testid={`tm-mk-${bi}`} /></div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => upd("target_mingguan", data.target_mingguan.filter((_, idx) => idx !== bi))} disabled={data.target_mingguan.length === 1} className="text-slate-400 hover:text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="border border-slate-200 rounded-md overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#EAEAF2] text-[#404080] text-xs">
                          <th className="font-semibold p-2 w-12">Mgg</th>
                          <th className="text-left font-semibold p-2 min-w-[160px]">Target Belajar</th>
                          <th className="font-semibold p-2 w-20">Hal.</th>
                          <th className="font-semibold p-2 w-20">Jam</th>
                          <th className="text-left font-semibold p-2 min-w-[110px]">Media</th>
                          <th className="font-semibold p-2 w-24">Tercapai?</th>
                          <th className="text-left font-semibold p-2 min-w-[120px]">Penyebab</th>
                          <th className="text-left font-semibold p-2 min-w-[120px]">Solusi</th>
                          <th className="w-8 p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((r, ri) => (
                          <tr key={ri} className="border-t border-slate-200">
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center px-0`} value={r.minggu} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].minggu`, e.target.value)} data-testid={`tm-${bi}-${ri}-minggu`} /></td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.target} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].target`, e.target.value)} data-testid={`tm-${bi}-${ri}-target`} placeholder="Modul 1: …" /></td>
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center px-0`} value={r.halaman} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].halaman`, e.target.value)} /></td>
                            <td className="p-1 border-r border-slate-100"><input className={`${cellInput} text-center px-0`} value={r.waktu} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].waktu`, e.target.value)} /></td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.media} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].media`, e.target.value)} placeholder="Modul, Google" /></td>
                            <td className="p-1 border-r border-slate-100">
                              <Select value={r.ketercapaian || undefined} onValueChange={(v) => upd(`target_mingguan[${bi}].rows[${ri}].ketercapaian`, v)}>
                                <SelectTrigger data-testid={`tm-${bi}-${ri}-tercapai`} className="h-8 border-0 shadow-none focus:ring-0 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent><SelectItem value="Ya">Ya</SelectItem><SelectItem value="Tidak">Tidak</SelectItem></SelectContent>
                              </Select>
                            </td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.penyebab} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].penyebab`, e.target.value)} placeholder="-" /></td>
                            <td className="p-1 border-r border-slate-100"><input className={cellInput} value={r.solusi} onChange={(e) => upd(`target_mingguan[${bi}].rows[${ri}].solusi`, e.target.value)} placeholder="-" /></td>
                            <td className="p-1 text-center">
                              <button type="button" onClick={() => upd(`target_mingguan[${bi}].rows`, block.rows.filter((_, idx) => idx !== ri))} disabled={block.rows.length === 1} className="text-slate-300 hover:text-red-500 disabled:opacity-30">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <AddRowButton onClick={() => upd(`target_mingguan[${bi}].rows`, [...block.rows, { minggu: "", target: "", halaman: "", waktu: "", media: "", ketercapaian: "", penyebab: "", solusi: "" }])} testid={`tm-${bi}-addrow`} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => upd("target_mingguan", [...data.target_mingguan, { mata_kuliah: "", rows: [{ minggu: "", target: "", halaman: "", waktu: "", media: "", ketercapaian: "", penyebab: "", solusi: "" }] }])} data-testid="tm-add-block" className="border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Blok Mata Kuliah
              </Button>
            </div>
          </SectionCard>

          {/* 5. SQ3R */}
          <SectionCard num="5" icon={BookOpen} title="SQ3R" subtitle="Survey · Questions · Read · Recite · Review">
            <div className="space-y-6">
              <div className="border-l-4 border-[#404080] pl-4 py-1">
                <h4 className="font-heading font-bold text-[#404080] mb-3">Survey <span className="font-normal text-slate-400 text-xs">(3–5 menit)</span></h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    ["Judul BMP", "judul_bmp", "sv-judul"],
                    ["Nama Penulis BMP", "penulis_bmp", "sv-penulis"],
                    ["Jumlah SKS", "jumlah_sks", "sv-sks"],
                    ["Jumlah Modul", "jumlah_modul", "sv-modul"],
                    ["Judul Modul (yang akan dibaca)", "judul_modul", "sv-judulmodul"],
                    ["Jumlah Halaman", "jumlah_halaman", "sv-halaman"],
                  ].map(([lbl, key, tid]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{lbl}</Label>
                      <Input value={data.sq3r.survey[key] ?? ""} onChange={(e) => upd(`sq3r.survey.${key}`, e.target.value)} data-testid={tid}
                        className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Judul-judul Kegiatan Belajar</Label>
                  <ListEditor items={data.sq3r.survey.judul_kegiatan} onChange={(v) => upd("sq3r.survey.judul_kegiatan", v)} placeholder="Judul kegiatan belajar…" testidPrefix="sv-kegiatan" />
                </div>
              </div>

              <div className="border-l-4 border-[#404080] pl-4 py-1">
                <h4 className="font-heading font-bold text-[#404080] mb-3">Questions <span className="font-normal text-slate-400 text-xs">(3 menit)</span></h4>
                <p className="text-xs text-slate-400 mb-2">Tuliskan pertanyaan-pertanyaan yang diharapkan terjawab dari membaca modul.</p>
                <ListEditor items={data.sq3r.questions} onChange={(v) => upd("sq3r.questions", v)} placeholder="Contoh: Apa yang dimaksud Sistem Operasi?" testidPrefix="q-item" />
              </div>

              <div className="border-l-4 border-[#404080] pl-4 py-1">
                <h4 className="font-heading font-bold text-[#404080] mb-3">Read <span className="font-normal text-slate-400 text-xs">(10 menit)</span></h4>
                <p className="text-xs text-slate-400 mb-2">Baca keseluruhan modul: garis bawahi/stabilo kata penting & buat catatan kecil di sini.</p>
                <AreaField label="Catatan Membaca" value={data.sq3r.read} onChange={(v) => upd("sq3r.read", v)} rows={4} testid="read-notes" placeholder="Tuliskan catatan penting…" />
              </div>

              <div className="border-l-4 border-[#404080] pl-4 py-1">
                <h4 className="font-heading font-bold text-[#404080] mb-3">Recite <span className="font-normal text-slate-400 text-xs">(5 menit)</span></h4>
                <p className="text-xs text-slate-400 mb-2">Ungkapkan kembali apa yang sudah dibaca dengan kata-kata sendiri.</p>
                <ListEditor items={data.sq3r.recite} onChange={(v) => upd("sq3r.recite", v)} placeholder="Poin yang Anda pahami…" testidPrefix="recite-item" />
              </div>

              <div className="border-l-4 border-[#404080] pl-4 py-1">
                <h4 className="font-heading font-bold text-[#404080] mb-3">Review <span className="font-normal text-slate-400 text-xs">(5 menit)</span></h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">a. Pertanyaan yang sudah terjawab</Label>
                    <ListEditor items={data.sq3r.review.terjawab} onChange={(v) => upd("sq3r.review.terjawab", v)} placeholder="Pertanyaan yang terjawab…" testidPrefix="rv-terjawab" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">b. Konsep yang sudah dipahami</Label>
                    <ListEditor items={data.sq3r.review.dipahami} onChange={(v) => upd("sq3r.review.dipahami", v)} placeholder="Konsep yang dipahami…" testidPrefix="rv-dipahami" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">c. Konsep yang belum dipahami</Label>
                    <ListEditor items={data.sq3r.review.belum_dipahami} onChange={(v) => upd("sq3r.review.belum_dipahami", v)} placeholder="Konsep yang belum dipahami…" testidPrefix="rv-belum" />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* 6. Peta konsep */}
          <SectionCard num="6" icon={Network} title="Peta Konsep">
            <AreaField label="Peta Konsep" value={data.peta_konsep} onChange={(v) => upd("peta_konsep", v)} rows={6} testid="peta-konsep" placeholder="Tuliskan peta konsep / poin-poin utama secara terstruktur…" />
          </SectionCard>

          <div className="flex justify-end gap-3 pb-12">
            <Button variant="outline" onClick={() => navigate(`/worksheet/${id}/view`)} className="border-slate-200" data-testid="bottom-preview-button">
              <Eye className="w-4 h-4 mr-1.5" /> Pratinjau & Unduh PDF
            </Button>
            <Button onClick={() => doSave(false)} disabled={saving} className="bg-[#404080] hover:bg-[#29166F] text-white" data-testid="bottom-save-button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />} Simpan
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
