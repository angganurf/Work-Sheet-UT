import React from "react";

export const ProgressRing = ({ pct = 0, size = 72, stroke = 7, label, sub }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const color = pct >= 75 ? "#16a34a" : pct >= 40 ? "#404080" : "#f59e0b";
  return (
    <div className="flex flex-col items-center gap-1.5 w-32">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e9e9f2" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading font-black text-slate-800 tabular-nums" style={{ fontSize: size * 0.24 }}>
            {pct}%
          </span>
        </div>
      </div>
      {label && (
        <div className="text-center leading-tight">
          <p className="text-xs font-medium text-slate-700 break-words">{label}</p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
};
