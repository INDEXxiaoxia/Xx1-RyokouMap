import type { TripData } from '../types/trip';
import { parseTripJson } from '../lib/tripStorage';

type ConfigModule = { default: TripData };

const bundledModules = import.meta.glob('../configs/*.json', {
  eager: true,
}) as Record<string, ConfigModule>;

const LS_CONFIGS_KEY = 'ryokou-configs-v1';
const LS_ACTIVE_CONFIG_ID_KEY = 'ryokou-active-config-id-v1';

export type TripConfigOption = {
  id: string;
  title: string;
  data: TripData;
};

function getBundledConfigs(): TripConfigOption[] {
  return Object.entries(bundledModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, mod]) => {
      const id = path.split('/').pop()?.replace(/\.json$/, '') ?? path;
      return {
        id,
        title: id.replace(/^\d+-/, ''),
        data: mod.default,
      };
    });
}

export function listBundledTripConfigs(): TripConfigOption[] {
  return getBundledConfigs();
}

function loadConfigsFromLocalStorage(): TripConfigOption[] | null {
  try {
    const raw = localStorage.getItem(LS_CONFIGS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: TripConfigOption[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') return null;
      const rec = item as { id?: unknown; title?: unknown; data?: unknown };
      if (typeof rec.id !== 'string' || typeof rec.title !== 'string') return null;
      const trip = parseTripJson(rec.data);
      if (!trip) return null;
      out.push({ id: rec.id, title: rec.title, data: trip });
    }
    return out;
  } catch {
    return null;
  }
}

function saveConfigsToLocalStorage(configs: TripConfigOption[]): void {
  localStorage.setItem(LS_CONFIGS_KEY, JSON.stringify(configs));
}

export function ensureTripConfigsInitialized(): TripConfigOption[] {
  const existing = loadConfigsFromLocalStorage();
  if (existing && existing.length > 0) return existing;
  const seeded = getBundledConfigs();
  saveConfigsToLocalStorage(seeded);
  return seeded;
}

export function listTripConfigs(): TripConfigOption[] {
  return ensureTripConfigsInitialized();
}

export function getActiveTripConfigId(): string | null {
  return localStorage.getItem(LS_ACTIVE_CONFIG_ID_KEY);
}

export function setActiveTripConfigId(id: string): void {
  localStorage.setItem(LS_ACTIVE_CONFIG_ID_KEY, id);
}

export function getDefaultTripConfig(): TripConfigOption {
  const configs = listTripConfigs();
  return configs.at(-1) ?? {
    id: 'default',
    title: '默认',
    data: {
      version: 1,
      groups: [{ id: 'default', title: '默认', placeIds: [] }],
      places: {},
      activeGroupId: 'default',
    },
  };
}

export function getBundledDefaultTripConfig(): TripConfigOption {
  const configs = listBundledTripConfigs();
  return configs.at(-1) ?? {
    id: 'default',
    title: '默认',
    data: {
      version: 1,
      groups: [{ id: 'default', title: '默认', placeIds: [] }],
      places: {},
      activeGroupId: 'default',
    },
  };
}

export function getTripConfigById(id: string): TripConfigOption | null {
  return listTripConfigs().find((c) => c.id === id) ?? null;
}

export function getBundledTripConfigById(id: string): TripConfigOption | null {
  return listBundledTripConfigs().find((c) => c.id === id) ?? null;
}

export function upsertTripConfigData(id: string, data: TripData): void {
  const configs = listTripConfigs();
  const i = configs.findIndex((c) => c.id === id);
  if (i < 0) return;
  const next = configs.map((c, idx) => (idx === i ? { ...c, data } : c));
  saveConfigsToLocalStorage(next);
}

export function createTripConfig(title: string, baseData: TripData): TripConfigOption {
  const configs = listTripConfigs();
  const id = crypto.randomUUID();
  const t = title.trim() || '新配置';
  const next: TripConfigOption = { id, title: t, data: baseData };
  const updated = [...configs, next];
  saveConfigsToLocalStorage(updated);
  setActiveTripConfigId(id);
  return next;
}

export function renameTripConfig(id: string, title: string): void {
  const configs = listTripConfigs();
  const t = title.trim();
  if (!t) return;
  const updated = configs.map((c) => (c.id === id ? { ...c, title: t } : c));
  saveConfigsToLocalStorage(updated);
}

export function deleteTripConfig(id: string): TripConfigOption | null {
  const configs = listTripConfigs();
  if (configs.length <= 1) return null;
  const updated = configs.filter((c) => c.id !== id);
  if (updated.length === configs.length) return null;
  saveConfigsToLocalStorage(updated);
  const active = getActiveTripConfigId();
  if (active === id) {
    setActiveTripConfigId(updated.at(-1)!.id);
    return updated.at(-1)!;
  }
  return null;
}
