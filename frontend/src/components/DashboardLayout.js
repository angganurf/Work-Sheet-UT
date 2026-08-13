import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Menu, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const SidebarContent = ({ nav, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil keluar");
    navigate("/login", { replace: true });
  };

  const initials = (user?.nama || "U")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-[#404080] flex items-center justify-center text-white shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="leading-tight min-w-0">
          <p className="font-heading font-black tracking-tight text-sm text-slate-800 truncate">UNIVERSITAS TERBUKA</p>
          <p className="text-[10px] text-slate-400 tracking-wider uppercase truncate">Belajar Mandiri</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 px-3 mb-2">Menu</p>
        <div className="space-y-1">
          {nav.map((item) => {
            const active = item.match ? item.match(location.pathname) : location.pathname === item.to;
            return (
              <button
                key={item.label}
                data-testid={`sidebar-${item.testid}`}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else navigate(item.to);
                  onNavigate?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#EAEAF2] text-[#404080]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <div className="w-9 h-9 rounded-full bg-[#404080] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.nama}</p>
            <p className="text-xs text-slate-400 truncate">
              {user?.role === "admin" ? "Administrator" : `NIM ${user?.nim}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="logout-button"
            className="text-slate-400 hover:text-red-500 shrink-0"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DashboardLayout = ({ nav, title, subtitle, headerRight, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200 z-30">
        <SidebarContent nav={nav} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent nav={nav} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 h-16 backdrop-blur-xl bg-white/80 border-b border-slate-200 flex items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600"
              onClick={() => setOpen(true)}
              data-testid="mobile-menu-button"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-lg text-slate-900 leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          {headerRight}
        </header>

        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
};
