import { useCallback, useEffect, useMemo, useState } from 'react';
import { TripMap } from '../components/TripMap';
import { Sidebar } from '../components/Sidebar';
import { useTripData } from '../hooks/useTripData';

export default function EditPage() {
  const {
    data,
    dispatch,
    activeGroup,
    configOptions,
    activeConfigId,
    importFromJsonText,
    resetTrip,
    switchTripConfig,
    newTripConfig,
    renameCurrentTripConfig,
    deleteCurrentTripConfig,
  } = useTripData();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [showAllPopups, setShowAllPopups] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [showPolylines, setShowPolylines] = useState(() => {
    try {
      return localStorage.getItem('ryokou-ui-show-polylines-v1') !== '0';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ryokou-ui-show-polylines-v1', showPolylines ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [showPolylines]);

  const resolvedGroupId = useMemo(() => {
    if (activeGroup) return activeGroup.id;
    return data.groups[0]?.id ?? null;
  }, [activeGroup, data.groups]);

  const activeGroupId = data.activeGroupId ?? data.groups[0]?.id ?? null;

  const onMapPick = useCallback(
    (lat: number, lng: number, name?: string, address?: string) => {
      if (!resolvedGroupId) return;
      dispatch({
        type: 'addPlace',
        groupId: resolvedGroupId,
        name: name?.trim() || '地图选点',
        lat,
        lng,
        address: address?.trim() || undefined,
      });
    },
    [dispatch, resolvedGroupId],
  );

  const onFitMap = useCallback(() => {
    setFitTrigger((n) => n + 1);
  }, []);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>
      {sidebarCollapsed ? null : (
        <Sidebar
          data={data}
          activeGroupId={activeGroupId}
          resolvedGroupId={resolvedGroupId}
          dispatch={dispatch}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          showAllPlaces={showAllPlaces}
          importFromJsonText={importFromJsonText}
          resetTrip={resetTrip}
          configOptions={configOptions}
          activeConfigId={activeConfigId}
          switchTripConfig={switchTripConfig}
          newTripConfig={newTripConfig}
          renameCurrentTripConfig={renameCurrentTripConfig}
          deleteCurrentTripConfig={deleteCurrentTripConfig}
        />
      )}
      <main className="map-pane">
        <TripMap
          data={data}
          resolvedGroupId={resolvedGroupId}
          showAllGroups={showAllPlaces}
          onShowAllPlaces={setShowAllPlaces}
          showAllPopups={showAllPopups}
          onShowAllPopups={setShowAllPopups}
          showPolylines={showPolylines}
          onShowPolylines={setShowPolylines}
          selectedPlaceId={selectedPlaceId}
          pickMode={pickMode}
          onPickMode={setPickMode}
          fitTrigger={fitTrigger}
          onFitMap={onFitMap}
          onSelectPlace={setSelectedPlaceId}
          onMapPick={onMapPick}
        />
      </main>
    </div>
  );
}
