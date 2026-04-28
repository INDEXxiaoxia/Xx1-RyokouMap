export const TRIP_DATA_VERSION = 1 as const;

export type Place = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  note: string;
  pinned?: boolean;
};

export type Group = {
  id: string;
  title: string;
  placeIds: string[];
  /** 分组/日期攻略便笺（Markdown） */
  guideMd?: string;
};

export type TripData = {
  version: typeof TRIP_DATA_VERSION;
  groups: Group[];
  places: Record<string, Place>;
  activeGroupId: string | null;
};

export function createEmptyTrip(): TripData {
  const gid = crypto.randomUUID();
  return {
    version: TRIP_DATA_VERSION,
    groups: [{ id: gid, title: '5月2日', placeIds: [] }],
    places: {},
    activeGroupId: gid,
  };
}
