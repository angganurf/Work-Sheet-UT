import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const COLORS = {
  indigo: { bg: "bg-[#F4F4F5]", fg: "text-[#0A0A0A]" },
  amber: { bg: "bg-[#FEF3C7]", fg: "text-[#D97706]" },
  teal: { bg: "bg-[#CCFBF1]", fg: "text-[#0D9488]" },
  coral: { bg: "bg-[#FFE4E6]", fg: "text-[#E11D48]" },
};

export const StatCard = ({ icon: Icon, label, value, trend, trendUp = true, caption, testid, color = "indigo" }) => {
  const c = COLORS[color] || COLORS.indigo;
  return (
    <div
      data-testid={testid}
      className="group bg-white border border-[#E7E7F0] rounded-2xl p-5 flex flex-col gap-3 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-transform duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
            <Icon className={`w-4.5 h-4.5 ${c.fg}`} />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-heading font-extrabold text-3xl tracking-tight text-slate-900 tabular-nums">{value}</span>
        {trend != null && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}
          >
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      {caption && <p className="text-xs text-slate-400 leading-snug">{caption}</p>}
    </div>
  );
};
