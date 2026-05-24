"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  side: "left" | "right";
  isOpen: boolean;
  onClick: () => void;
}

const PANEL_WIDTH = {
  left: 280,
  right: 340,
} as const;

const CLOSED_GAP = 14;
const OPEN_GAP = 6;

export default function PanelToggle({ side, isOpen, onClick }: Props) {
  const left = side === "left";
  const openOffset = PANEL_WIDTH[side];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? `Close ${side} panel` : `Open ${side} panel`}
      className="fixed top-1/2 z-[1400] flex h-10 w-5 -translate-y-1/2 items-center justify-center border border-surface-200 bg-white text-slate-500 shadow-[0_12px_24px_rgba(15,23,42,0.16)] ring-2 ring-white/80 transition-all duration-200 hover:bg-surface-50 hover:text-slate-700"
      style={
        left
          ? {
              left: isOpen ? openOffset + OPEN_GAP : CLOSED_GAP,
              borderTopRightRadius: 8,
              borderBottomRightRadius: 8,
            }
          : {
              right: isOpen ? openOffset + OPEN_GAP : CLOSED_GAP,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            }
      }
    >
      {left
        ? (isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />)
        : (isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />)}
    </button>
  );
}
