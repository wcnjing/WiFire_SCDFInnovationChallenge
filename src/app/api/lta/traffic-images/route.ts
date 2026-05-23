import https from "node:https";
import { NextResponse } from "next/server";
import type { TrafficCameraSnapshot } from "@/types";

const TRAFFIC_IMAGES_URL = "https://datamall2.mytransport.sg/ltaodataservice/Traffic-Imagesv2";
const DEV_TLS_AGENT = new https.Agent({ rejectUnauthorized: false });

interface UpstreamResponse {
  status: number;
  body: string;
}

interface RawTrafficImageCamera {
  CameraID?: string | number;
  Latitude?: string | number;
  Longitude?: string | number;
  ImageLink?: string;
}

async function fetchTrafficImagesResponse(accountKey: string): Promise<UpstreamResponse> {
  try {
    const response = await fetch(TRAFFIC_IMAGES_URL, {
      headers: {
        AccountKey: accountKey,
        accept: "application/json",
      },
      cache: "no-store",
    });

    return { status: response.status, body: await response.text() };
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return await fetchTrafficImagesResponseWithRelaxedTls(accountKey);
  }
}

function fetchTrafficImagesResponseWithRelaxedTls(accountKey: string): Promise<UpstreamResponse> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      TRAFFIC_IMAGES_URL,
      {
        method: "GET",
        headers: {
          AccountKey: accountKey,
          accept: "application/json",
        },
        agent: DEV_TLS_AGENT,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode ?? 500, body }));
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function normalizeCamera(camera: RawTrafficImageCamera): TrafficCameraSnapshot | null {
  const cameraId = camera.CameraID == null ? "" : String(camera.CameraID);
  const latitude = Number(camera.Latitude);
  const longitude = Number(camera.Longitude);
  const imageLink = typeof camera.ImageLink === "string" ? camera.ImageLink.trim() : "";

  if (!cameraId || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !imageLink) {
    return null;
  }

  return {
    cameraId,
    latitude,
    longitude,
    imageLink,
  };
}

export async function GET() {
  const accountKey = process.env.LTA_ACCOUNT_KEY;
  const headers = { "Cache-Control": "no-store" };

  if (!accountKey) {
    return NextResponse.json({ error: "LTA_ACCOUNT_KEY not set. Add it to .env.local." }, { status: 500, headers });
  }

  try {
    const upstream = await fetchTrafficImagesResponse(accountKey);

    if (upstream.status < 200 || upstream.status >= 300) {
      return NextResponse.json(
        { error: "Unable to fetch traffic camera snapshots from LTA DataMall." },
        { status: upstream.status >= 500 ? 502 : upstream.status, headers },
      );
    }

    const payload = JSON.parse(upstream.body);
    const rawCameras = Array.isArray(payload?.value) ? payload.value as RawTrafficImageCamera[] : [];
    const cameras = rawCameras
      .map((camera) => normalizeCamera(camera))
      .filter((camera): camera is TrafficCameraSnapshot => camera !== null);

    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        source: "LTA DataMall",
        cameras,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch traffic camera snapshots from LTA DataMall." },
      { status: 500, headers },
    );
  }
}
