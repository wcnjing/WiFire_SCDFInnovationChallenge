"use client";
import { AlertTriangle } from "lucide-react";
import type { Incident } from "@/types";

export default function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  return (
    <div>
      <div className="px-3 py-2 border-b border-surface-100">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-slate-400" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Active Incidents</span>
          <span className="ml-auto text-[10px] font-mono text-slate-400">{incidents.length}</span>
        </div>
      </div>
      <div>
        {incidents.map((inc) => (
          <div key={inc.id} className="px-3 py-2 border-b border-surface-50 flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0 ${inc.type === "fire" ? "bg-red-50" : "bg-amber-50"}`}>
              {inc.type === "fire" ? "🔥" : "🏥"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{inc.desc}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{inc.severity} severity · {inc.timestamp}</p>
            </div>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${inc.status === "active" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
              {inc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
