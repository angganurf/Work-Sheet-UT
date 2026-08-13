import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatCard = ({ icon: Icon, label, value, trend, trendUp = true, caption, testid }) => (
  <div
    data-testid={testid}
    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {Icon && (
        <div className="w-8 h-8 rounded-md bg-[#EAEAF2] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#404080]" />
        </div>
      )}
    </div>
    <div className="flex items-end justify-between gap-2">
      <span className="font-heading font-black text-3xl tracking-tight text-slate-900 tabular-nums">{value}</span>
      {trend != null && (
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
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
