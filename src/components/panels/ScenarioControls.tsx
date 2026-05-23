"use client";
import { WandSparkles } from "lucide-react";
import { SCENARIO_CONFIGS, SCENARIO_ORDER } from "@/lib/scenarios";
import type { ScenarioPreset } from "@/types";

interface Props {
  value: ScenarioPreset;
  onChange: (scenario: ScenarioPreset) => void;
}

export default function ScenarioControls({ value, onChange }: Props) {
  const activeScenario = SCENARIO_CONFIGS[value];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <WandSparkles size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Scenario Controls</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {SCENARIO_ORDER.map((scenario) => {
          const config = SCENARIO_CONFIGS[scenario];
          const active = value === scenario;
          return (
            <button
              key={scenario}
              type="button"
              onClick={() => onChange(scenario)}
              className={`rounded-xl border px-3 py-2 text-left transition-all ${
                active
                  ? "border-brand-300 bg-brand-50 shadow-sm"
                  : "border-surface-200 bg-white hover:border-slate-300 hover:bg-surface-50"
              }`}
            >
              <div className={`text-[11px] font-semibold ${active ? "text-brand-800" : "text-slate-700"}`}>{config.label}</div>
              <div className="mt-0.5 text-[10px] text-slate-400">+{config.timeOffset}m outlook</div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-wide text-slate-400">Scenario brief</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{activeScenario.brief}</p>
      </div>
    </div>
  );
}
