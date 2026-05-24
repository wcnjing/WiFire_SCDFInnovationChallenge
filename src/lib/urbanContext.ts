import type { UrbanBuildingContext } from "@/types";

function normalizeField(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === "nil" || lowered === "null" || lowered === "na" || lowered === "n/a") {
    return null;
  }

  return trimmed;
}

export function getUrbanBuildingName(building: UrbanBuildingContext) {
  return normalizeField(building.name);
}

export function getUrbanBuildingBlockNumber(building: UrbanBuildingContext) {
  return normalizeField(building.blockNumber);
}

export function getUrbanBuildingRoadName(building: UrbanBuildingContext) {
  return normalizeField(building.roadName);
}

export function getUrbanBuildingPostalCode(building: UrbanBuildingContext) {
  return normalizeField(building.postalCode);
}

export function getUrbanBuildingAddressLine(building: UrbanBuildingContext) {
  const fullAddress = normalizeField(building.fullAddress);
  if (fullAddress) return fullAddress;

  const block = getUrbanBuildingBlockNumber(building);
  const road = getUrbanBuildingRoadName(building);
  const postal = getUrbanBuildingPostalCode(building);
  const firstLine = [block ? `Blk ${block}` : null, road].filter(Boolean).join(" ");

  if (firstLine && postal) return `${firstLine}, Singapore ${postal}`;
  if (firstLine) return firstLine;
  if (postal) return `Singapore ${postal}`;
  return null;
}

export function getUrbanBuildingMapLabel(building: UrbanBuildingContext) {
  const block = getUrbanBuildingBlockNumber(building);
  const name = getUrbanBuildingName(building);

  if (block) return `Blk ${block}`;
  if (name) return name;
  if (building.isLikelyIncidentBuilding) return "Incident building";
  return "Nearby building";
}

export function getUrbanBuildingDisplayLabel(building: UrbanBuildingContext) {
  const block = getUrbanBuildingBlockNumber(building);
  const name = getUrbanBuildingName(building);
  const road = getUrbanBuildingRoadName(building);

  if (block && name) return `Blk ${block} ${name}`;
  if (block && road) return `Blk ${block} ${road}`;
  if (block) return `Blk ${block}`;
  if (name) return name;
  if (road) return road;
  if (building.isLikelyIncidentBuilding) return "Likely incident building";
  return "Nearby building";
}

export function getUrbanBuildingSecondaryLabel(building: UrbanBuildingContext) {
  const name = getUrbanBuildingName(building);
  const road = getUrbanBuildingRoadName(building);
  const address = getUrbanBuildingAddressLine(building);

  if (name && address && !address.includes(name)) return address;
  if (road) return road;
  return address;
}
