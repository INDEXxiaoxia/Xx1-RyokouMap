import { useId, useMemo, useRef, useState } from 'react';
import type { TripData } from '../types/trip';
import type { TripAction } from '../hooks/useTripData';
import { SortablePlaceList } from './SortablePlaceList';
import { SortableGroupTabs } from './SortableGroupTabs';
import { exportTripFilename } from '../lib/tripStorage';
import type { TripConfigOption } from '../data/tripConfigs';

type SidebarProps = {
  data: TripData;
  activeGroupId: string | null;
  resolvedGroupId: string | null;
  dispatch: React.Dispatch<TripAction>;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  showAllPlaces: boolean;
  importFromJsonText: (text: string) => { ok: true } | { ok: false; error: string };
  resetTrip: () => void;
  activeConfigId: string;
  configOptions: TripConfigOption[];
  switchTripConfig: (id: string) => void;
  newTripConfig: (title: string) => TripConfigOption;
  renameCurrentTripConfig: (title: string) => void;
  deleteCurrentTripConfig: () => void;
};

export function Sidebar({
  data,
  activeGroupId,
  resolvedGroupId,
  dispatch,
  selectedPlaceId,
  onSelectPlace,
  showAllPlaces,
  importFromJsonText,
  resetTrip,
  activeConfigId,
  configOptions,
  switchTripConfig,
  newTripConfig,
  renameCurrentTripConfig,
  deleteCurrentTripConfig,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null,
  );
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const gid = useId();

  const active = data.groups.find((g) => g.id === resolvedGroupId);
  const placeIds = active?.placeIds ?? [];
  const selected = selectedPlaceId ? data.places[selectedPlaceId] : undefined;

  const groupIdOfSelected = useMemo(() => {
    if (!selectedPlaceId) return null;
    return data.groups.find((g) => g.placeIds.includes(selectedPlaceId))?.id ?? null;
  }, [data.groups, selectedPlaceId]);

  const allPlacesRows = useMemo(() => {
    const rows: { groupTitle: string; placeId: string; indexInGroup: number }[] = [];
    for (const g of data.groups) {
      g.placeIds.forEach((placeId, indexInGroup) => {
        rows.push({ groupTitle: g.title, placeId, indexInGroup: indexInGroup + 1 });
      });
    }
    return rows;
  }, [data.groups]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportTripFilename();
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const r = importFromJsonText(text);
    if (r.ok) {
      setImportMsg({ type: 'ok', text: '已导入' });
      onSelectPlace(null);
    } else {
      setImportMsg({ type: 'err', text: r.error });
    }
  };

  const addManualPlace = () => {
    if (!resolvedGroupId) return;
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setImportMsg({ type: 'err', text: '请输入有效的纬度、经度数字' });
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setImportMsg({ type: 'err', text: '纬度应在 [-90,90]，经度应在 [-180,180]' });
      return;
    }
    dispatch({
      type: 'addPlace',
      groupId: resolvedGroupId,
      name: manualName.trim() || '新地点',
      lat,
      lng,
    });
    setManualName('');
    setManualLat('');
    setManualLng('');
    setImportMsg(null);
  };

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <div className="sidebar-label">配置</div>
        <div className="config-bar">
          <select
            className="field-select config-bar-select"
            value={activeConfigId}
            onChange={(e) => switchTripConfig(e.target.value)}
            aria-label="切换配置"
          >
            {configOptions.map((config) => (
              <option key={config.id} value={config.id}>
                {config.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => {
              const name = prompt('新建配置名称', '新配置');
              if (name === null) return;
              const created = newTripConfig(name);
              setImportMsg({ type: 'ok', text: `已新建：${created.title}` });
            }}
          >
            新建
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => {
              const current = configOptions.find((c) => c.id === activeConfigId);
              const name = prompt('重命名配置', current?.title ?? '配置');
              if (name === null) return;
              renameCurrentTripConfig(name);
              setImportMsg({ type: 'ok', text: '已重命名' });
            }}
          >
            改名
          </button>
          <button
            type="button"
            className="btn btn-danger-outline btn-xs"
            onClick={() => {
              if (confirm('删除当前配置？（不可恢复，建议先导出 JSON）')) {
                deleteCurrentTripConfig();
                setImportMsg({ type: 'ok', text: '已删除' });
              }
            }}
          >
            删除
          </button>
        </div>
      </section>

      <section className="sidebar-section">
        <div className="sidebar-label">分组（日期 / 行程段）</div>
        <div className="group-tabs">
          <SortableGroupTabs
            groups={data.groups}
            activeGroupId={activeGroupId}
            onSelectGroup={(id) => {
              dispatch({ type: 'setActiveGroup', id });
              onSelectPlace(null);
            }}
            onReorder={(groupIds) => dispatch({ type: 'reorderGroups', groupIds })}
          />
          <button
            type="button"
            className="group-tab group-tab--add"
            onClick={() => dispatch({ type: 'addGroup' })}
          >
            + 新建
          </button>
        </div>
        {active ? (
          <div className="group-actions">
            <label className="group-actions-label" htmlFor={`${gid}-rename`}>
              重命名
            </label>
            <input
              id={`${gid}-rename`}
              className="group-actions-input"
              value={active.title}
              onChange={(e) =>
                dispatch({ type: 'renameGroup', id: active.id, title: e.target.value })
              }
            />
            {data.groups.length > 1 ? (
              <button
                type="button"
                className="group-actions-del"
                aria-label="删除当前分组"
                title="删除当前分组"
                onClick={() => {
                  if (confirm(`确定删除分组「${active.title}」及其地点？`)) {
                    dispatch({ type: 'removeGroup', id: active.id });
                    onSelectPlace(null);
                  }
                }}
              >
                删除
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {active ? (
        <details className="sidebar-section folded-section" open>
          <summary className="folded-summary">
            <span className="sidebar-label" style={{ display: 'inline' }}>
              便笺编辑（Markdown）
            </span>
          </summary>
          <div className="folded-content">
            <textarea
              className="note-editor-textarea"
              rows={7}
              value={active.guideMd ?? ''}
              placeholder="支持 Markdown，例如：\n- 购票入口\n- 注意事项\n- 行走顺序"
              onChange={(e) =>
                dispatch({ type: 'setGroupGuide', id: active.id, guideMd: e.target.value })
              }
            />
          </div>
        </details>
      ) : null}

      {showAllPlaces ? (
        <section className="sidebar-section all-places-panel" aria-label="全部点位列表">
          <div className="sidebar-label">全部点位（{allPlacesRows.length}）</div>
          {allPlacesRows.length === 0 ? (
            <p className="muted">暂无地点，请先在当前分组添加或载入计划行程。</p>
          ) : (
            <ul className="all-places-list">
              {allPlacesRows.map((row) => {
                const pl = data.places[row.placeId];
                if (!pl) return null;
                const isSel = selectedPlaceId === row.placeId;
                return (
                  <li key={row.placeId}>
                    <button
                      type="button"
                      className={`all-places-item ${isSel ? 'all-places-item--active' : ''}`}
                      onClick={() => onSelectPlace(isSel ? null : row.placeId)}
                    >
                      <span className="all-places-group">{row.groupTitle}</span>
                      <span className="all-places-idx">{row.indexInGroup}</span>
                      <span className="all-places-name">{pl.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <section className="sidebar-section">
        <div className="sidebar-label">当前分组地点</div>
        {placeIds.length === 0 ? (
          <p className="muted">暂无地点。可勾选「点击地图添加」，或下方手动输入坐标。</p>
        ) : (
          <SortablePlaceList
            placeIds={placeIds}
            places={data.places}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
            onReorder={(next) => {
              if (!resolvedGroupId) return;
              dispatch({ type: 'reorderPlaces', groupId: resolvedGroupId, placeIds: next });
            }}
          />
        )}
      </section>

      {selected && groupIdOfSelected ? (
        <section className="sidebar-section place-edit">
          <div className="sidebar-label">编辑：{selected.name}</div>
          <label className="field">
            <span>所属分组（日期）</span>
            <select
              className="field-select"
              value={groupIdOfSelected}
              onChange={(e) => {
                const target = e.target.value;
                if (target === groupIdOfSelected) return;
                dispatch({
                  type: 'movePlaceToGroup',
                  placeId: selected.id,
                  targetGroupId: target,
                });
                dispatch({ type: 'setActiveGroup', id: target });
                onSelectPlace(selected.id);
              }}
            >
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>名称</span>
            <input
              value={selected.name}
              onChange={(e) =>
                dispatch({
                  type: 'updatePlace',
                  id: selected.id,
                  patch: { name: e.target.value },
                })
              }
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={Boolean(selected.pinned)}
              onChange={(e) =>
                dispatch({
                  type: 'updatePlace',
                  id: selected.id,
                  patch: { pinned: e.target.checked || undefined },
                })
              }
            />
            常显在地图上
          </label>
          <label className="field">
            <span>地址（可选）</span>
            <input
              value={selected.address ?? ''}
              placeholder="例如：上城区中山中路 196 号"
              onChange={(e) =>
                dispatch({
                  type: 'updatePlace',
                  id: selected.id,
                  patch: { address: e.target.value || undefined },
                })
              }
            />
          </label>
          <label className="field">
            <span>纬度 / 经度</span>
            <div className="field-inline">
              <input
                type="number"
                step="any"
                value={selected.lat}
                onChange={(e) =>
                  dispatch({
                    type: 'updatePlace',
                    id: selected.id,
                    patch: { lat: Number(e.target.value) },
                  })
                }
              />
              <input
                type="number"
                step="any"
                value={selected.lng}
                onChange={(e) =>
                  dispatch({
                    type: 'updatePlace',
                    id: selected.id,
                    patch: { lng: Number(e.target.value) },
                  })
                }
              />
            </div>
          </label>
          <label className="field">
            <span>备注</span>
            <textarea
              rows={4}
              value={selected.note}
              placeholder="门票、时段、交通提示等"
              onChange={(e) =>
                dispatch({
                  type: 'updatePlace',
                  id: selected.id,
                  patch: { note: e.target.value },
                })
              }
            />
          </label>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirm('删除该地点？')) {
                dispatch({ type: 'removePlace', id: selected.id });
                onSelectPlace(null);
              }
            }}
          >
            删除地点
          </button>
        </section>
      ) : null}

      <details className="sidebar-section folded-section">
        <summary className="sidebar-label folded-summary">高级操作</summary>
        <div className="folded-content">
          <div className="sidebar-label">手动坐标标点（当前分组）</div>
          <label className="field">
            <span>名称</span>
            <input value={manualName} onChange={(e) => setManualName(e.target.value)} />
          </label>
          <div className="field-inline field">
            <label>
              <span>纬度</span>
              <input
                type="number"
                step="any"
                placeholder="如 30.24"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
            </label>
            <label>
              <span>经度</span>
              <input
                type="number"
                step="any"
                placeholder="如 120.15"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="btn btn-primary" onClick={addManualPlace}>
            添加到地图
          </button>

          <div className="sidebar-label folded-sub-label">
            数据
          </div>
          <div className="io-row">
            <button type="button" className="btn btn-secondary" onClick={exportJson}>
              导出 JSON
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              导入 JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={onImportFile}
            />
          </div>
          {importMsg ? (
            <p className={importMsg.type === 'ok' ? 'msg-ok' : 'msg-err'}>{importMsg.text}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={() => {
              if (confirm('清空本地数据并恢复默认？（可先导出备份）')) {
                resetTrip();
                onSelectPlace(null);
                setImportMsg(null);
              }
            }}
          >
            重置为空数据
          </button>
        </div>
      </details>
    </aside>
  );
}
