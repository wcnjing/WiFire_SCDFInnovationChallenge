"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props { side: "left" | "right"; isOpen: boolean; onClick: () => void; }

export default function PanelToggle({ side, isOpen, onClick }: Props) {
  const left = side === "left";
  return (
    <button onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 z-30 w-5 h-10 bg-white border border-surface-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-surface-50 transition-all duration-200 shadow-sm"
      style={left ? { left: isOpen ? 280 : 0, borderTopRightRadius: 6, borderBottomRightRadius: 6 }
                   : { right: isOpen ? 320 : 0, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}>
      {left ? (isOpen ? <ChevronLeft size={12}/> : <ChevronRight size={12}/>) : (isOpen ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>)}
    </button>
  );
}
