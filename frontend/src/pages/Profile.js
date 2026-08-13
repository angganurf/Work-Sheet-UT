import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { mergeProfile } from "@/lib/worksheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2, Save, Plus, Trash2, User, Target, Library, LayoutGrid, UserCog,
} from "lucide-react";
import { toast } from "sonner";

const Field = ({ label, value, onChange, placeholder, testid }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
    <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid}
      className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        setProfile(mergeProfile(data.profile, user));
      } catch (e) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail));
        setProfile(mergeProfile(null, user));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...profile, identitas: { ...profile.identitas, nim: user?.nim || profile.identitas.nim } };
      await api.put("/profile", { profile: payload });
      toast.success("Profil tersimpan");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const nav = [
    { label: "Lembar Kerja", icon: LayoutGrid, to: "/dashboard", testid: "worksheets", match: (p) => p.startsWith("/dashboard") },
    { label: "Profil Saya", icon: UserCog, to: "/profile", testid: "profile" },
  ];

  if (loading || !profile) {
    return (
      <DashboardLayout nav={nav} title="Profil Saya" subtitle="Data ini diisi sekali">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#404080]" />
        </div>
      </DashboardLayout>
    );
  }

  const upd = (key, val) => setProfile((p) => ({ ...p, [key]: val }));
  const updId = (key, val) => setProfile((p) => ({ ...p, identitas: { ...p.identitas, [key]: val } }));

  return (
    <DashboardLayout
      nav={nav}
      title="Profil Saya"
      subtitle="Identitas, tujuan, dan mata kuliah — diisi sekali"
      headerRight={
        <Button onClick={save} disabled={saving} data-testid="save-profile-button" className="bg-[#404080] hover:bg-[#29166F] text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Save className="w-4 h-4 sm:mr-2" />}
          <span className="hidden sm:inline">Simpan Profil</span>
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6" data-testid="profile-form">
        {/* Identitas */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-9 h-9 rounded-md bg-[#404080] text-white flex items-center justify-center"><User className="w-4.5 h-4.5" /></div>
            <h3 className="font-heading font-bold text-slate-800">Identitas Mahasiswa</h3>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            <Field label="Nama" value={profile.identitas.nama} onChange={(v) => updId("nama", v)} testid="p-nama" />
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">NIM</Label>
              <Input value={profile.identitas.nim ?? ""} readOnly disabled data-testid="p-nim"
                className="bg-slate-50 text-slate-500 cursor-not-allowed" />
              <p className="text-[11px] text-slate-400">NIM mengikuti akun login Anda</p>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Alamat Rumah</Label>
              <Textarea value={profile.identitas.alamat_rumah} onChange={(e) => updId("alamat_rumah", e.target.value)} rows={2} data-testid="p-alamat"
                className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" />
            </div>
            <Field label="Nomor HP" value={profile.identitas.nomor_hp} onChange={(v) => updId("nomor_hp", v)} testid="p-hp" />
            <Field label="Nomor Kontak yang Dapat Dihubungi" value={profile.identitas.nomor_kontak} onChange={(v) => updId("nomor_kontak", v)} testid="p-kontak" />
            <Field label="Alamat Email" value={profile.identitas.email} onChange={(v) => updId("email", v)} testid="p-email" />
            <Field label="Awal Tahun Kuliah UT" value={profile.identitas.awal_tahun_kuliah} onChange={(v) => updId("awal_tahun_kuliah", v)} placeholder="Contoh: 2026 (Ganjil)" testid="p-tahun" />
          </div>
        </section>

        {/* Tujuan & target */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-9 h-9 rounded-md bg-[#404080] text-white flex items-center justify-center"><Target className="w-4.5 h-4.5" /></div>
            <h3 className="font-heading font-bold text-slate-800">Tujuan & Target Belajar</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Tujuan Belajar</Label>
              <Textarea value={profile.tujuan_belajar} onChange={(e) => upd("tujuan_belajar", e.target.value)} rows={3} data-testid="p-tujuan"
                className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" placeholder="Tuliskan tujuan belajar Anda…" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Target Belajar</Label>
              {profile.target_belajar.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#404080] w-5">{i + 1}.</span>
                  <Input value={t} onChange={(e) => { const n = [...profile.target_belajar]; n[i] = e.target.value; upd("target_belajar", n); }}
                    data-testid={`p-target-${i}`} className="bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]" placeholder="Target belajar…" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => upd("target_belajar", profile.target_belajar.filter((_, x) => x !== i))} disabled={profile.target_belajar.length === 1} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => upd("target_belajar", [...profile.target_belajar, ""])} data-testid="p-target-add" className="border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah
              </Button>
            </div>
          </div>
        </section>

        {/* Mata kuliah */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-9 h-9 rounded-md bg-[#404080] text-white flex items-center justify-center"><Library className="w-4.5 h-4.5" /></div>
            <div>
              <h3 className="font-heading font-bold text-slate-800">Mata Kuliah yang Diregistrasi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Digunakan sebagai pilihan pada lembar kerja</p>
            </div>
          </div>
          <div className="p-6">
            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#EAEAF2] text-[#404080]">
                    <th className="text-left font-semibold p-2.5 w-32">Kode MK</th>
                    <th className="text-left font-semibold p-2.5">Nama MK</th>
                    <th className="text-left font-semibold p-2.5 w-20">SKS</th>
                    <th className="w-10 p-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {profile.mata_kuliah.map((mk, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="p-1 border-r border-slate-100">
                        <input className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-[#EAEAF2]/40 rounded" value={mk.kode} onChange={(e) => { const n = [...profile.mata_kuliah]; n[i] = { ...n[i], kode: e.target.value }; upd("mata_kuliah", n); }} data-testid={`p-mk-kode-${i}`} placeholder="STSI4103" />
                      </td>
                      <td className="p-1 border-r border-slate-100">
                        <input className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-[#EAEAF2]/40 rounded" value={mk.nama} onChange={(e) => { const n = [...profile.mata_kuliah]; n[i] = { ...n[i], nama: e.target.value }; upd("mata_kuliah", n); }} data-testid={`p-mk-nama-${i}`} placeholder="Nama mata kuliah" />
                      </td>
                      <td className="p-1 border-r border-slate-100">
                        <input className="w-full bg-transparent px-2 py-1.5 outline-none focus:bg-[#EAEAF2]/40 rounded" value={mk.sks} onChange={(e) => { const n = [...profile.mata_kuliah]; n[i] = { ...n[i], sks: e.target.value }; upd("mata_kuliah", n); }} data-testid={`p-mk-sks-${i}`} placeholder="3" />
                      </td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => upd("mata_kuliah", profile.mata_kuliah.filter((_, x) => x !== i))} disabled={profile.mata_kuliah.length === 1} className="text-slate-300 hover:text-red-500 disabled:opacity-30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => upd("mata_kuliah", [...profile.mata_kuliah, { kode: "", nama: "", sks: "" }])} data-testid="p-mk-add" className="mt-3 border-dashed border-slate-300 text-[#404080] hover:bg-[#EAEAF2]">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Mata Kuliah
            </Button>
          </div>
        </section>

        <div className="flex justify-end pb-8">
          <Button onClick={save} disabled={saving} data-testid="bottom-save-profile-button" className="bg-[#404080] hover:bg-[#29166F] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Profil
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
