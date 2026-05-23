import { NextRequest, NextResponse } from "next/server";
import type { LatLng, OneMapRouteData, OneMapRouteMode } from "@/types";

const ONEMAP_ROUTE_URL = "https://www.onemap.gov.sg/api/public/routingsvc/route";
const VALID_ROUTE_TYPES = new Set<OneMapRouteMode>(["drive", "walk", "cycle"]);

interface OneMapRouteSummaryResponse {
  start_point?: string;
  end_point?: string;
  total_time?: number | string;
  total_distance?: number | string;
}

interface OneMapRouteResponse {
  status?: number | string;
  status_message?: string;
  route_geometry?: string;
  route_instructions?: unknown[];
  route_summary?: OneMapRouteSummaryResponse;
}

function parseCoordinatePair(value: string | null) {
  if (!value) return null;

  const [latText, lngText] = value.split(",");
  const lat = Number(latText);
  const lng = Number(lngText);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const coordinates: LatLng[] = [];
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length + 1);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length + 1);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      lat: lat / factor,
      lng: lng / factor,
    });
  }

  return coordinates;
}

function toNumber(value: number | string | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildErrorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const start = parseCoordinatePair(req.nextUrl.searchParams.get("start"));
  const end = parseCoordinatePair(req.nextUrl.searchParams.get("end"));
  const routeTypeParam = req.nextUrl.searchParams.get("routeType") ?? "drive";
  const routeType = VALID_ROUTE_TYPES.has(routeTypeParam as OneMapRouteMode)
    ? (routeTypeParam as OneMapRouteMode)
    : null;

  if (!start || !end) {
    return buildErrorResponse(400, "Valid start and end coordinates are required.");
  }

  if (!routeType) {
    return buildErrorResponse(400, "Route type must be drive, walk, or cycle.");
  }

  const token = process.env.ONEMAP_API_TOKEN ?? process.env.ONEMAP_TOKEN;
  if (!token) {
    return buildErrorResponse(500, "ONEMAP_API_TOKEN not set. Add it to .env.local.");
  }

  const upstreamUrl = new URL(ONEMAP_ROUTE_URL);
  upstreamUrl.searchParams.set("start", `${start.lat},${start.lng}`);
  upstreamUrl.searchParams.set("end", `${end.lat},${end.lng}`);
  upstreamUrl.searchParams.set("routeType", routeType);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: token,
        accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await upstream.text();
    let payload: OneMapRouteResponse;

    try {
      payload = JSON.parse(text) as OneMapRouteResponse;
    } catch {
      payload = { status_message: text };
    }

    if (!upstream.ok) {
      return buildErrorResponse(upstream.status, payload.status_message ?? `OneMap ${upstream.status}`);
    }

    if (!payload.route_geometry || !payload.route_summary) {
      return buildErrorResponse(502, payload.status_message ?? "OneMap did not return a route.");
    }

    const route: OneMapRouteData = {
      mode: routeType,
      summary: {
        startPoint: payload.route_summary.start_point ?? "",
        endPoint: payload.route_summary.end_point ?? "",
        totalTimeSeconds: toNumber(payload.route_summary.total_time),
        totalDistanceMeters: toNumber(payload.route_summary.total_distance),
      },
      path: decodePolyline(payload.route_geometry),
      instructionCount: Array.isArray(payload.route_instructions) ? payload.route_instructions.length : 0,
      fetchedAt: Date.now(),
    };

    return NextResponse.json(route);
  } catch (error) {
    return buildErrorResponse(500, String(error));
  }
}
