import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut } from "lucide-react";
import { toast } from "sonner";

export const TopNav = ({ right = null }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil keluar");
    navigate("/login", { replace: true });
  };

  return (
    <header className="no-print sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(user?.role === "admin" ? "/admin" : "/dashboard")}
          className="flex items-center gap-2.5 text-[#404080] transition-colors hover:text-[#29166F]"
          data-testid="nav-home-button"
        >
          <div className="w-9 h-9 rounded-md bg-[#404080] flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-left leading-tight hidden sm:block">
            <p className="font-heading font-black tracking-tight text-sm">UNIVERSITAS TERBUKA</p>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Lembar Kerja Belajar Mandiri</p>
          </div>
        </button>
        <div className="flex items-center gap-3">
          {right}
          <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
            <span className="text-sm font-semibold text-slate-800">{user?.nama}</span>
            <span className="text-xs text-slate-400">{user?.role === "admin" ? "Administrator" : `NIM ${user?.nim}`}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
