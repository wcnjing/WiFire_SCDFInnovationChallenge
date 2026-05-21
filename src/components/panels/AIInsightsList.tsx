"use client";
import { Brain } from "lucide-react";
import type { AIInsight } from "@/types";

const sev = { critical: "bg-red-500", warning: "bg-amber-400", info: "bg-blue-400" };

export default function AIInsightsList({ insights }: { insights: AIInsight[] }) {
  return (
    <div>
      <div className="px-3 py-2 border-b border-surface-100">
        <div className="flex items-center gap-1.5">
          <Brain size={11} className="text-slate-400" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">AI Insights</span>
        </div>
      </div>
      <div>
        {insights.map((i) => (
          <div key={i.id} className="px-3 py-2.5 border-b border-surface-50 hover:bg-surface-50 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${sev[i.severity]}`} />
              <span className="text-[10px] text-slate-400 font-medium">{i.region}</span>
              <span className="text-[10px] text-slate-300 ml-auto">{i.time}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{i.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
