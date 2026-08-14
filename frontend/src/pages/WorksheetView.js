import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { TopNav } from "@/components/TopNav";
import { ProgressRing } from "@/components/ProgressRing";
import { mergeWorksheetData, mergeProfile, computeCourseProgress, collectResults } from "@/lib/worksheet";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Row = ({ label, value }) => (
  <div className="flex gap-2 py-1 text-sm">
    <span className="text-slate-500 w-56 shrink-0">{label}</span>
    <span className="text-slate-400">:</span>
    <span className="text-slate-800 font-medium">{value || "-"}</span>
  </div>
);

const SectionTitle = ({ num, title }) => (
  <h3 className="font-heading font-bold text-[#4F46E5] text-lg border-b-2 border-[#4F46E5] pb-1.5 mb-4 mt-8">{num}. {title}</h3>
);

const Bullets = ({ items }) => {
  const filled = (items || []).filter((x) => (x || "").trim());
  if (filled.length === 0) return <p className="text-sm text-slate-400">-</p>;
  return <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">{filled.map((x, i) => <li key={i}>{x}</li>)}</ul>;
};

export default function WorksheetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: w } = await api.get(`/worksheets/${id}`);
        setWs(w);
        setData(mergeWorksheetData(w.data));
        setProfile(mergeProfile(w.profile, { nama: w.nama, nim: w.nim }));
      } catch (e) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail));
        navigate(-1);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading || !data) {
    return (<div className="min-h-screen bg-[#F7F7FB]"><TopNav /><div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" /></div></div>);
  }

  const weeks = Number(data.weeks) || 9;
  const cellPad = "border border-slate-300 p-2 text-sm";
  const id_ = profile?.identitas || {};
  const progress = computeCourseProgress(data.target_mingguan);
  const results = collectResults(data.target_mingguan);
  const planningBlocks = (data.target_mingguan || []).filter(
    (b) => (b.mata_kuliah || "").trim() || (b.rows || []).some((r) => [r.minggu, r.target, r.halaman, r.media, r.jam].some((v) => (v || "").toString().trim()))
  );

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <TopNav right={
        <Button size="sm" onClick={() => window.print()} data-testid="download-pdf-button" className="bg-[#4F46E5] hover:bg-[#4338CA] text-white"><Download className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Unduh PDF</span></Button>
      } />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="no-print flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#4F46E5] mb-5 transition-colors" data-testid="view-back-button"><ArrowLeft className="w-4 h-4" /> Kembali</button>

        <div className="print-container bg-white border border-slate-200 rounded-lg shadow-sm p-8 md:p-12" data-testid="worksheet-view">
          <div className="text-center border-b-2 border-[#4F46E5] pb-4 mb-6">
            <p className="font-heading font-black text-[#4F46E5] text-2xl tracking-tight">UNIVERSITAS TERBUKA</p>
            <p className="text-sm text-slate-500 uppercase tracking-[0.15em] mt-1">Lembar Kerja Pelatihan Belajar Mandiri</p>
            <p className="text-xs text-slate-400 mt-0.5">Tahun 2026 · {ws?.title}</p>
          </div>

          {/* 1 Identitas */}
          <SectionTitle num="1" title="Identitas Mahasiswa" />
          <div>
            <Row label="Nama" value={id_.nama} /><Row label="NIM" value={id_.nim} /><Row label="Alamat Rumah" value={id_.alamat_rumah} />
            <Row label="Nomor HP" value={id_.nomor_hp} /><Row label="Nomor Kontak" value={id_.nomor_kontak} /><Row label="Alamat Email" value={id_.email} /><Row label="Awal Tahun Kuliah UT" value={id_.awal_tahun_kuliah} />
          </div>

          {/* 2 Tujuan & target */}
          <SectionTitle num="2" title="Tujuan & Target Belajar" />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Tujuan Belajar</p>
          <p className="text-sm text-slate-800 mb-4 whitespace-pre-wrap">{profile?.tujuan_belajar || "-"}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Target Belajar</p>
          <div className="mb-4"><Bullets items={profile?.target_belajar} /></div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Mata Kuliah yang Diregistrasi</p>
          <table className="w-full border-collapse mb-2">
            <thead><tr className="bg-[#E0E7FF] text-[#4F46E5]"><th className={`${cellPad} text-left w-32`}>Kode MK</th><th className={`${cellPad} text-left`}>Nama MK</th><th className={`${cellPad} text-left w-16`}>SKS</th></tr></thead>
            <tbody>{(profile?.mata_kuliah || []).map((mk, i) => <tr key={i}><td className={cellPad}>{mk.kode || "-"}</td><td className={cellPad}>{mk.nama || "-"}</td><td className={cellPad}>{mk.sks || "-"}</td></tr>)}</tbody>
          </table>

          {/* 3 Jadwal semester */}
          <SectionTitle num="3" title="Jadwal Belajar Per Semester" />
          <p className="text-sm text-slate-600 mb-2">Semester: <span className="font-semibold text-slate-800">{data.semester || "-"}</span></p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mb-2">
              <thead>
                <tr className="bg-[#E0E7FF] text-[#4F46E5]"><th rowSpan={2} className={`${cellPad} text-left align-middle`}>Mata Kuliah</th><th colSpan={weeks} className={`${cellPad} text-center`}>Minggu ke- (Jumlah Jam)</th><th rowSpan={2} className={`${cellPad} text-left align-middle`}>Catatan</th></tr>
                <tr className="bg-[#E0E7FF] text-[#4F46E5]">{Array.from({ length: weeks }).map((_, w) => <th key={w} className={`${cellPad} text-center w-8`}>{w + 1}</th>)}</tr>
              </thead>
              <tbody>{data.jadwal_semester.map((row, i) => <tr key={i}><td className={cellPad}>{row.mata_kuliah || "-"}</td>{Array.from({ length: weeks }).map((_, w) => <td key={w} className={`${cellPad} text-center`}>{row.minggu[w] || ""}</td>)}<td className={cellPad}>{row.catatan || "-"}</td></tr>)}</tbody>
            </table>
          </div>

          {/* 4 Target mingguan (perencanaan) */}
          <SectionTitle num="4" title="Target & Jadwal Belajar Mingguan" />
          {planningBlocks.length === 0 ? <p className="text-sm text-slate-400 mb-4">-</p> : planningBlocks.map((block, bi) => (
            <div key={bi} className="mb-6 print-break">
              <p className="text-sm font-semibold text-slate-800 mb-2">Mata Kuliah: {block.mata_kuliah || "-"}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead><tr className="bg-[#E0E7FF] text-[#4F46E5]"><th className={`${cellPad} w-12`}>Minggu Ke-</th><th className={`${cellPad} text-left`}>Target Belajar</th><th className={`${cellPad} w-24`}>Jumlah Halaman Modul</th><th className={`${cellPad} text-left`}>Media Belajar</th><th className={`${cellPad} w-24`}>Lama Belajar (Jam)</th></tr></thead>
                  <tbody>{block.rows.map((r, ri) => <tr key={ri}><td className={`${cellPad} text-center`}>{r.minggu || ""}</td><td className={cellPad}>{r.target || "-"}</td><td className={`${cellPad} text-center`}>{r.halaman || "-"}</td><td className={cellPad}>{r.media || "-"}</td><td className={`${cellPad} text-center`}>{r.jam || "-"}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          ))}

          {/* 5 Hasil Monitoring & SQ3R */}
          <SectionTitle num="5" title="Hasil Monitoring & SQ3R" />
          {progress.length > 0 && (
            <div className="mb-6 rounded-lg bg-[#EEF2FF] border border-slate-200 p-5 print-break">
              <p className="font-heading font-bold text-slate-800 mb-4">Progres Belajar</p>
              <div className="flex flex-wrap gap-6">{progress.map((c, i) => <div key={i} data-testid={`progress-ring-${i}`}><ProgressRing pct={c.pct} label={c.mata_kuliah} sub={`${c.done}/${c.total} minggu`} /></div>)}</div>
            </div>
          )}
          {results.length === 0 ? <p className="text-sm text-slate-400">-</p> : results.map((res, i) => (
            <div key={i} className="mb-5 border border-slate-200 rounded-md overflow-hidden print-break">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-sm">
                <span className="font-heading font-bold text-slate-800">{res.mata_kuliah || "Mata kuliah"}</span>
                {res.minggu && <span className="ml-2 text-xs text-[#4F46E5]">Minggu {res.minggu}</span>}
                {res.target && <span className="ml-2 text-xs text-slate-500">· {res.target}</span>}
              </div>
              <div className="p-4 space-y-4">
                {res.monitoring?.enabled && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4F46E5] mb-2">Monitoring</p>
                    <table className="w-full border-collapse text-xs">
                      <thead><tr className="bg-[#E0E7FF] text-[#4F46E5]"><th colSpan={2} className={`${cellPad} text-center`}>Jumlah Halaman</th><th colSpan={2} className={`${cellPad} text-center`}>Waktu Belajar</th><th className={cellPad}>Media</th><th className={cellPad}>Ketercapaian</th><th className={cellPad}>Penyebab</th><th className={cellPad}>Solusi</th></tr>
                        <tr className="bg-[#E0E7FF] text-[#4F46E5]"><th className={cellPad}>Target</th><th className={cellPad}>Realisasi</th><th className={cellPad}>Target</th><th className={cellPad}>Realisasi</th><th className={cellPad}></th><th className={cellPad}></th><th className={cellPad}></th><th className={cellPad}></th></tr>
                      </thead>
                      <tbody><tr>
                        <td className={`${cellPad} text-center`}>{res.monitoring.halaman_target || "-"}</td><td className={`${cellPad} text-center`}>{res.monitoring.halaman_realisasi || "-"}</td>
                        <td className={`${cellPad} text-center`}>{res.monitoring.waktu_target || "-"}</td><td className={`${cellPad} text-center`}>{res.monitoring.waktu_realisasi || "-"}</td>
                        <td className={cellPad}>{res.monitoring.media || "-"}</td><td className={`${cellPad} text-center`}>{res.monitoring.ketercapaian || "-"}</td><td className={cellPad}>{res.monitoring.penyebab || "-"}</td><td className={cellPad}>{res.monitoring.solusi || "-"}</td>
                      </tr></tbody>
                    </table>
                  </div>
                )}
                {res.sq3r?.enabled && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4F46E5] mb-2">SQ3R</p>
                    <div className="text-sm">
                      <p className="font-semibold text-slate-700 mt-1 mb-1">Survey</p>
                      <Row label="Judul BMP" value={res.sq3r.survey.judul_bmp} /><Row label="Penulis BMP" value={res.sq3r.survey.penulis_bmp} /><Row label="Judul Modul" value={res.sq3r.survey.judul_modul} /><Row label="Jumlah Halaman" value={res.sq3r.survey.jumlah_halaman} />
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-2 mb-1">Judul Kegiatan Belajar</p><Bullets items={res.sq3r.survey.judul_kegiatan} />
                      <p className="font-semibold text-slate-700 mt-3 mb-1">Questions</p><Bullets items={res.sq3r.questions} />
                      <p className="font-semibold text-slate-700 mt-3 mb-1">Read</p><p className="text-sm text-slate-800 whitespace-pre-wrap">{res.sq3r.read || "-"}</p>
                      <p className="font-semibold text-slate-700 mt-3 mb-1">Recite</p><Bullets items={res.sq3r.recite} />
                      <p className="font-semibold text-slate-700 mt-3 mb-1">Review</p>
                      <p className="text-xs text-slate-500 mb-1">a. Terjawab</p><Bullets items={res.sq3r.review.terjawab} />
                      <p className="text-xs text-slate-500 mt-1 mb-1">b. Dipahami</p><Bullets items={res.sq3r.review.dipahami} />
                      <p className="text-xs text-slate-500 mt-1 mb-1">c. Belum dipahami</p><Bullets items={res.sq3r.review.belum_dipahami} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 6 Peta konsep */}
          <SectionTitle num="6" title="Peta Konsep" />
          <p className="text-sm text-slate-800 whitespace-pre-wrap min-h-[80px]">{data.peta_konsep || "-"}</p>

          <div className="mt-10 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">Dibuat melalui Sistem Lembar Kerja Belajar Mandiri — Universitas Terbuka © 2026</div>
        </div>
      </main>
    </div>
  );
}
