"use client";
import { Layers, Truck, CloudRain, AlertTriangle } from "lucide-react";

function Toggle({ label, icon, enabled, onToggle }: { label: string; icon: React.ReactNode; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5 cursor-pointer group" onClick={onToggle}>
      <span className="flex items-center gap-2 text-xs font-medium text-slate-600 group-hover:text-slate-800 transition-colors">{icon}{label}</span>
      <button className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${enabled ? "bg-brand-800" : "bg-slate-300"}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200 shadow-sm ${enabled ? "left-[14px]" : "left-[2px]"}`} />
      </button>
    </div>
  );
}

interface Props {
  showTraffic: boolean; showWeather: boolean; showIncidents: boolean;
  onToggleTraffic: () => void; onToggleWeather: () => void; onToggleIncidents: () => void;
}

export default function MapLayers(p: Props) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Layers size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Map Layers</span>
      </div>
      <div className="space-y-0.5">
        <Toggle label="Traffic Overlay" icon={<Truck size={12} className="text-slate-400"/>} enabled={p.showTraffic} onToggle={p.onToggleTraffic} />
        <Toggle label="Weather" icon={<CloudRain size={12} className="text-slate-400"/>} enabled={p.showWeather} onToggle={p.onToggleWeather} />
        <Toggle label="Incidents" icon={<AlertTriangle size={12} className="text-slate-400"/>} enabled={p.showIncidents} onToggle={p.onToggleIncidents} />
      </div>
    </div>
  );
}
