import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TripMap } from '../components/TripMap';
import { useTripData } from '../hooks/useTripData';
import { groupColor } from '../constants';

type ViewTab = 'map' | 'detail';
type DetailSubTab = 'places' | 'note';

const mdComponents = {
  table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <div className="markdown-table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
};

export function ViewPage() {
  const { data, activeConfigId, configOptions, switchTripConfig } = useTripData({
    persist: false,
    mergePlanSeedOnMount: false,
    source: 'bundled',
  });
  const [tab, setTab] = useState<ViewTab>('map');
  const [viewGroupId, setViewGroupId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<DetailSubTab>('note');
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [showAllPopups, setShowAllPopups] = useState(true);
  const [showPolylines, setShowPolylines] = useState(true);
  const [configPickerOpen, setConfigPickerOpen] = useState(false);

  useEffect(() => {
    setViewGroupId(data.groups[0]?.id ?? null);
    setSelectedPlaceId(null);
    // 仅切换行程配置时重置；勿依赖 data.groups 引用以免覆盖用户选中的分组。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConfigId]);

  useEffect(() => {
    if (viewGroupId && !data.groups.some((g) => g.id === viewGroupId)) {
      setViewGroupId(data.groups[0]?.id ?? null);
    }
  }, [data.groups, viewGroupId]);

  const resolvedGroupId = useMemo(() => {
    if (viewGroupId && data.groups.some((g) => g.id === viewGroupId)) return viewGroupId;
    return data.groups[0]?.id ?? null;
  }, [viewGroupId, data.groups]);

  const activeGroup = useMemo(
    () => data.groups.find((g) => g.id === resolvedGroupId) ?? null,
    [data.groups, resolvedGroupId],
  );

  const guideSource = (activeGroup?.guideMd ?? '').trim();
  const hasGuide = Boolean(guideSource);

  const groupIndex = useMemo(() => {
    const i = data.groups.findIndex((g) => g.id === resolvedGroupId);
    return i >= 0 ? i : 0;
  }, [data.groups, resolvedGroupId]);

  const placeIds = activeGroup?.placeIds ?? [];
  const selected = selectedPlaceId ? data.places[selectedPlaceId] : undefined;

  const noopPick = useCallback(() => {}, []);
  const noopFit = useCallback(() => {}, []);

  const onSelectPlace = useCallback((id: string | null) => {
    setSelectedPlaceId(id);
  }, []);

  useEffect(() => {
    if (!configPickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfigPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [configPickerOpen]);

  useEffect(() => {
    if (tab !== 'detail') setConfigPickerOpen(false);
  }, [tab]);

  return (
    <div className="view-app">
      <div className="view-app-main">
        <div className={`view-app-panel view-map-page${tab === 'map' ? ' is-active' : ''}`} aria-hidden={tab !== 'map'}>
          <div className="view-map-page-groups">
            <div className="view-group-scroll" role="tablist" aria-label="按日切换地图">
              {data.groups.map((g) => {
                const active = g.id === resolvedGroupId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`view-group-pill${active ? ' view-group-pill--active' : ''}`}
                    onClick={() => {
                      setViewGroupId(g.id);
                      setSelectedPlaceId(null);
                    }}
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="view-map-page-map">
            <TripMap
              readOnly
              toolbarMode="view-app"
              mapGuideOverlay={false}
              suppressMarkerSelection
              data={data}
              resolvedGroupId={resolvedGroupId}
              showAllGroups={showAllPlaces}
              onShowAllPlaces={setShowAllPlaces}
              showAllPopups={showAllPopups}
              onShowAllPopups={setShowAllPopups}
              showPolylines={showPolylines}
              onShowPolylines={setShowPolylines}
              selectedPlaceId={selectedPlaceId}
              pickMode={false}
              onPickMode={noopPick}
              fitTrigger={0}
              onFitMap={noopFit}
              onSelectPlace={onSelectPlace}
              onMapPick={noopPick}
            />
            <div className="view-map-float-chips" aria-label="地图显示选项">
              <label className="view-map-chip view-map-chip--glass" title="展示全部点位">
                <input
                  type="checkbox"
                  className="view-map-chip-input"
                  checked={showAllPlaces}
                  onChange={(e) => setShowAllPlaces(e.target.checked)}
                  aria-label="展示全部点位"
                />
                <span className="view-map-chip-ui">所有</span>
              </label>
              <label className="view-map-chip view-map-chip--glass" title="展示全部弹窗">
                <input
                  type="checkbox"
                  className="view-map-chip-input"
                  checked={showAllPopups}
                  onChange={(e) => setShowAllPopups(e.target.checked)}
                  aria-label="展示全部弹窗"
                />
                <span className="view-map-chip-ui">弹窗</span>
              </label>
              <label className="view-map-chip view-map-chip--glass" title="显示连线">
                <input
                  type="checkbox"
                  className="view-map-chip-input"
                  checked={showPolylines}
                  onChange={(e) => setShowPolylines(e.target.checked)}
                  aria-label="显示连线"
                />
                <span className="view-map-chip-ui">连线</span>
              </label>
            </div>
          </div>
        </div>

        <div
          className={`view-app-panel view-app-panel--scroll${tab === 'detail' ? ' is-active' : ''}`}
          aria-hidden={tab !== 'detail'}
        >
          <div className="view-detail-shell">
            <div className="view-detail-groups">
              <div className="view-group-scroll" role="tablist" aria-label="按日切换详情">
                {data.groups.map((g) => {
                  const active = g.id === resolvedGroupId;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`view-group-pill${active ? ' view-group-pill--active' : ''}`}
                      onClick={() => {
                        setViewGroupId(g.id);
                        setSelectedPlaceId(null);
                      }}
                    >
                      {g.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="view-trip-scroll view-trip-scroll--detail">
              <div className="view-detail-subtabs" role="tablist" aria-label="详情分类">
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailSubTab === 'note'}
                  className={`view-detail-subtab${detailSubTab === 'note' ? ' view-detail-subtab--active' : ''}`}
                  onClick={() => setDetailSubTab('note')}
                >
                  便笺
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailSubTab === 'places'}
                  className={`view-detail-subtab${detailSubTab === 'places' ? ' view-detail-subtab--active' : ''}`}
                  onClick={() => setDetailSubTab('places')}
                >
                  点位
                </button>
              </div>

            {detailSubTab === 'note' ? (
              hasGuide ? (
                <div className="view-note-tab-body">
                  <div className="view-guide-inline-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {guideSource}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <p className="view-empty">当前分组暂无便笺</p>
              )
            ) : (
              <>
                {placeIds.length === 0 ? (
                  <p className="view-empty">当前分组暂无点位</p>
                ) : (
                  <ul className="view-place-list">
                    {placeIds.map((id, idx) => {
                      const p = data.places[id];
                      if (!p) return null;
                      const on = selectedPlaceId === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className={`view-place-row${on ? ' view-place-row--active' : ''}`}
                            onClick={() => setSelectedPlaceId(id)}
                          >
                            <span
                              className="view-place-num"
                              style={{ background: groupColor(groupIndex) }}
                            >
                              {idx + 1}
                            </span>
                            <span className="view-place-name">{p.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selected ? (
                  <div className="view-detail-card">
                    <div className="view-detail-body">
                      <h2 className="view-detail-name">{selected.name}</h2>
                      {selected.address ? (
                        <p className="view-detail-addr">{selected.address}</p>
                      ) : null}
                      <p className="view-detail-coord">
                        {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                      </p>
                      {selected.pinned ? <span className="view-pinned-badge">常显</span> : null}
                      {selected.note?.trim() ? (
                        <div className="view-detail-note markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {selected.note}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="view-empty view-empty--muted">无备注</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
            </div>

            <button
              type="button"
              className="view-config-fab"
              onClick={() => setConfigPickerOpen(true)}
              aria-label="切换行程配置"
              title="切换行程配置"
            >
              <svg className="view-config-fab__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path
                  fill="currentColor"
                  d="M4 6.5h16v2H4v-2zm2 5.5h12v2H6v-2zm2 5.5h8v2H8v-2z"
                  opacity="0.92"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <nav className="view-tabbar" aria-label="主导航">
        <button
          type="button"
          className={`view-tabbar-btn${tab === 'map' ? ' view-tabbar-btn--active' : ''}`}
          onClick={() => setTab('map')}
          aria-current={tab === 'map' ? 'page' : undefined}
        >
          地图
        </button>
        <button
          type="button"
          className={`view-tabbar-btn${tab === 'detail' ? ' view-tabbar-btn--active' : ''}`}
          onClick={() => setTab('detail')}
          aria-current={tab === 'detail' ? 'page' : undefined}
        >
          详情
        </button>
      </nav>

      {configPickerOpen ? (
        <div className="view-config-modal-root" role="presentation">
          <button
            type="button"
            className="view-config-modal-backdrop"
            aria-label="关闭"
            onClick={() => setConfigPickerOpen(false)}
          />
          <div
            className="view-config-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-config-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="view-config-modal-title" className="view-config-modal-title">
              切换行程配置
            </h2>
            <ul className="view-config-modal-list">
              {configOptions.map((c) => {
                const on = c.id === activeConfigId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`view-config-modal-item${on ? ' view-config-modal-item--active' : ''}`}
                      onClick={() => {
                        switchTripConfig(c.id);
                        setConfigPickerOpen(false);
                      }}
                    >
                      <span className="view-config-modal-item__title">{c.title}</span>
                      {on ? <span className="view-config-modal-item__badge">当前</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="view-config-modal-close btn btn-secondary" onClick={() => setConfigPickerOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
