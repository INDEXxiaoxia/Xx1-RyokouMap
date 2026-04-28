import { useEffect, useMemo, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import type { Place, TripData } from '../types/trip';
import { DEFAULT_CENTER, DEFAULT_ZOOM, groupColor } from '../constants';
import ReactMarkdown from 'react-markdown';

type LayerGroup = {
  groupId: string;
  groupIndex: number;
  placeIds: string[];
};

type TripMapProps = {
  data: TripData;
  resolvedGroupId: string | null;
  showAllGroups: boolean;
  onShowAllPlaces: (v: boolean) => void;
  showAllPopups: boolean;
  onShowAllPopups: (v: boolean) => void;
  selectedPlaceId: string | null;
  pickMode: boolean;
  onPickMode: (v: boolean) => void;
  fitTrigger: number;
  onFitMap: () => void;
  onSelectPlace: (id: string | null) => void;
  onMapPick: (lat: number, lng: number, name?: string, address?: string) => void;
};

type PoiResult = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

function previewMarkerHtml(name: string): string {
  return `<div class="preview-marker">
    <div class="preview-marker-card">${escapeHtml(name)}</div>
    <div class="preview-marker-dot"></div>
  </div>`;
}

function formatDistanceMeters(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function straightDistanceMeters(a: Place, b: Place): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function popupBodyHtml(place: Place): string {
  const noteBlock = place.note
    ? `<div class="map-popup-note">${escapeHtml(place.note).replace(/\n/g, '<br />')}</div>`
    : '';
  const addr =
    place.address ? `<div class="map-popup-meta">${escapeHtml(place.address)}</div>` : '';
  return `<strong>${escapeHtml(place.name)}</strong>${addr}${noteBlock}`;
}

function popupHtml(place: Place): string {
  return `<div class="map-popup">${popupBodyHtml(place)}</div>`;
}

/** 高德 InfoWindow 同时只能开一个；多弹窗用标记内嵌 HTML 气泡实现 */
function markerDomHtml(
  place: Place,
  index: number | string,
  color: string,
  showAllPopups: boolean,
): string {
  const dot = `<div class="trip-marker-dot" style="--pin:${color}">${index}</div>`;
  if (!showAllPopups) {
    return `<div class="amap-trip-marker">${dot}</div>`;
  }
  return `<div class="amap-marker-combo">
    <div class="amap-marker-combo__stack">
      <div class="amap-marker-combo__card map-popup">${popupBodyHtml(place)}</div>
      <div class="amap-marker-combo__dot">${dot}</div>
    </div>
  </div>`;
}

function pinnedMarkerDomHtml(place: Place, showAllPopups: boolean): string {
  const star = `<div class="pinned-marker-star" title="常显点">★</div>`;
  if (!showAllPopups) {
    return `<div class="amap-trip-marker pinned-marker">${star}</div>`;
  }
  return `<div class="amap-marker-combo pinned-marker">
    <div class="amap-marker-combo__stack">
      <div class="amap-marker-combo__card map-popup">${popupBodyHtml(place)}</div>
      <div class="amap-marker-combo__dot">${star}</div>
    </div>
  </div>`;
}

export function TripMap({
  data,
  resolvedGroupId,
  showAllGroups,
  onShowAllPlaces,
  showAllPopups,
  onShowAllPopups,
  selectedPlaceId,
  pickMode,
  onPickMode,
  fitTrigger,
  onFitMap,
  onSelectPlace,
  onMapPick,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<Awaited<ReturnType<typeof AMapLoader.load>>['Map']> | null>(null);
  const AMapRef = useRef<Awaited<ReturnType<typeof AMapLoader.load>> | null>(null);
  const infoWindowRef = useRef<{ close: () => void } | null>(null);
  const placeSearchRef = useRef<{ search: (keyword: string, cb: (status: string, result: unknown) => void) => void } | null>(null);
  const previewMarkerRef = useRef<{ setMap: (map: unknown) => void } | null>(null);
  const lastFocusSignatureRef = useRef<string>('');
  const lastAutoFitKeyRef = useRef<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchRows, setSearchRows] = useState<PoiResult[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [cornerCollapsed, setCornerCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ryokou-ui-corner-collapsed-v1') === '1';
    } catch {
      return false;
    }
  });
  const [noteHidden, setNoteHidden] = useState(() => {
    try {
      return localStorage.getItem('ryokou-ui-note-hidden-v1') === '1';
    } catch {
      return false;
    }
  });

  const layers: LayerGroup[] = useMemo(() => {
    if (showAllGroups) {
      return data.groups.map((g, groupIndex) => ({
        groupId: g.id,
        groupIndex,
        placeIds: g.placeIds,
      }));
    }
    const g = data.groups.find((x) => x.id === resolvedGroupId);
    if (!g) return [];
    const groupIndex = Math.max(
      0,
      data.groups.findIndex((x) => x.id === g.id),
    );
    return [{ groupId: g.id, groupIndex, placeIds: g.placeIds }];
  }, [data.groups, resolvedGroupId, showAllGroups]);

  const visiblePlaceIds = useMemo(
    () => new Set(layers.flatMap((layer) => layer.placeIds)),
    [layers],
  );

  const pinnedPlaceIds = useMemo(
    () =>
      Object.values(data.places)
        .filter((place) => place.pinned && !visiblePlaceIds.has(place.id))
        .map((place) => place.id),
    [data.places, visiblePlaceIds],
  );

  const fitPositions: [number, number][] = useMemo(() => {
    if (showAllGroups) {
      const ids = data.groups.flatMap((g) => g.placeIds);
      const seen = new Set<string>();
      const out: [number, number][] = [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const p = data.places[id];
        if (p) out.push([p.lat, p.lng]);
      }
      return out;
    }
    const g = data.groups.find((x) => x.id === resolvedGroupId);
    if (!g) return [];
    return g.placeIds
      .map((id) => data.places[id])
      .filter(Boolean)
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [data.groups, data.places, resolvedGroupId, showAllGroups]);

  const fitPositionsWithPinned: [number, number][] = useMemo(() => {
    const out = [...fitPositions];
    for (const id of pinnedPlaceIds) {
      const p = data.places[id];
      if (p) out.push([p.lat, p.lng]);
    }
    return out;
  }, [data.places, fitPositions, pinnedPlaceIds]);

  /** 分组切换 / 「展示全部点位」切换 / 范围内坐标变动时用于触发自动适配视野 */
  const autoFitKey = useMemo(
    () =>
      `${resolvedGroupId ?? ''}:${showAllGroups}:${fitPositionsWithPinned
        .map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`)
        .join(';')}`,
    [resolvedGroupId, showAllGroups, fitPositionsWithPinned],
  );

  const cursorClass = pickMode ? 'map-pick-cursor' : '';

  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY;
    const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
    if (!key || !securityJsCode) {
      console.error('缺少环境变量：请在 web/.env.local 中配置 VITE_AMAP_KEY 与 VITE_AMAP_SECURITY_JS_CODE');
      return;
    }

    let cancelled = false;
    let map: ReturnType<Awaited<ReturnType<typeof AMapLoader.load>>['Map']> | null = null;

    window._AMapSecurityConfig = { securityJsCode };

    AMapLoader.load({ key, version: '2.0', plugins: ['AMap.PlaceSearch'] })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        AMapRef.current = AMap;
        map = new AMap.Map(containerRef.current, {
          zoom: DEFAULT_ZOOM,
          center: new AMap.LngLat(DEFAULT_CENTER[1], DEFAULT_CENTER[0]),
          mapStyle: 'amap://styles/normal',
        });
        placeSearchRef.current = new AMap.PlaceSearch({
          city: '全国',
          pageSize: 8,
          pageIndex: 1,
        });
        mapRef.current = map;
        setMapReady(true);
      })
      .catch((err) => {
        console.error('高德地图加载失败', err);
      });

    return () => {
      cancelled = true;
      setMapReady(false);
      infoWindowRef.current?.close();
      infoWindowRef.current = null;
      previewMarkerRef.current?.setMap(null);
      previewMarkerRef.current = null;
      map?.destroy();
      mapRef.current = null;
      AMapRef.current = null;
      placeSearchRef.current = null;
    };
  }, []);

  const doPoiSearch = () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setSearchRows([]);
      clearPreviewMarker();
      return;
    }
    const ps = placeSearchRef.current;
    if (!ps) return;
    setSearching(true);
    ps.search(keyword, (status, result) => {
      setSearching(false);
      if (status !== 'complete') {
        setSearchRows([]);
        return;
      }
      const list = (
        (result as { poiList?: { pois?: Array<{ id?: string; name?: string; address?: string; location?: { lng?: number; lat?: number } }> } })
          ?.poiList?.pois ?? []
      )
        .map((p, i) => ({
          id: p.id || `${i}`,
          name: p.name || '未命名地点',
          address: p.address,
          lat: Number(p.location?.lat),
          lng: Number(p.location?.lng),
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      setSearchRows(list);
    });
  };

  const clearPreviewMarker = () => {
    previewMarkerRef.current?.setMap(null);
    previewMarkerRef.current = null;
  };

  useEffect(() => {
    if (searchKeyword.trim() !== '') return;
    if (searching) setSearching(false);
    if (searchRows.length) setSearchRows([]);
    clearPreviewMarker();
  }, [searchKeyword, searching, searchRows.length]);

  const previewPoi = (row: PoiResult) => {
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!map || !AMap) return;
    clearPreviewMarker();
    const marker = new AMap.Marker({
      position: new AMap.LngLat(row.lng, row.lat),
      content: previewMarkerHtml(row.name),
      anchor: 'bottom-center',
      zIndex: 300,
    });
    marker.setMap(map);
    previewMarkerRef.current = marker;
    map.setZoomAndCenter(15, new AMap.LngLat(row.lng, row.lat), false, 160);
  };

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const AMap = AMapRef.current;
    const el = containerRef.current;
    if (!map || !AMap || !el) return;

    const fixSize = () => {
      map.resize();
    };
    fixSize();
    const ro = new ResizeObserver(fixSize);
    ro.observe(el);
    window.addEventListener('resize', fixSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fixSize);
    };
  }, [mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!map || !AMap) return;

    infoWindowRef.current?.close();
    infoWindowRef.current = null;
    previewMarkerRef.current?.setMap(null);
    previewMarkerRef.current = null;
    map.clearMap();

    const overlays: object[] = [];

    for (const layer of layers) {
      const color = groupColor(layer.groupIndex);
      const path = layer.placeIds
        .map((id) => data.places[id])
        .filter(Boolean)
        .map((p) => [p.lng, p.lat]);
      if (path.length < 2) continue;
      const poly = new AMap.Polyline({
        path,
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 0.85,
      });
      map.add(poly);
      overlays.push(poly);

      for (let i = 0; i < layer.placeIds.length - 1; i++) {
        const a = data.places[layer.placeIds[i]!];
        const b = data.places[layer.placeIds[i + 1]!];
        if (!a || !b) continue;
        const label = new AMap.Marker({
          position: new AMap.LngLat((a.lng + b.lng) / 2, (a.lat + b.lat) / 2),
          content: `<div class="distance-label">${formatDistanceMeters(straightDistanceMeters(a, b))}</div>`,
          anchor: 'center',
          zIndex: 90,
        });
        map.add(label);
      }
    }

    for (const layer of layers) {
      const color = groupColor(layer.groupIndex);
      for (let idx = 0; idx < layer.placeIds.length; idx++) {
        const id = layer.placeIds[idx]!;
        const place = data.places[id];
        if (!place) continue;
        const n = idx + 1;
        const selected = selectedPlaceId === id;
        const marker = new AMap.Marker(
          place.pinned
            ? showAllPopups
              ? {
                  position: new AMap.LngLat(place.lng, place.lat),
                  content: pinnedMarkerDomHtml(place, true),
                  anchor: 'bottom-center',
                  offset: new AMap.Pixel(0, 0),
                  zIndex: selected ? 240 : 130,
                }
              : {
                  position: new AMap.LngLat(place.lng, place.lat),
                  content: pinnedMarkerDomHtml(place, false),
                  anchor: 'center',
                  zIndex: selected ? 220 : 120,
                }
            : showAllPopups
              ? {
                  position: new AMap.LngLat(place.lng, place.lat),
                  content: markerDomHtml(place, n, color, true),
                  anchor: 'bottom-center',
                  offset: new AMap.Pixel(0, 0),
                  zIndex: selected ? 220 : 110,
                }
              : {
                  position: new AMap.LngLat(place.lng, place.lat),
                  content: markerDomHtml(place, n, color, false),
                  offset: new AMap.Pixel(-14, -14),
                  zIndex: selected ? 200 : 100,
                },
        );
        marker.on('click', () => {
          onSelectPlace(id);
        });
        map.add(marker);
        overlays.push(marker);
      }
    }

    for (const id of pinnedPlaceIds) {
      const place = data.places[id];
      if (!place) continue;
      const selected = selectedPlaceId === id;
      const marker = new AMap.Marker(
        showAllPopups
          ? {
              position: new AMap.LngLat(place.lng, place.lat),
              content: pinnedMarkerDomHtml(place, true),
              anchor: 'bottom-center',
              offset: new AMap.Pixel(0, 0),
              zIndex: selected ? 240 : 130,
            }
          : {
              position: new AMap.LngLat(place.lng, place.lat),
              content: pinnedMarkerDomHtml(place, false),
              anchor: 'center',
              zIndex: selected ? 220 : 120,
            },
      );
      marker.on('click', () => {
        onSelectPlace(id);
      });
      map.add(marker);
      overlays.push(marker);
    }

    const onMapClick = (e: { lnglat: { lat: number; lng: number } }) => {
      if (pickMode) {
        onMapPick(e.lnglat.lat, e.lnglat.lng);
      }
    };
    map.on('click', onMapClick);

    if (fitTrigger > 0 && fitPositionsWithPinned.length > 0) {
      if (fitPositionsWithPinned.length === 1) {
        const [lat, lng] = fitPositionsWithPinned[0]!;
        map.setZoomAndCenter(15, new AMap.LngLat(lng, lat));
      } else if (overlays.length > 0) {
        map.setFitView(overlays, false, [48, 48, 48, 48], 16);
      }
    }

    return () => {
      map.off('click', onMapClick);
    };
  }, [
    mapReady,
    layers,
    data.places,
    selectedPlaceId,
    pickMode,
    fitTrigger,
    fitPositionsWithPinned,
    pinnedPlaceIds,
    onSelectPlace,
    onMapPick,
    showAllPopups,
  ]);

  /**
   * 切换日期分组 / 勾选展示全部点位 / 当前范围内点位增删改坐标后，自动缩放、平移以包含这些点。
   * 与手动「缩放到当前视图范围」区分：仅当 autoFitKey 变化时执行。
   */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!map || !AMap) return;

    if (lastAutoFitKeyRef.current === autoFitKey) return;
    lastAutoFitKeyRef.current = autoFitKey;

    if (fitPositionsWithPinned.length === 0) {
      return;
    }

    if (fitPositionsWithPinned.length === 1) {
      const [lat, lng] = fitPositionsWithPinned[0]!;
      map.setZoomAndCenter(14, new AMap.LngLat(lng, lat), false, 220);
      return;
    }

    const lngs = fitPositionsWithPinned.map(([, lng]) => lng);
    const lats = fitPositionsWithPinned.map(([lat]) => lat);
    const sw = new AMap.LngLat(Math.min(...lngs), Math.min(...lats));
    const ne = new AMap.LngLat(Math.max(...lngs), Math.max(...lats));
    map.setBounds(new AMap.Bounds(sw, ne), false, [52, 52, 52, 52], 16);
  }, [mapReady, autoFitKey, fitPositionsWithPinned]);

  /**
   * 选中某点后移动、缩放到该点；若范围内点位 / 分组刚变化（autoFitKey 变），对同一选中点再居中一次。
   */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!map || !AMap) return;

    if (!selectedPlaceId) {
      lastFocusSignatureRef.current = '';
      return;
    }
    const pl = data.places[selectedPlaceId];
    if (!pl) return;

    const sig = `${selectedPlaceId}:${pl.lat}:${pl.lng}|${autoFitKey}`;
    if (lastFocusSignatureRef.current === sig) return;
    lastFocusSignatureRef.current = sig;

    map.setZoomAndCenter(15, new AMap.LngLat(pl.lng, pl.lat), false, 220);
  }, [mapReady, selectedPlaceId, data.places, autoFitKey]);

  /** 选中景点后默认打开信息窗（侧栏点选或地图点选后均展示） */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const AMap = AMapRef.current;
    if (!map || !AMap) return;

    infoWindowRef.current?.close();
    infoWindowRef.current = null;

    if (showAllPopups) return;

    if (!selectedPlaceId) return;
    const pl = data.places[selectedPlaceId];
    if (!pl) return;

    const iw = new AMap.InfoWindow({
      content: popupHtml(pl),
      offset: new AMap.Pixel(0, -28),
      closeWhenClickMap: true,
    });
    iw.open(map, new AMap.LngLat(pl.lng, pl.lat));
    infoWindowRef.current = iw;
  }, [mapReady, selectedPlaceId, data.places, layers, showAllPopups]);

  const missingKey = !import.meta.env.VITE_AMAP_KEY || !import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
  const activeGuideMd = useMemo(() => {
    if (!resolvedGroupId) return '';
    return data.groups.find((g) => g.id === resolvedGroupId)?.guideMd ?? '';
  }, [data.groups, resolvedGroupId]);

  return (
    <div className={`trip-map-root ${cursorClass}`}>
      {missingKey ? (
        <div className="trip-map-error">
          请配置高德 Key：在 web 目录创建 .env.local，设置 VITE_AMAP_KEY 与 VITE_AMAP_SECURITY_JS_CODE
        </div>
      ) : null}
      <div ref={containerRef} className="trip-map-container" />
      {activeGuideMd.trim() ? (
        <>
          <button
            type="button"
            className={`map-drawer-handle map-drawer-handle--note ${noteHidden ? 'is-collapsed' : ''}`}
            aria-label={noteHidden ? '展开攻略便笺' : '收起攻略便笺'}
            onClick={() => {
              setNoteHidden((v) => {
                const next = !v;
                try {
                  localStorage.setItem('ryokou-ui-note-hidden-v1', next ? '1' : '0');
                } catch {
                  /* ignore */
                }
                return next;
              });
            }}
          >
            <span className="map-drawer-handle__text">便笺</span>
          </button>
          <aside
            className={`map-note-card ${noteHidden ? 'map-note-card--hidden' : ''}`}
            aria-label="分组攻略便笺"
          >
            {noteHidden ? null : <ReactMarkdown>{activeGuideMd}</ReactMarkdown>}
          </aside>
        </>
      ) : null}
      <button
        type="button"
        className={`map-drawer-handle map-drawer-handle--corner ${cornerCollapsed ? 'is-collapsed' : ''}`}
        aria-label={cornerCollapsed ? '展开右下角面板' : '收起右下角面板'}
        onClick={() => {
          setCornerCollapsed((v) => {
            const next = !v;
            try {
              localStorage.setItem('ryokou-ui-corner-collapsed-v1', next ? '1' : '0');
            } catch {
              /* ignore */
            }
            return next;
          });
        }}
      >
        <span className="map-drawer-handle__text">面板</span>
      </button>
      <aside
        className={`map-corner-panel ${cornerCollapsed ? 'map-corner-panel--collapsed' : ''}`}
        aria-label="地图显示选项"
      >
        {cornerCollapsed ? null : (
          <>
            <div className="map-corner-search">
          <input
            className="map-corner-input"
            value={searchKeyword}
            placeholder="地图搜点"
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                doPoiSearch();
              }
            }}
          />
          <button type="button" className="map-corner-btn" onClick={doPoiSearch} disabled={searching}>
            {searching ? '搜索中' : '搜索'}
          </button>
          {searchRows.length > 0 ? (
            <ul className="map-corner-results">
              {searchRows.map((row) => (
                <li key={row.id}>
                  <div
                    className="map-corner-result-item"
                    role="button"
                    tabIndex={0}
                    onMouseEnter={() => previewPoi(row)}
                    onFocus={() => previewPoi(row)}
                    onClick={() => previewPoi(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        previewPoi(row);
                      }
                    }}
                  >
                    <span className="map-corner-result-text">
                      <span className="map-corner-result-name">{row.name}</span>
                      <span className="map-corner-result-addr">{row.address || '无地址'}</span>
                    </span>
                    <button
                      type="button"
                      className="map-corner-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewPoi(row);
                        onMapPick(row.lat, row.lng, row.name, row.address);
                        setSearchRows([]);
                        clearPreviewMarker();
                      }}
                    >
                      添加
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label className="map-corner-check">
          <input
            type="checkbox"
            checked={showAllGroups}
            onChange={(e) => onShowAllPlaces(e.target.checked)}
          />
          <span>展示全部点位</span>
        </label>
        <label className="map-corner-check">
          <input
            type="checkbox"
            checked={showAllPopups}
            onChange={(e) => onShowAllPopups(e.target.checked)}
          />
          <span>展示全部弹窗</span>
        </label>
        <label className="map-corner-check">
          <input
            type="checkbox"
            checked={pickMode}
            onChange={(e) => onPickMode(e.target.checked)}
          />
          <span>点击地图加点</span>
        </label>
        <button type="button" className="map-corner-btn" onClick={onFitMap}>
          缩放到范围
        </button>
          </>
        )}
      </aside>
    </div>
  );
}
