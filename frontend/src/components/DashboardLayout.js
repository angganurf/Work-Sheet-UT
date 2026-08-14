import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Search, Bell, HelpCircle, Plus } from "lucide-react";
import { toast } from "sonner";

const SidebarContent = ({ nav, primaryAction, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success("Berhasil keluar");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="h-[72px] flex items-center gap-3 px-5 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
          <span className="font-heading font-extrabold text-white text-sm tracking-tight">UT</span>
        </div>
        <div className="leading-tight min-w-0">
          <p className="font-heading font-extrabold tracking-tight text-[15px] text-neutral-900 truncate">Worksheet UT</p>
          <p className="text-[11px] text-neutral-400 truncate">Academic Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
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
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </div>

        {primaryAction && (
          <div className="mt-6">
            <Button
              data-testid="sidebar-new-worksheet"
              onClick={() => { primaryAction.onClick(); onNavigate?.(); }}
              className="w-full h-12 rounded-xl bg-neutral-900 hover:bg-black text-white font-semibold transition-colors active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-2" /> {primaryAction.label}
            </Button>
          </div>
        )}
      </nav>

      {/* Footer: Help + Logout */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <button
          onClick={() => toast.info("Pusat Bantuan segera hadir")}
          data-testid="help-center-button"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" /> <span>Help Center</span>
        </button>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" /> <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export const DashboardLayout = ({
  nav, primaryAction, headerRight, children,
  searchValue, onSearchChange, searchPlaceholder = "Search worksheets, courses...",
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(searchValue || "");

  const initials = (user?.nama || "U")
    .split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  const handleSearch = (v) => {
    setQ(v);
    if (onSearchChange) onSearchChange(v);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200 z-30">
        <SidebarContent nav={nav} primaryAction={primaryAction} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent nav={nav} primaryAction={primaryAction} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 h-[72px] bg-[#F4F4F5]/80 backdrop-blur-xl flex items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden text-neutral-600 shrink-0"
              onClick={() => setOpen(true)} data-testid="mobile-menu-button">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                data-testid="topbar-search"
                value={q}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !onSearchChange) navigate("/dashboard"); }}
                placeholder={searchPlaceholder}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {headerRight}
            <button className="relative text-neutral-500 hover:text-neutral-900 transition-colors" data-testid="notif-button" title="Notifikasi">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neutral-900 ring-2 ring-[#F4F4F5]" />
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-4 sm:pl-5 border-l border-slate-200">
              <div className="text-right leading-tight">
                <p className="text-sm font-semibold text-neutral-900 truncate max-w-[160px]">{user?.nama}</p>
                <p className="text-xs text-neutral-400">{user?.role === "admin" ? "Administrator" : user?.nim}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 pt-2 sm:pt-2 pb-24 lg:pb-8">{children}</main>
      </div>
    </div>
  );
};
