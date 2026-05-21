import { NextRequest, NextResponse } from "next/server";

const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";

const ENDPOINTS: Record<string, string> = {
  incidents:   "TrafficIncidents",
  speedbands:  "v3/TrafficSpeedBands",
  traveltimes: "EstTravelTimes",
  roadworks:   "RoadWorks",
  vms:         "VMS",
};

export async function GET(req: NextRequest) {
  const dataset = req.nextUrl.searchParams.get("dataset") ?? "incidents";
  const skip = req.nextUrl.searchParams.get("skip") ?? "0";
  const endpoint = ENDPOINTS[dataset];
  if (!endpoint) return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });

  const apiKey = process.env.LTA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LTA_API_KEY not set" }, { status: 500 });

  try {
    const res = await fetch(`${LTA_BASE}/${endpoint}?$skip=${skip}`, {
      headers: { AccountKey: apiKey, accept: "application/json" },
      next: { revalidate: 60 }, // cache 60s, LTA updates every 2-5 min
    });
    if (!res.ok) return NextResponse.json({ error: `LTA ${res.status}` }, { status: res.status });
    const data = await res.json();
    return NextResponse.json({ value: data.value ?? [], fetchedAt: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}