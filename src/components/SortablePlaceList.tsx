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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Place } from '../types/trip';

function SortableRow({
  id,
  place,
  index,
  selected,
  onSelect,
}: {
  id: string;
  place: Place;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`place-row ${selected ? 'place-row--selected' : ''} ${isDragging ? 'place-row--drag' : ''}`}
    >
      <button
        type="button"
        className="place-row-drag"
        aria-label="拖动排序"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button type="button" className="place-row-main" onClick={onSelect}>
        <span className="place-row-num">{index + 1}</span>
        <span className="place-row-name">{place.name}</span>
      </button>
    </li>
  );
}

type SortablePlaceListProps = {
  placeIds: string[];
  places: Record<string, Place>;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  onReorder: (nextIds: string[]) => void;
};

export function SortablePlaceList({
  placeIds,
  places,
  selectedPlaceId,
  onSelectPlace,
  onReorder,
}: SortablePlaceListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = placeIds.indexOf(String(active.id));
    const newIndex = placeIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(placeIds, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={placeIds} strategy={verticalListSortingStrategy}>
        <ul className="place-list">
          {placeIds.map((id, index) => {
            const place = places[id];
            if (!place) return null;
            return (
              <SortableRow
                key={id}
                id={id}
                place={place}
                index={index}
                selected={selectedPlaceId === id}
                onSelect={() => onSelectPlace(id)}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
