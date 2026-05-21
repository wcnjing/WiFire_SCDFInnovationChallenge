"use client";
import { useState, useEffect } from "react";

export function useLiveTick(intervalMs: number = 5000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return tick;
}

export function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}
