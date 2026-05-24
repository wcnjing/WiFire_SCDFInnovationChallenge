import { NextRequest, NextResponse } from "next/server";
import { createFallbackUrbanBuildings } from "@/lib/fallbackData";
import type { URABuildingContextResponse, UrbanBuildingContext } from "@/types";

const BUILDING_DATASET_ID = "d_e8e3249d4433845bdd8034ae44329d9e";
const POLL_DOWNLOAD_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${BUILDING_DATASET_ID}/poll-download`;
const ONEMAP_REVERSE_GEOCODE_URL = "https://www.onemap.gov.sg/api/public/revgeocode";
const SOURCE_LABEL = "URA via data.gov.sg";
const GEOJSON_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ADDRESS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type RawRecord = Record<string, unknown>;

interface PollDownloadResponse {
  code?: number;
  data?: {
    status?: string;
    url?: string;
  };
  errorMsg?: string;
}

interface GeoJsonFeatureCollection {
  type?: string;
  features?: GeoJsonFeature[];
}

interface GeoJsonFeature {
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  properties?: RawRecord | null;
}

interface GeoJsonCache {
  features: GeoJsonFeature[];
  expiresAt: number;
}

interface ReverseGeocodePayload {
  GeocodeInfo?: Array<{
    BUILDINGNAME?: string;
    BLOCK?: string;
    ROAD?: string;
    POSTALCODE?: string;
    LATITUDE?: string;
    LONGITUDE?: string;
  }>;
}

interface NormalizedAddress {
  name: string | null;
  blockNumber: string | null;
  roadName: string | null;
  postalCode: string | null;
  fullAddress: string | null;
}

let geoJsonCache: GeoJsonCache | null = null;
const addressCache = new Map<string, { address: NormalizedAddress | null; expiresAt: number }>();

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const deltaLat = (aLat - bLat) * 111_320;
  const deltaLng = (aLng - bLng) * 111_320 * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  return Math.sqrt(deltaLat ** 2 + deltaLng ** 2);
}

function parseLatLng(value: string | null) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeAddressField(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === "nil" || lowered === "null" || lowered === "na" || lowered === "n/a") {
    return null;
  }

  return trimmed;
}

function heightProfileFromArea(area: number | null, identifierSeed: number) {
  const areaValue = area ?? 0;
  const variation = identifierSeed % 3;

  if (areaValue >= 4500) {
    return { estimatedHeight: 58 + variation * 6, heightCategory: "High" as const };
  }
  if (areaValue >= 1800) {
    return { estimatedHeight: 30 + variation * 4, heightCategory: "Medium" as const };
  }
  return { estimatedHeight: 14 + variation * 3, heightCategory: "Low" as const };
}

function parseCoordinatePair(value: unknown) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  return [lng, lat] as [number, number];
}

function parseLinearRing(value: unknown) {
  if (!Array.isArray(value)) return null;

  const ring = value
    .map((entry) => parseCoordinatePair(entry))
    .filter((entry): entry is [number, number] => entry !== null);

  return ring.length >= 3 ? ring : null;
}

function extractPolygonCoordinates(feature: GeoJsonFeature) {
  const geometry = feature.geometry;
  if (!geometry || !geometry.type) return null;

  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return parseLinearRing(geometry.coordinates[0]);
  }

  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    const firstPolygon = geometry.coordinates[0];
    if (Array.isArray(firstPolygon)) {
      return parseLinearRing(firstPolygon[0]);
    }
  }

  return null;
}

function centroid(coordinates: [number, number][]) {
  return coordinates.reduce(
    (accumulator, [lng, lat]) => ({
      lng: accumulator.lng + lng / coordinates.length,
      lat: accumulator.lat + lat / coordinates.length,
    }),
    { lng: 0, lat: 0 },
  );
}

function buildFullAddress(address: Omit<NormalizedAddress, "fullAddress">) {
  const firstLine = [address.blockNumber ? `Blk ${address.blockNumber}` : null, address.roadName]
    .filter(Boolean)
    .join(" ");

  if (firstLine && address.postalCode) return `${firstLine}, Singapore ${address.postalCode}`;
  if (firstLine) return firstLine;
  if (address.postalCode) return `Singapore ${address.postalCode}`;
  return null;
}

function buildResponse(
  lat: number,
  lng: number,
  radius: number,
  buildings: UrbanBuildingContext[],
  isFallback: boolean,
): URABuildingContextResponse {
  return {
    source: SOURCE_LABEL,
    incident: {
      latitude: lat,
      longitude: lng,
    },
    radius,
    isFallback,
    buildings,
  };
}

async function fetchDatasetFeatures() {
  const now = Date.now();
  if (geoJsonCache && geoJsonCache.expiresAt > now) {
    return geoJsonCache.features;
  }

  const pollResponse = await fetch(POLL_DOWNLOAD_URL, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!pollResponse.ok) {
    throw new Error(`Dataset download poll failed with HTTP ${pollResponse.status}.`);
  }

  const pollPayload = await pollResponse.json() as PollDownloadResponse;
  const downloadUrl = typeof pollPayload.data?.url === "string" ? pollPayload.data.url : null;

  if (!downloadUrl) {
    throw new Error(pollPayload.errorMsg || "Dataset download URL was not returned.");
  }

  const geoJsonResponse = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!geoJsonResponse.ok) {
    throw new Error(`GeoJSON download failed with HTTP ${geoJsonResponse.status}.`);
  }

  const payload = await geoJsonResponse.json() as GeoJsonFeatureCollection;
  const features = Array.isArray(payload.features) ? payload.features : [];

  geoJsonCache = {
    features,
    expiresAt: now + GEOJSON_CACHE_TTL_MS,
  };

  return features;
}

async function reverseGeocodeBuilding(lat: number, lng: number, buffer: number) {
  const token = process.env.ONEMAP_API_TOKEN ?? process.env.ONEMAP_TOKEN;
  if (!token) return null;

  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)},${buffer}`;
  const now = Date.now();
  const cached = addressCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.address;
  }

  const url = new URL(ONEMAP_REVERSE_GEOCODE_URL);
  url.searchParams.set("location", `${lat.toFixed(6)},${lng.toFixed(6)}`);
  url.searchParams.set("buffer", String(Math.max(10, Math.min(Math.round(buffer), 120))));
  url.searchParams.set("addressType", "All");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: token,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as ReverseGeocodePayload;
    const nearest = Array.isArray(payload.GeocodeInfo) ? payload.GeocodeInfo[0] : null;
    if (!nearest) {
      addressCache.set(cacheKey, { address: null, expiresAt: now + ADDRESS_CACHE_TTL_MS });
      return null;
    }

    const address: NormalizedAddress = {
      name: normalizeAddressField(nearest.BUILDINGNAME),
      blockNumber: normalizeAddressField(nearest.BLOCK),
      roadName: normalizeAddressField(nearest.ROAD),
      postalCode: normalizeAddressField(nearest.POSTALCODE),
      fullAddress: null,
    };

    address.fullAddress = buildFullAddress(address);
    addressCache.set(cacheKey, { address, expiresAt: now + ADDRESS_CACHE_TTL_MS });
    return address;
  } catch {
    return null;
  }
}

async function findNearbyBuildings(features: GeoJsonFeature[], incidentLat: number, incidentLng: number, radius: number) {
  const nearby: UrbanBuildingContext[] = [];

  for (const feature of features) {
    const coordinates = extractPolygonCoordinates(feature);
    if (!coordinates) continue;

    const center = centroid(coordinates);
    const distanceFromIncidentMeters = distanceMeters(incidentLat, incidentLng, center.lat, center.lng);

    if (distanceFromIncidentMeters > Math.max(radius * 1.2, 450)) continue;

    const properties = feature.properties ?? {};
    const objectId = Number(properties.OBJECTID ?? properties.objectid ?? 0);
    const footprintArea = Number(properties["SHAPE.AREA"] ?? properties.SHAPE_AREA ?? 0);
    const { estimatedHeight, heightCategory } = heightProfileFromArea(
      Number.isFinite(footprintArea) && footprintArea > 0 ? footprintArea : null,
      Number.isFinite(objectId) ? objectId : nearby.length + 1,
    );

    nearby.push({
      id: String(properties.OBJECTID ?? properties.objectid ?? `building-${nearby.length + 1}`),
      name: null,
      blockNumber: null,
      roadName: null,
      postalCode: null,
      fullAddress: null,
      buildingType: "Unknown",
      heightCategory,
      estimatedHeight,
      centroid: { lat: center.lat, lng: center.lng },
      coordinates,
      distanceFromIncidentMeters,
      isLikelyIncidentBuilding: false,
    });
  }

  nearby.sort((left, right) => left.distanceFromIncidentMeters - right.distanceFromIncidentMeters);

  if (nearby[0]) {
    nearby[0].isLikelyIncidentBuilding = true;
  }

  const shortlisted = nearby.slice(0, 12);
  const enriched = await Promise.all(shortlisted.map(async (building) => {
    const address = await reverseGeocodeBuilding(
      building.centroid.lat,
      building.centroid.lng,
      Math.min(Math.max(Math.round(building.distanceFromIncidentMeters / 2), 20), 80),
    );

    if (!address) return building;

    return {
      ...building,
      name: address.name ?? building.name,
      blockNumber: address.blockNumber,
      roadName: address.roadName,
      postalCode: address.postalCode,
      fullAddress: address.fullAddress,
    } satisfies UrbanBuildingContext;
  }));

  return enriched;
}

export async function GET(request: NextRequest) {
  const lat = parseLatLng(request.nextUrl.searchParams.get("lat"));
  const lng = parseLatLng(request.nextUrl.searchParams.get("lng"));
  const rawRadius = parseLatLng(request.nextUrl.searchParams.get("radius"));

  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
  }

  const radius = rawRadius === null ? 300 : Math.min(Math.max(rawRadius, 80), 800);
  const fallbackBuildings = createFallbackUrbanBuildings(lat, lng, radius);

  try {
    const features = await fetchDatasetFeatures();
    const buildings = await findNearbyBuildings(features, lat, lng, radius);

    if (buildings.length === 0) {
      return NextResponse.json(buildResponse(lat, lng, radius, fallbackBuildings, true));
    }

    return NextResponse.json(buildResponse(lat, lng, radius, buildings, false));
  } catch {
    return NextResponse.json(buildResponse(lat, lng, radius, fallbackBuildings, true));
  }
}
