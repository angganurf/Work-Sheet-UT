import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#29166F] overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1779819710368-3e57daa007c1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHw0fHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwYnVpbGRpbmclMjBhYnN0cmFjdCUyMGJsdWV8ZW58MHx8fHwxNzg2NjI1MzA0fDA&ixlib=rb-4.1.0&q=85')",
          }}
        />
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="w-11 h-11 rounded-md bg-white/15 backdrop-blur flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <p className="font-heading font-black tracking-tight text-lg">UNIVERSITAS TERBUKA</p>
            <p className="text-xs text-white/70 tracking-widest uppercase">Belajar Mandiri</p>
          </div>
        </div>
        <div className="relative z-10 text-white max-w-md">
          <h1 className="font-heading font-black text-4xl leading-tight mb-4">
            Lembar Kerja Rencana Belajar & SQ3R
          </h1>
          <p className="text-white/75 text-base leading-relaxed">
            Buat, kelola, dan cetak lembar kerja belajar mandiri Anda secara online —
            tanpa perlu mengisi di atas kertas.
          </p>
        </div>
        <div className="relative z-10 text-white/50 text-xs">© 2026 Universitas Terbuka</div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#F8F9FA]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-[#404080]">
            <BookOpen className="w-6 h-6" />
            <span className="font-heading font-black text-lg">UNIVERSITAS TERBUKA</span>
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Masuk
          </h2>
          <p className="text-slate-500 mb-8">Gunakan NIM dan password Anda.</p>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="nim" className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                NIM
              </Label>
              <Input
                id="nim"
                data-testid="login-nim-input"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 0666652216"
                className="h-11 bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-white focus:border-[#404080] focus:ring-1 focus:ring-[#404080]"
                required
              />
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="text-sm text-red-600 bg-red-50 border-l-4 border-red-500 px-4 py-2.5 rounded-r"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-11 bg-[#404080] hover:bg-[#29166F] text-white font-semibold transition-colors active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            Belum punya akun?{" "}
            <Link to="/register" data-testid="go-register-link" className="text-[#404080] font-semibold hover:underline">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
