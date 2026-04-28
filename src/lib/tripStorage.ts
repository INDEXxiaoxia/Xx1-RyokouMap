import { TRIP_DATA_VERSION, type Group, type Place, type TripData } from '../types/trip';

import { getPlanTripSeed } from '../data/planTripSeed';

const STORAGE_KEY = 'ryokou-hangzhou-trip-v2';
const LEGACY_STORAGE_KEY = 'ryokou-hangzhou-trip-v1';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isPlace(x: unknown): x is Place {
  if (!isRecord(x)) return false;
  return (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.lat === 'number' &&
    typeof x.lng === 'number' &&
    typeof x.note === 'string' &&
    (x.address === undefined || typeof x.address === 'string') &&
    (x.pinned === undefined || typeof x.pinned === 'boolean')
  );
}

function isGroup(x: unknown): x is Group {
  if (!isRecord(x)) return false;
  if (typeof x.id !== 'string' || typeof x.title !== 'string' || !Array.isArray(x.placeIds)) {
    return false;
  }
  if (x.guideMd !== undefined && typeof x.guideMd !== 'string') return false;
  return x.placeIds.every((id): id is string => typeof id === 'string');
}

export function parseTripJson(raw: unknown): TripData | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== TRIP_DATA_VERSION) return null;
  if (!Array.isArray(raw.groups) || !isRecord(raw.places)) return null;
  if (typeof raw.activeGroupId !== 'string' && raw.activeGroupId !== null) return null;

  const groups: Group[] = [];
  for (const g of raw.groups) {
    if (!isGroup(g)) return null;
    groups.push(g);
  }
  if (groups.length === 0) return null;

  const places: Record<string, Place> = {};
  for (const [key, value] of Object.entries(raw.places)) {
    if (!isPlace(value) || value.id !== key) return null;
    places[key] = value;
  }

  for (const g of groups) {
    for (const pid of g.placeIds) {
      if (!places[pid]) return null;
    }
  }

  const placeIdsInGroups = new Set(groups.flatMap((g) => g.placeIds));
  for (const id of Object.keys(places)) {
    if (!placeIdsInGroups.has(id)) return null;
  }

  let activeGroupId = raw.activeGroupId as string | null;
  if (activeGroupId !== null && !groups.some((g) => g.id === activeGroupId)) {
    activeGroupId = groups[0]?.id ?? null;
  }

  return {
    version: TRIP_DATA_VERSION,
    groups,
    places,
    activeGroupId,
  };
}

export function loadFromStorage(): TripData | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    const parsed: unknown = JSON.parse(s);
    return parseTripJson(parsed);
  } catch {
    return null;
  }
}

export function saveToStorage(data: TripData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getInitialTrip(): TripData {
  const current = loadFromStorage();
  if (current) return current;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const trip = parseTripJson(parsed);
      if (trip) {
        saveToStorage(trip);
        return trip;
      }
    }
  } catch {
    /* ignore */
  }
  return getPlanTripSeed();
}

export function exportTripFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `hangzhou-trip-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
