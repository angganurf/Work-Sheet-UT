import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, BookOpen, CalendarClock, Trophy } from "lucide-react";
import { toast } from "sonner";

const HERO_IMG = "https://images.unsplash.com/photo-1582151767910-ceab5f532376?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

function BrandPanel({ title, subtitle }) {
  return (
    <div className="hidden lg:flex relative flex-col justify-between p-12 bg-brand-gradient overflow-hidden">
      <div className="absolute inset-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: `url('${HERO_IMG}')` }} />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-[#6366F1]/30 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3 text-white">
        <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="leading-tight">
          <p className="font-heading font-extrabold tracking-tight text-lg">UNIVERSITAS TERBUKA</p>
          <p className="text-xs text-white/70 tracking-widest uppercase">Belajar Mandiri</p>
        </div>
      </div>

      <div className="relative z-10 text-white max-w-md">
        <h1 className="font-heading font-extrabold text-4xl leading-tight mb-4">{title}</h1>
        <p className="text-white/80 text-base leading-relaxed mb-8">{subtitle}</p>
        <ul className="space-y-3.5">
          {[
            { icon: BookOpen, text: "Susun rencana belajar & metode SQ3R secara terstruktur" },
            { icon: CalendarClock, text: "Pengingat jadwal belajar mingguan otomatis" },
            { icon: Trophy, text: "Pantau progres & raih pencapaian belajarmu" },
          ].map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-white/90">
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <f.icon className="w-4.5 h-4.5" />
              </span>
              <span className="text-sm leading-snug">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 text-white/50 text-xs">© 2026 Universitas Terbuka</div>
    </div>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(nim.trim(), password);
      toast.success("Berhasil masuk");
      navigate(u.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "h-12 rounded-xl bg-white border-slate-200 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F7F7FB]">
      <BrandPanel
        title="Lembar Kerja Rencana Belajar & SQ3R"
        subtitle="Buat, kelola, dan cetak lembar kerja belajar mandiri Anda secara online — tanpa perlu mengisi di atas kertas."
      />

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-float-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand-gradient flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-heading font-extrabold text-lg text-slate-900">UNIVERSITAS TERBUKA</span>
          </div>

          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 mb-2">Selamat datang 👋</h2>
          <p className="text-slate-500 mb-8">Masuk dengan NIM dan password Anda.</p>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="nim" className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">NIM</Label>
              <Input id="nim" data-testid="login-nim-input" value={nim} onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 0666652216" className={inputCls} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Password</Label>
              <Input id="password" type="password" data-testid="login-password-input" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required />
            </div>

            {error && (
              <div data-testid="login-error" className="text-sm text-red-600 bg-red-50 border-l-4 border-red-500 px-4 py-2.5 rounded-r-xl">
                {error}
              </div>
            )}

            <Button type="submit" data-testid="login-submit-button" disabled={loading}
              className="w-full h-12 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold shadow-soft transition-colors active:scale-[0.98]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            Belum punya akun?{" "}
            <Link to="/register" data-testid="go-register-link" className="text-[#4F46E5] font-semibold hover:underline">Daftar di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
