import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Group } from '../types/trip';

function SortableTab({
  id,
  title,
  active,
  onSelect,
}: {
  id: string;
  title: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group-tab-wrap ${active ? 'group-tab-wrap--active' : ''} ${isDragging ? 'group-tab-wrap--drag' : ''}`}
    >
      <button
        type="button"
        className="group-tab-grip"
        aria-label="拖动排序"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className="group-tab group-tab--inner"
        onClick={onSelect}
      >
        {title}
      </button>
    </div>
  );
}

type SortableGroupTabsProps = {
  groups: Group[];
  activeGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onReorder: (nextGroupIds: string[]) => void;
};

export function SortableGroupTabs({
  groups,
  activeGroupId,
  onSelectGroup,
  onReorder,
}: SortableGroupTabsProps) {
  const ids = groups.map((g) => g.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {groups.map((g) => (
          <SortableTab
            key={g.id}
            id={g.id}
            title={g.title}
            active={g.id === activeGroupId}
            onSelect={() => onSelectGroup(g.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
