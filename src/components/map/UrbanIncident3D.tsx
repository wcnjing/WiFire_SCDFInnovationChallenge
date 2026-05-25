"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AlertTriangle, Boxes, Building2, Expand, LoaderCircle, Minimize2, Move3D, RefreshCcw, ZoomIn } from "lucide-react";
import {
  getUrbanBuildingAddressLine,
  getUrbanBuildingDisplayLabel,
  getUrbanBuildingMapLabel,
} from "@/lib/urbanContext";
import type { Incident, UrbanBuildingContext, UrbanBuildingSelectionOptions } from "@/types";

interface Props {
  incident: Incident | null;
  buildings: UrbanBuildingContext[];
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  source: string;
  selectedBuildingId: string | null;
  onSelectBuilding?: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
  onRefresh?: () => void | Promise<void>;
}

type SceneBlock = {
  id: string;
  label: string;
  displayLabel: string;
  address: string | null;
  distanceFromIncidentMeters: number;
  heightMeters: number;
  heightCategory: UrbanBuildingContext["heightCategory"];
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  isIncidentBuilding: boolean;
  isSelected: boolean;
};

type SceneModel = {
  blocks: SceneBlock[];
  incidentBlock: SceneBlock | null;
  selectedBlock: SceneBlock | null;
  focusBlock: SceneBlock | null;
  groundSize: number;
  maxHeight: number;
};

type BlockTone = {
  fill: number;
  roof: string;
  left: string;
  right: string;
  edge: number;
  marker: string;
  badgeClassName: string;
  labelClassName: string;
};

type RenderMode = "three" | "fallback";

const MAX_SCENE_BUILDINGS = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function browserSupportsWebGL() {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext
      && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function projectRelativeMeters(originLat: number, originLng: number, lat: number, lng: number) {
  const averageLatRadians = (((originLat + lat) / 2) * Math.PI) / 180;
  return {
    x: (lng - originLng) * 111_320 * Math.cos(averageLatRadians),
    z: -(lat - originLat) * 111_320,
  };
}

function heightFromCategory(category: UrbanBuildingContext["heightCategory"]) {
  if (category === "High") return 48;
  if (category === "Medium") return 30;
  if (category === "Low") return 18;
  return 22;
}

function getIndicativeHeightMeters(building: UrbanBuildingContext) {
  const categoryHeight = heightFromCategory(building.heightCategory);
  const measuredHeight = Number.isFinite(building.estimatedHeight) && building.estimatedHeight > 0
    ? building.estimatedHeight
    : categoryHeight;

  if (building.isLikelyIncidentBuilding) {
    return Math.max(measuredHeight, categoryHeight) + 4;
  }

  return Math.max(measuredHeight, categoryHeight);
}

function getFallbackFootprintSizeMeters(building: UrbanBuildingContext) {
  const categoryBase = building.heightCategory === "High"
    ? 34
    : building.heightCategory === "Medium"
      ? 26
      : building.heightCategory === "Low"
        ? 20
        : 24;
  const variationSeed = simpleHash(building.id) % 7;
  const width = categoryBase + variationSeed;
  const depth = Math.max(categoryBase * 0.78, 16) + (variationSeed % 4);

  return { width, depth };
}

function measureFootprintAroundIncident(building: UrbanBuildingContext, incident: Incident) {
  const fallbackSize = getFallbackFootprintSizeMeters(building);
  const centroidMeters = projectRelativeMeters(incident.lat, incident.lng, building.centroid.lat, building.centroid.lng);

  if (!Array.isArray(building.coordinates) || building.coordinates.length < 3) {
    return {
      centerX: centroidMeters.x,
      centerZ: centroidMeters.z,
      widthMeters: fallbackSize.width,
      depthMeters: fallbackSize.depth,
    };
  }

  const points = building.coordinates.map(([lng, lat]) => projectRelativeMeters(incident.lat, incident.lng, lat, lng));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const widthMeters = maxX - minX;
  const depthMeters = maxZ - minZ;

  if (widthMeters < 4 || depthMeters < 4) {
    return {
      centerX: centroidMeters.x,
      centerZ: centroidMeters.z,
      widthMeters: fallbackSize.width,
      depthMeters: fallbackSize.depth,
    };
  }

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    widthMeters,
    depthMeters,
  };
}

function compareBlocksForPriority(
  building: UrbanBuildingContext,
  other: UrbanBuildingContext,
  selectedBuildingId: string | null,
) {
  const buildingPriority = Number(!(building.id === selectedBuildingId && building.isLikelyIncidentBuilding))
    + Number(!(building.id === selectedBuildingId))
    + Number(!building.isLikelyIncidentBuilding);
  const otherPriority = Number(!(other.id === selectedBuildingId && other.isLikelyIncidentBuilding))
    + Number(!(other.id === selectedBuildingId))
    + Number(!other.isLikelyIncidentBuilding);

  if (buildingPriority !== otherPriority) return buildingPriority - otherPriority;
  if (building.distanceFromIncidentMeters !== other.distanceFromIncidentMeters) {
    return building.distanceFromIncidentMeters - other.distanceFromIncidentMeters;
  }

  return getUrbanBuildingDisplayLabel(building).localeCompare(getUrbanBuildingDisplayLabel(other));
}

function buildSceneModel(
  buildings: UrbanBuildingContext[],
  incident: Incident | null,
  selectedBuildingId: string | null,
): SceneModel {
  if (!incident) {
    return {
      blocks: [],
      incidentBlock: null,
      selectedBlock: null,
      focusBlock: null,
      groundSize: 120,
      maxHeight: 0,
    };
  }

  const shortlisted = [...buildings]
    .sort((left, right) => compareBlocksForPriority(left, right, selectedBuildingId))
    .slice(0, MAX_SCENE_BUILDINGS);

  if (!shortlisted.length) {
    return {
      blocks: [],
      incidentBlock: null,
      selectedBlock: null,
      focusBlock: null,
      groundSize: 120,
      maxHeight: 0,
    };
  }

  const rawBlocks = shortlisted.map((building) => {
    const footprint = measureFootprintAroundIncident(building, incident);
    return {
      building,
      ...footprint,
      heightMeters: getIndicativeHeightMeters(building),
    };
  });

  const rawIncidentBlock = rawBlocks.find((block) => block.building.isLikelyIncidentBuilding) ?? rawBlocks[0];
  const rawSelectedBlock = selectedBuildingId
    ? rawBlocks.find((block) => block.building.id === selectedBuildingId) ?? null
    : null;
  const rawFocusBlock = rawSelectedBlock ?? rawIncidentBlock;

  const minX = Math.min(...rawBlocks.map((block) => block.centerX - (block.widthMeters / 2)));
  const maxX = Math.max(...rawBlocks.map((block) => block.centerX + (block.widthMeters / 2)));
  const minZ = Math.min(...rawBlocks.map((block) => block.centerZ - (block.depthMeters / 2)));
  const maxZ = Math.max(...rawBlocks.map((block) => block.centerZ + (block.depthMeters / 2)));
  const spanMeters = Math.max(maxX - minX, maxZ - minZ, 70);
  const horizontalScale = clamp(96 / spanMeters, 0.24, 1.08);
  const verticalScale = 0.42;

  const blocks = rawBlocks.map(({ building, centerX, centerZ, widthMeters, depthMeters, heightMeters }) => ({
    id: building.id,
    label: getUrbanBuildingMapLabel(building),
    displayLabel: getUrbanBuildingDisplayLabel(building),
    address: getUrbanBuildingAddressLine(building),
    distanceFromIncidentMeters: building.distanceFromIncidentMeters,
    heightMeters,
    heightCategory: building.heightCategory,
    x: (centerX - rawFocusBlock.centerX) * horizontalScale,
    z: (centerZ - rawFocusBlock.centerZ) * horizontalScale,
    width: clamp(widthMeters * horizontalScale, 7, 32),
    depth: clamp(depthMeters * horizontalScale, 7, 32),
    height: clamp(heightMeters * verticalScale, 8, 42),
    isIncidentBuilding: building.isLikelyIncidentBuilding,
    isSelected: building.id === selectedBuildingId,
  }));

  const maxFootprintExtent = blocks.reduce((maxExtent, block) => Math.max(
    maxExtent,
    Math.abs(block.x) + (block.width / 2),
    Math.abs(block.z) + (block.depth / 2),
  ), 36);
  const groundSize = clamp((maxFootprintExtent * 2) + 32, 110, 180);
  const maxHeight = blocks.reduce((highest, block) => Math.max(highest, block.height), 0);
  const selectedBlock = blocks.find((block) => block.isSelected) ?? null;
  const incidentBlock = blocks.find((block) => block.isIncidentBuilding) ?? selectedBlock ?? blocks[0] ?? null;
  const focusBlock = selectedBlock ?? incidentBlock ?? blocks[0] ?? null;

  return {
    blocks,
    incidentBlock,
    selectedBlock,
    focusBlock,
    groundSize,
    maxHeight,
  };
}

function getSourceLabel(source: string, isFallback: boolean) {
  if (isFallback) return "Fallback demo data";
  if (source.toLowerCase().includes("data.gov.sg") || source.toLowerCase().includes("ura")) {
    return "URA / data.gov.sg";
  }
  return source;
}

function getBlockTone(block: SceneBlock): BlockTone {
  if (block.isIncidentBuilding && block.isSelected) {
    return {
      fill: 0xfb7185,
      roof: "#fecdd3",
      left: "#be123c",
      right: "#f43f5e",
      edge: 0xffedd5,
      marker: "#fb7185",
      badgeClassName: "border-rose-300/70 bg-rose-500/15 text-rose-100",
      labelClassName: "border-rose-300/60 bg-rose-500/18 text-rose-50",
    };
  }

  if (block.isIncidentBuilding) {
    return {
      fill: 0xf43f5e,
      roof: "#fda4af",
      left: "#9f1239",
      right: "#e11d48",
      edge: 0xfecdd3,
      marker: "#fb7185",
      badgeClassName: "border-rose-300/60 bg-rose-500/12 text-rose-100",
      labelClassName: "border-rose-300/50 bg-rose-500/14 text-rose-50",
    };
  }

  if (block.isSelected) {
    return {
      fill: 0xf59e0b,
      roof: "#fde68a",
      left: "#b45309",
      right: "#d97706",
      edge: 0xfde68a,
      marker: "#f59e0b",
      badgeClassName: "border-amber-300/60 bg-amber-400/14 text-amber-50",
      labelClassName: "border-amber-300/55 bg-amber-400/18 text-amber-50",
    };
  }

  return {
    fill: 0x38bdf8,
    roof: "#7dd3fc",
    left: "#0f4c81",
    right: "#0e7490",
    edge: 0xb6e8ff,
    marker: "#38bdf8",
    badgeClassName: "border-cyan-300/40 bg-cyan-400/10 text-cyan-50",
    labelClassName: "border-slate-600 bg-slate-950/85 text-slate-100",
  };
}

function formatHeightLabel(block: SceneBlock | null) {
  if (!block) return "No building selected";
  return `${Math.round(block.heightMeters)} m (${block.heightCategory})`;
}

function selectBlock(
  onSelectBuilding: Props["onSelectBuilding"],
  buildingId: string,
  options?: UrbanBuildingSelectionOptions,
) {
  onSelectBuilding?.(buildingId, options);
}

function buildLabelBlocks(blocks: SceneBlock[], selectedBuildingId: string | null, isFullscreen: boolean) {
  const maxLabels = isFullscreen ? 5 : 3;
  return [...blocks]
    .sort((left, right) => {
      const leftPriority = Number(!(left.id === selectedBuildingId && left.isIncidentBuilding))
        + Number(!(left.id === selectedBuildingId))
        + Number(!left.isIncidentBuilding);
      const rightPriority = Number(!(right.id === selectedBuildingId && right.isIncidentBuilding))
        + Number(!(right.id === selectedBuildingId))
        + Number(!right.isIncidentBuilding);

      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (left.distanceFromIncidentMeters !== right.distanceFromIncidentMeters) {
        return left.distanceFromIncidentMeters - right.distanceFromIncidentMeters;
      }

      return left.displayLabel.localeCompare(right.displayLabel);
    })
    .slice(0, maxLabels);
}

function buildIsoPoint(x: number, z: number, y: number) {
  const centerX = 170;
  const baseY = 180;
  return {
    x: centerX + ((x - z) * 1.05),
    y: baseY + ((x + z) * 0.54) - (y * 1.18),
  };
}

function fallbackFacePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ") + " Z";
}

function FallbackScene({
  model,
  isFallback,
  onSelectBuilding,
}: {
  model: SceneModel;
  isFallback: boolean;
  onSelectBuilding?: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
}) {
  const sortedBlocks = [...model.blocks].sort((left, right) => (left.x + left.z) - (right.x + right.z));

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 340 232" className="h-full w-full" aria-label="Simplified 3D fallback incident context">
        <rect x="0" y="0" width="340" height="232" fill="#020617" />
        {[...Array(6)].map((_, index) => {
          const offset = -56 + (index * 22);
          const start = buildIsoPoint(-62, offset, 0);
          const end = buildIsoPoint(62, offset, 0);
          return (
            <line
              key={`grid-x-${offset}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#162338"
              strokeWidth="1"
            />
          );
        })}
        {[...Array(6)].map((_, index) => {
          const offset = -56 + (index * 22);
          const start = buildIsoPoint(offset, -62, 0);
          const end = buildIsoPoint(offset, 62, 0);
          return (
            <line
              key={`grid-z-${offset}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#162338"
              strokeWidth="1"
            />
          );
        })}

        {sortedBlocks.map((block) => {
          const tone = getBlockTone(block);
          const halfWidth = block.width / 2;
          const halfDepth = block.depth / 2;
          const top = {
            nw: buildIsoPoint(block.x - halfWidth, block.z - halfDepth, block.height),
            ne: buildIsoPoint(block.x + halfWidth, block.z - halfDepth, block.height),
            se: buildIsoPoint(block.x + halfWidth, block.z + halfDepth, block.height),
            sw: buildIsoPoint(block.x - halfWidth, block.z + halfDepth, block.height),
          };
          const base = {
            nw: buildIsoPoint(block.x - halfWidth, block.z - halfDepth, 0),
            ne: buildIsoPoint(block.x + halfWidth, block.z - halfDepth, 0),
            se: buildIsoPoint(block.x + halfWidth, block.z + halfDepth, 0),
            sw: buildIsoPoint(block.x - halfWidth, block.z + halfDepth, 0),
          };

          return (
            <g
              key={block.id}
              role="button"
              tabIndex={0}
              aria-label={`Focus ${block.displayLabel}`}
              className="cursor-pointer"
              onClick={() => selectBlock(onSelectBuilding, block.id, { focusMap: true })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectBlock(onSelectBuilding, block.id, { focusMap: true });
                }
              }}
            >
              <path
                d={fallbackFacePath([base.nw, base.sw, top.sw, top.nw])}
                fill={tone.left}
                stroke={block.isSelected ? "#fff7ed" : "#10233b"}
                strokeWidth="1"
              />
              <path
                d={fallbackFacePath([base.ne, base.se, top.se, top.ne])}
                fill={tone.right}
                stroke={block.isSelected ? "#fff7ed" : "#10233b"}
                strokeWidth="1"
              />
              <path
                d={fallbackFacePath([top.nw, top.ne, top.se, top.sw])}
                fill={tone.roof}
                stroke={block.isSelected ? "#ffffff" : "#dbeafe"}
                strokeWidth={block.isSelected || block.isIncidentBuilding ? 1.4 : 1}
              />
            </g>
          );
        })}

        {model.incidentBlock && (
          <>
            <line
              x1={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height).x}
              y1={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height).y}
              x2={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height + 16).x}
              y2={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height + 16).y}
              stroke="#fecdd3"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height + 18).x}
              cy={buildIsoPoint(model.incidentBlock.x, model.incidentBlock.z, model.incidentBlock.height + 18).y}
              r="5"
              fill="#fb7185"
              stroke="#fff1f2"
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="rounded-full border border-slate-700 bg-slate-950/90 px-3 py-1 text-[10px] font-semibold text-slate-200">
          SVG fallback renderer
        </div>
      </div>

      {isFallback && (
        <div className="absolute right-3 top-3 rounded-full border border-amber-400/40 bg-amber-400/12 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
          Fallback demo data
        </div>
      )}
    </div>
  );
}

export default function UrbanIncident3D({
  incident,
  buildings,
  loading,
  error,
  isFallback,
  source,
  selectedBuildingId,
  onSelectBuilding,
  onRefresh,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latestSelectBuildingRef = useRef<typeof onSelectBuilding>(onSelectBuilding);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("three");

  useEffect(() => {
    latestSelectBuildingRef.current = onSelectBuilding;
  }, [onSelectBuilding]);

  const sceneModel = useMemo(
    () => buildSceneModel(buildings, incident, selectedBuildingId),
    [buildings, incident, selectedBuildingId],
  );
  const labelBlocks = useMemo(
    () => buildLabelBlocks(sceneModel.blocks, selectedBuildingId, isFullscreen),
    [isFullscreen, sceneModel.blocks, selectedBuildingId],
  );
  const sourceLabel = useMemo(() => getSourceLabel(source, isFallback), [isFallback, source]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!incident || !containerRef.current) {
      setSceneReady(false);
      return undefined;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    setSceneReady(false);
    setSceneError(null);

    if (!browserSupportsWebGL()) {
      setRenderMode("fallback");
      setSceneError("WebGL unavailable. Showing simplified SVG fallback view.");
      setSceneReady(true);
      return undefined;
    }

    try {
      setRenderMode("three");

      const container = containerRef.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      rendererRef.current = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x020617, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);
      scene.fog = new THREE.Fog(0x020617, 80, 210);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000);
      const sceneGroup = new THREE.Group();
      scene.add(sceneGroup);

      scene.add(new THREE.AmbientLight(0xdbeafe, 1.5));

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
      keyLight.position.set(48, 66, 30);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.85);
      fillLight.position.set(-26, 24, -40);
      scene.add(fillLight);

      const warmLight = new THREE.DirectionalLight(0xf97316, 0.28);
      warmLight.position.set(0, 16, 42);
      scene.add(warmLight);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(sceneModel.groundSize, sceneModel.groundSize),
        new THREE.MeshStandardMaterial({
          color: 0x08111f,
          roughness: 0.96,
          metalness: 0.05,
        }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      sceneGroup.add(ground);

      const grid = new THREE.GridHelper(sceneModel.groundSize, 10, 0x243244, 0x12202f);
      grid.position.y = 0.02;
      sceneGroup.add(grid);

      const clickableMeshes: THREE.Mesh[] = [];
      const disposableGeometries: THREE.BufferGeometry[] = [];
      const disposableMaterials: THREE.Material[] = [];
      const trackMaterial = (material: THREE.Material | THREE.Material[]) => {
        if (Array.isArray(material)) {
          disposableMaterials.push(...material);
          return;
        }

        disposableMaterials.push(material);
      };

      disposableGeometries.push(ground.geometry, grid.geometry);
      trackMaterial(ground.material);
      trackMaterial(grid.material);

      const incidentMarkerGroup = new THREE.Group();
      let incidentRing: THREE.Mesh | null = null;
      let incidentBeacon: THREE.Mesh | null = null;

      sceneModel.blocks.forEach((block) => {
        const tone = getBlockTone(block);
        const geometry = new THREE.BoxGeometry(block.width, block.height, block.depth);
        const material = new THREE.MeshStandardMaterial({
          color: tone.fill,
          roughness: block.isIncidentBuilding ? 0.34 : 0.5,
          metalness: block.isSelected ? 0.24 : 0.14,
          emissive: block.isIncidentBuilding ? 0x2a0814 : block.isSelected ? 0x2a1400 : 0x04111f,
          emissiveIntensity: block.isSelected || block.isIncidentBuilding ? 0.34 : 0.15,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.x, block.height / 2, block.z);
        mesh.userData = { buildingId: block.id };
        sceneGroup.add(mesh);
        clickableMeshes.push(mesh);
        disposableGeometries.push(geometry);
        disposableMaterials.push(material);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: tone.edge,
            transparent: true,
            opacity: block.isSelected || block.isIncidentBuilding ? 0.95 : 0.7,
          }),
        );
        edges.position.copy(mesh.position);
        sceneGroup.add(edges);
        disposableGeometries.push(edges.geometry);
        trackMaterial(edges.material);

        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(block.width * 1.14, block.depth * 1.14),
          new THREE.MeshBasicMaterial({
            color: 0x020617,
            transparent: true,
            opacity: 0.22,
          }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(block.x + 1.6, 0.02, block.z + 2.3);
        sceneGroup.add(shadow);
        disposableGeometries.push(shadow.geometry);
        trackMaterial(shadow.material);

        if (block.isIncidentBuilding) {
          const ringGeometry = new THREE.TorusGeometry(Math.max(block.width, block.depth) * 0.46, 0.55, 14, 48);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xfb7185,
            transparent: true,
            opacity: 0.95,
          });
          incidentRing = new THREE.Mesh(ringGeometry, ringMaterial);
          incidentRing.rotation.x = -Math.PI / 2;
          incidentRing.position.set(block.x, 0.14, block.z);
          incidentMarkerGroup.add(incidentRing);
          disposableGeometries.push(ringGeometry);
          disposableMaterials.push(ringMaterial);

          const mastGeometry = new THREE.CylinderGeometry(0.18, 0.18, 12, 10);
          const mastMaterial = new THREE.MeshStandardMaterial({
            color: 0xfecdd3,
            emissive: 0x43111d,
            emissiveIntensity: 0.24,
          });
          const mast = new THREE.Mesh(mastGeometry, mastMaterial);
          mast.position.set(block.x, block.height + 6, block.z);
          incidentMarkerGroup.add(mast);
          disposableGeometries.push(mastGeometry);
          disposableMaterials.push(mastMaterial);

          const beaconGeometry = new THREE.SphereGeometry(1.7, 18, 18);
          const beaconMaterial = new THREE.MeshStandardMaterial({
            color: 0xfb7185,
            emissive: 0xfb7185,
            emissiveIntensity: 0.72,
            metalness: 0.18,
            roughness: 0.22,
          });
          incidentBeacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
          incidentBeacon.position.set(block.x, block.height + 12, block.z);
          incidentMarkerGroup.add(incidentBeacon);
          disposableGeometries.push(beaconGeometry);
          disposableMaterials.push(beaconMaterial);
        }
      });

      sceneGroup.add(incidentMarkerGroup);

      const focusBlock = sceneModel.focusBlock ?? sceneModel.incidentBlock ?? sceneModel.blocks[0] ?? null;
      const focusTarget = new THREE.Vector3(
        focusBlock?.x ?? 0,
        Math.max((focusBlock?.height ?? 0) * 0.36, 8),
        focusBlock?.z ?? 0,
      );
      const highestStructure = Math.max(sceneModel.maxHeight, 18);
      const cameraDistance = Math.max(sceneModel.groundSize * 0.92, 86);
      camera.position.copy(focusTarget).add(new THREE.Vector3(
        cameraDistance * 0.72,
        highestStructure + 48,
        cameraDistance * 0.98,
      ));
      camera.lookAt(focusTarget);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = true;
      controls.screenSpacePanning = true;
      controls.target.copy(focusTarget);
      controls.minDistance = 28;
      controls.maxDistance = Math.max(sceneModel.groundSize * 2.3, 210);
      controls.minPolarAngle = Math.PI / 6;
      controls.maxPolarAngle = Math.PI / 2.08;
      controls.update();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPosition: { x: number; y: number } | null = null;
      let pointerDragged = false;

      const updateRendererSize = () => {
        if (!containerRef.current || !rendererRef.current) return;

        const width = Math.max(containerRef.current.clientWidth, 1);
        const height = Math.max(containerRef.current.clientHeight, 1);
        rendererRef.current.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const getIntersections = (clientX: number, clientY: number) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -(((clientY - bounds.top) / bounds.height) * 2 - 1);
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(clickableMeshes, false);
      };

      const handlePointerDown = (event: PointerEvent) => {
        pointerDownPosition = { x: event.clientX, y: event.clientY };
        pointerDragged = false;
        renderer.domElement.style.cursor = "grabbing";
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (pointerDownPosition) {
          const deltaX = event.clientX - pointerDownPosition.x;
          const deltaY = event.clientY - pointerDownPosition.y;
          if (Math.sqrt((deltaX ** 2) + (deltaY ** 2)) > 5) {
            pointerDragged = true;
          }
        }

        const intersects = getIntersections(event.clientX, event.clientY);
        if (pointerDragged) {
          renderer.domElement.style.cursor = event.buttons === 2 ? "grabbing" : "grab";
          return;
        }

        renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "grab";
      };

      const handlePointerLeave = () => {
        renderer.domElement.style.cursor = "";
      };

      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
      };

      const handlePointerUp = (event: PointerEvent) => {
        const wasDragged = pointerDragged;
        pointerDownPosition = null;
        pointerDragged = false;

        const intersects = getIntersections(event.clientX, event.clientY);
        renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "grab";

        if (wasDragged) return;

        const buildingId = intersects[0]?.object.userData?.buildingId;
        if (typeof buildingId === "string") {
          latestSelectBuildingRef.current?.(buildingId, { focusMap: true });
        }
      };

      renderer.domElement.style.cursor = "grab";
      renderer.domElement.addEventListener("pointerdown", handlePointerDown);
      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.addEventListener("pointerup", handlePointerUp);
      renderer.domElement.addEventListener("contextmenu", handleContextMenu);

      const renderLoop = (timestamp: number) => {
        if (cancelled) return;

        const t = timestamp * 0.001;

        if (incidentRing) {
          const ringScale = 1 + (Math.sin(t * 2.4) * 0.06);
          incidentRing.scale.set(ringScale, ringScale, ringScale);
        }

        if (incidentBeacon && sceneModel.incidentBlock) {
          incidentBeacon.position.y = sceneModel.incidentBlock.height + 12 + (Math.sin(t * 2.8) * 1.1);
        }

        controls.update();
        renderer.render(scene, camera);
        animationFrameRef.current = window.requestAnimationFrame(renderLoop);
      };

      updateRendererSize();
      animationFrameRef.current = window.requestAnimationFrame(renderLoop);
      setSceneReady(true);

      resizeObserver = new ResizeObserver(() => {
        updateRendererSize();
      });
      resizeObserver.observe(container);

      return () => {
        renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
        renderer.domElement.removeEventListener("pointerup", handlePointerUp);
        renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
        controls.dispose();

        disposableGeometries.forEach((geometry) => geometry.dispose());
        disposableMaterials.forEach((material) => material.dispose());

        if (animationFrameRef.current != null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        resizeObserver?.disconnect();
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
      };
    } catch (caughtError) {
      setRenderMode("fallback");
      setSceneError(
        caughtError instanceof Error
          ? `${caughtError.message} Showing simplified SVG fallback view.`
          : "Unable to initialize WebGL scene. Showing simplified SVG fallback view.",
      );
      setSceneReady(true);
      return undefined;
    }
  }, [incident, sceneModel]);

  useEffect(() => () => {
    if (animationFrameRef.current != null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    rendererRef.current?.dispose();
    rendererRef.current = null;
  }, []);

  async function handleToggleFullscreen() {
    const root = rootRef.current;
    if (!root) return;

    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } catch (caughtError) {
      setSceneError(
        caughtError instanceof Error
          ? caughtError.message
          : "Fullscreen mode is not available for this scene.",
      );
    }
  }

  if (!incident) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-[11px] text-slate-400">
        Select an incident to generate simplified 3D urban context.
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.98),rgba(2,6,23,1))] text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] ${
        isFullscreen ? "h-full rounded-none border-0 shadow-none" : "rounded-2xl"
      }`}
    >
      <div className={`border-b border-slate-800 ${isFullscreen ? "px-5 py-4" : "px-4 py-3"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-cyan-300" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Simplified 3D Urban Context
              </div>
              <div className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                {sourceLabel}
              </div>
              {renderMode === "fallback" && (
                <div className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-200">
                  SVG fallback
                </div>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              Incident #{incident.id}: {incident.desc}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Operational context layer generated around the selected incident. Building heights are indicative where exact height is unavailable.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onRefresh?.()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
            >
              <RefreshCcw size={12} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-400/16"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Expand size={12} />}
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </div>
      </div>

      <div className={isFullscreen ? "px-5 py-4" : "px-3 py-3"}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div
            ref={containerRef}
            className="w-full"
            style={{ height: isFullscreen ? "calc(100vh - 260px)" : "360px" }}
          >
            {renderMode === "fallback" && (
              <FallbackScene
                model={sceneModel}
                isFallback={isFallback}
                onSelectBuilding={latestSelectBuildingRef.current}
              />
            )}
          </div>

          {labelBlocks.length > 0 && (
            <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-2">
              {labelBlocks.map((block) => {
                const tone = getBlockTone(block);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => selectBlock(onSelectBuilding, block.id, { focusMap: true })}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur transition-transform hover:-translate-y-0.5 ${tone.labelClassName}`}
                  >
                    {block.label}
                  </button>
                );
              })}
            </div>
          )}

          {(!sceneReady || loading || sceneError || error) && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[10px] text-slate-300">
              {!sceneReady && renderMode === "three" ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={12} className="animate-spin text-cyan-300" />
                  Initializing tokenless 3D scene...
                </span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={12} className="animate-spin text-cyan-300" />
                  Loading nearby building context...
                </span>
              ) : (sceneError || error) ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-300" />
                  {sceneError ?? error ?? "3D scene loaded with partial context."}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <Move3D size={11} className="text-cyan-300" />
            Left drag to orbit
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <Building2 size={11} className="text-amber-300" />
            Right drag to pan
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <ZoomIn size={11} className="text-emerald-300" />
            Scroll to zoom
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Incident Building</div>
            <div className="mt-1 text-[11px] font-semibold text-rose-100">
              {sceneModel.incidentBlock ? sceneModel.incidentBlock.displayLabel : "Building not mapped"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Nearby Buildings</div>
            <div className="mt-1 text-[11px] font-semibold text-cyan-100">
              {sceneModel.blocks.length} blocks in scene
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-500">
              <Boxes size={11} className="text-slate-500" />
              Indicative Height
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">
              {formatHeightLabel(sceneModel.selectedBlock ?? sceneModel.incidentBlock)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
