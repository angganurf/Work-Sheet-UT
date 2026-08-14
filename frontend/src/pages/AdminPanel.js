import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Users, FileText, LayoutGrid, BarChart3, Sigma } from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid,
} from "recharts";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [allRows, setAllRows] = useState([]);
  const [stats, setStats] = useState({ total_students: 0, total_worksheets: 0 });
  const [search, setSearch] = useState("");

  const load = async (q = "") => {
    try {
      const wRes = await api.get(`/admin/worksheets${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      setRows(wRes.data);
      if (!q) setAllRows(wRes.data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
      setRows([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const sRes = await api.get("/admin/stats");
        setStats(sRes.data);
      } catch (e) {}
      await load("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], value: 0 });
    }
    allRows.forEach((w) => {
      if (!w.created_at) return;
      const d = new Date(w.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.find((x) => x.key === key);
      if (b) b.value += 1;
    });
    return buckets;
  }, [allRows]);

  const avg = stats.total_students ? (stats.total_worksheets / stats.total_students).toFixed(1) : "0";

  const nav = [
    { label: "Dashboard", icon: LayoutGrid, to: "/admin", testid: "admin-dashboard", match: (p) => p === "/admin" },
    { label: "Lembar Kerja", icon: FileText, testid: "admin-worksheets", onClick: () => document.getElementById("admin-worksheets")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  return (
    <DashboardLayout
      nav={nav}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari NIM, nama, atau judul…"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Total Mahasiswa" value={stats.total_students} caption="Akun mahasiswa terdaftar" testid="stat-total-students" />
        <StatCard icon={FileText} label="Total Lembar Kerja" value={stats.total_worksheets} caption="Seluruh lembar kerja dibuat" testid="stat-total-worksheets" />
        <StatCard icon={Sigma} label="Rata-rata / Mahasiswa" value={avg} caption="Lembar kerja per mahasiswa" testid="stat-avg" />
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-8 shadow-soft">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-[#0A0A0A]" />
          <h3 className="font-heading font-bold text-slate-800">Lembar Kerja Dibuat</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">Distribusi pembuatan lembar kerja dalam 6 bulan terakhir</p>
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A0A0A" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0A0A0A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                labelStyle={{ color: "#0A0A0A", fontWeight: 700 }}
                formatter={(v) => [`${v} lembar kerja`, ""]}
              />
              <Area type="monotone" dataKey="value" stroke="#0A0A0A" strokeWidth={2.5} fill="url(#ut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div id="admin-worksheets" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold tracking-tight text-slate-900">Seluruh Lembar Kerja</h2>
        <span className="text-sm text-slate-400">{rows ? `${rows.length} lembar kerja` : ""}</span>
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-[#0A0A0A]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400">
          Tidak ada lembar kerja ditemukan.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" data-testid="admin-table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left font-semibold p-4">NIM</th>
                  <th className="text-left font-semibold p-4">Nama Mahasiswa</th>
                  <th className="text-left font-semibold p-4">Judul Lembar Kerja</th>
                  <th className="text-left font-semibold p-4">Diperbarui</th>
                  <th className="text-right font-semibold p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors" data-testid={`admin-row-${w.id}`}>
                    <td className="p-4 text-sm font-semibold text-[#0A0A0A]">{w.nim}</td>
                    <td className="p-4 text-sm text-slate-800">{w.nama}</td>
                    <td className="p-4 text-sm text-slate-600">{w.title}</td>
                    <td className="p-4 text-sm text-slate-400">{formatDate(w.updated_at)}</td>
                    <td className="p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/worksheet/${w.id}/view`)} data-testid={`admin-view-${w.id}`} className="border-slate-200 text-[#0A0A0A] hover:bg-[#F4F4F5]">
                        <Eye className="w-3.5 h-3.5 mr-1.5" /> Lihat
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
