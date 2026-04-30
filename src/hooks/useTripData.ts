import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  parseTripJson,
} from '../lib/tripStorage';
import { getPlanTripSeed } from '../data/planTripSeed';
import {
  createTripConfig,
  deleteTripConfig,
  ensureTripConfigsInitialized,
  getBundledDefaultTripConfig,
  getBundledTripConfigById,
  getActiveTripConfigId,
  getDefaultTripConfig,
  getTripConfigById,
  listBundledTripConfigs,
  listTripConfigs,
  renameTripConfig,
  setActiveTripConfigId,
  upsertTripConfigData,
} from '../data/tripConfigs';
import type { Place, TripData } from '../types/trip';
import { createEmptyTrip } from '../types/trip';

export type TripAction =
  | { type: 'mergePlanSeed' }
  | { type: 'replace'; data: TripData }
  | { type: 'addGroup'; title?: string }
  | { type: 'setActiveGroup'; id: string | null }
  | { type: 'removeGroup'; id: string }
  | { type: 'renameGroup'; id: string; title: string }
  | { type: 'setGroupGuide'; id: string; guideMd: string }
  | {
      type: 'addPlace';
      groupId: string;
      name: string;
      lat: number;
      lng: number;
      address?: string;
    }
  | { type: 'updatePlace'; id: string; patch: Partial<Omit<Place, 'id'>> }
  | { type: 'removePlace'; id: string }
  | { type: 'reorderPlaces'; groupId: string; placeIds: string[] }
  | { type: 'reorderGroups'; groupIds: string[] }
  | { type: 'movePlaceToGroup'; placeId: string; targetGroupId: string };

function stripPlaces(data: TripData, removeIds: Set<string>): Record<string, Place> {
  const next = { ...data.places };
  for (const id of removeIds) {
    delete next[id];
  }
  return next;
}

function tripReducer(state: TripData, action: TripAction): TripData {
  switch (action.type) {
    case 'mergePlanSeed': {
      const seed = getPlanTripSeed();
      let places = { ...state.places };
      let groups = state.groups.map((g) => ({ ...g, placeIds: [...g.placeIds] }));

      for (const sg of seed.groups) {
        const gi = groups.findIndex((g) => g.title.trim() === sg.title.trim());
        if (gi === -1) continue;

        const existingNames = new Set(
          groups[gi]!.placeIds.map((id) => places[id]?.name?.trim()).filter((n): n is string => Boolean(n)),
        );

        const placeIds = [...groups[gi]!.placeIds];
        for (const spid of sg.placeIds) {
          const sp = seed.places[spid];
          if (!sp) continue;
          const nm = sp.name.trim();
          if (existingNames.has(nm)) {
            if (sp.pinned) {
              const existingId = groups[gi]!.placeIds.find((id) => places[id]?.name.trim() === nm);
              if (existingId && !places[existingId]?.pinned) {
                places = {
                  ...places,
                  [existingId]: { ...places[existingId]!, pinned: true },
                };
              }
            }
            continue;
          }

          const nid = crypto.randomUUID();
          places = {
            ...places,
            [nid]: {
              id: nid,
              name: sp.name,
              lat: sp.lat,
              lng: sp.lng,
              note: sp.note,
              address: sp.address,
              pinned: sp.pinned,
            },
          };
          placeIds.push(nid);
          existingNames.add(nm);
        }

        groups = groups.map((g, i) => (i === gi ? { ...g, placeIds } : g));
      }

      return { ...state, places, groups };
    }

    case 'replace':
      return action.data;

    case 'addGroup': {
      const id = crypto.randomUUID();
      const title = action.title?.trim() || '新分组';
      return {
        ...state,
        groups: [...state.groups, { id, title, placeIds: [] }],
        activeGroupId: id,
      };
    }

    case 'setActiveGroup':
      return { ...state, activeGroupId: action.id };

    case 'removeGroup': {
      const g = state.groups.find((x) => x.id === action.id);
      if (!g) return state;
      const remove = new Set(g.placeIds);
      const places = stripPlaces(state, remove);
      const groups = state.groups.filter((x) => x.id !== action.id);
      let activeGroupId = state.activeGroupId;
      if (activeGroupId === action.id) {
        activeGroupId = groups[0]?.id ?? null;
      }
      return { ...state, groups, places, activeGroupId };
    }

    case 'renameGroup':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, title: action.title.trim() || g.title } : g,
        ),
      };

    case 'setGroupGuide':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, guideMd: action.guideMd } : g,
        ),
      };

    case 'addPlace': {
      const pid = crypto.randomUUID();
      const place: Place = {
        id: pid,
        name: action.name.trim() || '未命名地点',
        lat: action.lat,
        lng: action.lng,
        note: '',
        address: action.address?.trim() || undefined,
      };
      return {
        ...state,
        places: { ...state.places, [pid]: place },
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, placeIds: [...g.placeIds, pid] } : g,
        ),
      };
    }

    case 'updatePlace': {
      const prev = state.places[action.id];
      if (!prev) return state;
      return {
        ...state,
        places: {
          ...state.places,
          [action.id]: { ...prev, ...action.patch },
        },
      };
    }

    case 'removePlace': {
      const id = action.id;
      if (!state.places[id]) return state;
      const restPlaces = { ...state.places };
      delete restPlaces[id];
      return {
        ...state,
        places: restPlaces,
        groups: state.groups.map((g) => ({
          ...g,
          placeIds: g.placeIds.filter((pid) => pid !== id),
        })),
      };
    }

    case 'reorderPlaces': {
      const g = state.groups.find((x) => x.id === action.groupId);
      if (!g) return state;
      const same =
        g.placeIds.length === action.placeIds.length &&
        g.placeIds.every((id, i) => id === action.placeIds[i]);
      if (same) return state;
      const set = new Set(g.placeIds);
      if (action.placeIds.some((id) => !set.has(id))) return state;
      return {
        ...state,
        groups: state.groups.map((gr) =>
          gr.id === action.groupId ? { ...gr, placeIds: action.placeIds } : gr,
        ),
      };
    }

    case 'reorderGroups': {
      const nextIds = action.groupIds;
      if (nextIds.length !== state.groups.length) return state;
      const cur = new Set(state.groups.map((g) => g.id));
      if (nextIds.some((id) => !cur.has(id))) return state;
      const byId = new Map(state.groups.map((g) => [g.id, g] as const));
      const next = nextIds.map((id) => byId.get(id)).filter(Boolean) as typeof state.groups;
      if (next.length !== state.groups.length) return state;
      return { ...state, groups: next };
    }

    case 'movePlaceToGroup': {
      const { placeId, targetGroupId } = action;
      if (!state.places[placeId]) return state;
      const sourceGroup = state.groups.find((g) => g.placeIds.includes(placeId));
      if (!sourceGroup || sourceGroup.id === targetGroupId) return state;
      if (!state.groups.some((g) => g.id === targetGroupId)) return state;
      return {
        ...state,
        groups: state.groups.map((g) => {
          if (g.id === sourceGroup.id) {
            return { ...g, placeIds: g.placeIds.filter((id) => id !== placeId) };
          }
          if (g.id === targetGroupId) {
            return { ...g, placeIds: [...g.placeIds, placeId] };
          }
          return g;
        }),
      };
    }

    default:
      return state;
  }
}

export type UseTripDataOptions = {
  /** 为 false 时不把当前 reducer 状态写回本地存储（展示页用，避免误持久化）。 */
  persist?: boolean;
  /** 为 false 时不在挂载时合并内置 seed（展示页用）。 */
  mergePlanSeedOnMount?: boolean;
  /** 配置来源：local=读写浏览器缓存；bundled=仅读取打包的 configs/*.json。 */
  source?: 'local' | 'bundled';
};

export function useTripData(options?: UseTripDataOptions) {
  const persist = options?.persist !== false;
  const mergePlanSeedOnMount = options?.mergePlanSeedOnMount !== false;
  const source = options?.source ?? 'local';
  const readOnlyBundled = source === 'bundled';
  const listConfigs = readOnlyBundled ? listBundledTripConfigs : listTripConfigs;
  const getConfigById = readOnlyBundled ? getBundledTripConfigById : getTripConfigById;
  const getDefaultConfig = readOnlyBundled ? getBundledDefaultTripConfig : getDefaultTripConfig;

  const [configs, setConfigs] = useState(() => listConfigs());
  const [activeConfigId, setActiveConfigIdState] = useState<string>(() => {
    if (!readOnlyBundled) {
      ensureTripConfigsInitialized();
      const fromLs = getActiveTripConfigId();
      if (fromLs && getConfigById(fromLs)) return fromLs;
    }
    return getDefaultConfig().id;
  });

  const [data, dispatch] = useReducer(tripReducer, undefined, () => {
    const cfg = getConfigById(activeConfigId) ?? getDefaultConfig();
    if (!readOnlyBundled) setActiveTripConfigId(cfg.id);
    return cfg.data;
  });

  useEffect(() => {
    if (!mergePlanSeedOnMount) return;
    dispatch({ type: 'mergePlanSeed' });
  }, [mergePlanSeedOnMount]);

  useEffect(() => {
    if (!persist) return;
    upsertTripConfigData(activeConfigId, data);
  }, [persist, activeConfigId, data]);

  const activeGroup = useMemo(() => {
    if (!data.activeGroupId) return data.groups[0] ?? null;
    return data.groups.find((g) => g.id === data.activeGroupId) ?? data.groups[0] ?? null;
  }, [data.activeGroupId, data.groups]);

  const importFromJsonText = useCallback((text: string): { ok: true } | { ok: false; error: string } => {
    try {
      const parsed: unknown = JSON.parse(text);
      const trip = parseTripJson(parsed);
      if (!trip) {
        return { ok: false, error: 'JSON 格式不符合行程数据结构' };
      }
      dispatch({ type: 'replace', data: trip });
      return { ok: true };
    } catch {
      return { ok: false, error: '无法解析 JSON' };
    }
  }, []);

  const resetTrip = useCallback(() => {
    dispatch({ type: 'replace', data: createEmptyTrip() });
  }, []);

  const refreshConfigs = useCallback(() => {
    setConfigs(listConfigs());
  }, [listConfigs]);

  const switchTripConfig = useCallback((id: string) => {
    const cfg = getConfigById(id);
    if (!cfg) return;
    if (!readOnlyBundled) setActiveTripConfigId(id);
    setActiveConfigIdState(id);
    dispatch({ type: 'replace', data: cfg.data });
    refreshConfigs();
  }, [getConfigById, readOnlyBundled, refreshConfigs]);

  const newTripConfig = useCallback(
    (title: string) => {
      const created = createTripConfig(title, data);
      setActiveConfigIdState(created.id);
      dispatch({ type: 'replace', data: created.data });
      refreshConfigs();
      return created;
    },
    [data, refreshConfigs],
  );

  const renameCurrentTripConfig = useCallback(
    (title: string) => {
      renameTripConfig(activeConfigId, title);
      refreshConfigs();
    },
    [activeConfigId, refreshConfigs],
  );

  const deleteCurrentTripConfig = useCallback(() => {
    const next = deleteTripConfig(activeConfigId);
    if (next) {
      setActiveConfigIdState(next.id);
      dispatch({ type: 'replace', data: next.data });
    }
    refreshConfigs();
  }, [activeConfigId, refreshConfigs]);

  return {
    data,
    dispatch,
    activeGroup,
    activeConfigId,
    configOptions: configs,
    importFromJsonText,
    resetTrip,
    switchTripConfig,
    newTripConfig,
    renameCurrentTripConfig,
    deleteCurrentTripConfig,
  };
}
