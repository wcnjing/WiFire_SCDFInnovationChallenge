"use client";
import { motion } from "framer-motion";

interface KPICardProps { label: string; value: string | number; status?: "green"|"amber"|"red"|"neutral"; delay?: number; }
const colors = { green: "text-coverage-green", amber: "text-coverage-amber", red: "text-coverage-red", neutral: "text-slate-900" };

export default function KPICard({ label, value, status = "neutral", delay = 0 }: KPICardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}
      className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
      <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
      <div className={`text-lg font-bold font-mono tracking-tight ${colors[status]}`}>{value}</div>
    </motion.div>
  );
}

export function KPIGrid({ items }: { items: KPICardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item, i) => <KPICard key={item.label} {...item} delay={i * 0.05} />)}
    </div>
  );
}
