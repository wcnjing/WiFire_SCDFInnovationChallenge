"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { FireStation, Incident, AIInsight, TimeOffset, WeatherStationImpact } from "@/types";
import StationCard from "@/components/panels/StationCard";
import IncidentFeed from "@/components/panels/IncidentFeed";
import AIInsightsList from "@/components/panels/AIInsightsList";

interface Props {
  isOpen: boolean; selectedStation: FireStation | null; timeOffset: TimeOffset;
  incidents: Incident[]; insights: AIInsight[];
  selectedStationWeatherImpact?: WeatherStationImpact | null;
}

export default function RightPanel({ isOpen, selectedStation, timeOffset, incidents, insights, selectedStationWeatherImpact }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-white border-l border-surface-200 flex flex-col overflow-y-auto shrink-0 z-20 scrollbar-thin">
          <StationCard station={selectedStation} timeOffset={timeOffset} weatherImpact={selectedStationWeatherImpact} />
          <IncidentFeed incidents={incidents} />
          <AIInsightsList insights={insights} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
