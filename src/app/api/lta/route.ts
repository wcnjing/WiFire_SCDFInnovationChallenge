import https from "node:https";
import { NextRequest, NextResponse } from "next/server";

const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";
const DEV_TLS_AGENT = new https.Agent({ rejectUnauthorized: false });

const ENDPOINTS: Record<string, string> = {
  incidents:   "TrafficIncidents",
  speedbands:  "v4/TrafficSpeedBands",
  traveltimes: "EstTravelTimes",
  roadworks:   "RoadWorks",
  vms:         "VMS",
};

interface UpstreamResponse {
  status: number;
  body: string;
}

async function fetchLTAResponse(url: string, apiKey: string): Promise<UpstreamResponse> {
  try {
    const res = await fetch(url, {
      headers: { AccountKey: apiKey, accept: "application/json" },
      next: { revalidate: 60 }, // cache 60s, LTA updates every 2-5 min
    });
    return { status: res.status, body: await res.text() };
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return await fetchLTAResponseWithRelaxedTls(url, apiKey);
  }
}

function fetchLTAResponseWithRelaxedTls(url: string, apiKey: string): Promise<UpstreamResponse> {
  // Local certificate stores can block undici fetch in dev. Keep the TLS workaround
  // scoped to this route and only outside production so the prototype stays usable.
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "GET",
      headers: { AccountKey: apiKey, accept: "application/json" },
      agent: DEV_TLS_AGENT,
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode ?? 500, body }));
    });

    req.on("error", reject);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const dataset = req.nextUrl.searchParams.get("dataset") ?? "incidents";
  const skip = req.nextUrl.searchParams.get("skip") ?? "0";
  const endpoint = ENDPOINTS[dataset];
  if (!endpoint) return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });

  const apiKey = process.env.LTA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LTA_API_KEY not set" }, { status: 500 });

  try {
    const upstream = await fetchLTAResponse(`${LTA_BASE}/${endpoint}?$skip=${skip}`, apiKey);
    if (upstream.status < 200 || upstream.status >= 300) {
      return NextResponse.json({ error: `LTA ${upstream.status}` }, { status: upstream.status });
    }
    const data = JSON.parse(upstream.body);
    return NextResponse.json({ value: data.value ?? [], fetchedAt: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
