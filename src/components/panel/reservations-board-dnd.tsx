"use client";

import { useId, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMove } from "react-icons/fi";

export type ReservationStatus = "booked" | "checked_in" | "checked_out" | "cancelled";

export type ReservationBoardItem = {
  id: number;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  reservation_status: ReservationStatus;
  sort_order: number;
};

type Props = {
  lang: "ar" | "en";
  initialItems: ReservationBoardItem[];
  onItemsChange?: (items: ReservationBoardItem[]) => void;
};

function labels(lang: "ar" | "en") {
  if (lang === "ar") {
    return {
      booked: "محجوز",
      checked_in: "مسجل دخول",
      checked_out: "منتهي",
      cancelled: "ملغي",
      saving: "در حال به‌روزرسانی...",
      saved: "به‌روزرسانی شد",
      failed: "خطا در به‌روزرسانی",
    };
  }
  return {
    booked: "Booked",
    checked_in: "Checked in",
    checked_out: "Checked out",
    cancelled: "Cancelled",
    saving: "Updating...",
    saved: "Updated",
    failed: "Update failed",
  };
}

const statuses: ReservationStatus[] = ["booked", "checked_in", "checked_out", "cancelled"];

type SortCardProps = {
  item: ReservationBoardItem;
};

type CardViewProps = {
  item: ReservationBoardItem;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
};

function CardView({ item, isDragging = false, dragHandle }: CardViewProps) {
  return (
    <article
      className={`rounded-xl bg-[rgba(255,255,255,0.2)] p-3 text-sm text-white shadow-[0_6px_18px_rgba(2,6,23,0.22)] ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{item.guest_name}</p>
          <p className="text-xs text-white/75">#{item.room_number}</p>
        </div>
        {dragHandle}
      </div>
      <p className="mt-2 text-xs text-white/75">{new Date(item.check_in).toLocaleString()}</p>
      <p className="text-xs text-white/65">{new Date(item.check_out).toLocaleString()}</p>
    </article>
  );
}

function SortCard({ item }: SortCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(item.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CardView
        item={item}
        isDragging={isDragging}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="touch-none cursor-grab active:cursor-grabbing rounded-lg bg-white/20 p-1 text-white/80 transition hover:bg-white/30"
          >
            <FiMove className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

type ColumnProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

function DroppableColumn({ id, title, children }: ColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`min-h-52 rounded-2xl p-3 ${
        isOver ? "bg-[rgba(34,211,238,0.2)] ring-2 ring-cyan-300/50" : "bg-[rgba(255,255,255,0.14)] ring-1 ring-white/20"
      }`}
    >
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

export function ReservationsBoardDnd({ lang, initialItems, onItemsChange }: Props) {
  const [items, setItems] = useState<ReservationBoardItem[]>(initialItems);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const text = labels(lang);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    return statuses.map((status) => ({
      status,
      items: items
        .filter((item) => item.reservation_status === status)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [items]);

  function findContainerById(id: string) {
    if (id.startsWith("container:")) {
      return id.replace("container:", "") as ReservationStatus;
    }
    const item = items.find((entry) => String(entry.id) === id);
    return item?.reservation_status;
  }

  async function persist(nextItems: ReservationBoardItem[]) {
    setSaving(true);
    setMessage(text.saving);
    try {
      const response = await fetch("/api/reservations/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: nextItems.map((item) => ({
            id: Number(item.id),
            reservation_status: item.reservation_status,
            sort_order: Number(item.sort_order),
          })),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      setMessage(response.ok && data.ok ? text.saved : data.message ?? text.failed);
    } catch {
      setMessage(text.failed);
    } finally {
      setSaving(false);
    }
  }

  function renumber(nextItems: ReservationBoardItem[]) {
    return statuses.flatMap((status) => {
      const inStatus = nextItems.filter((item) => item.reservation_status === status);
      return inStatus.map((item, index) => ({ ...item, sort_order: index }));
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const activeContainer = findContainerById(String(active.id));
    const overContainer = findContainerById(String(over.id));
    if (!activeContainer || !overContainer) return;

    const activeIndex = items.findIndex((entry) => String(entry.id) === String(active.id));
    if (activeIndex < 0) return;

    const overIsContainer = String(over.id).startsWith("container:");
    const overIndex = overIsContainer
      ? items.reduce((lastIndex, item, index) => (item.reservation_status === overContainer ? index : lastIndex), -1)
      : items.findIndex((entry) => String(entry.id) === String(over.id));
    if (overIndex < -1) return;

    let nextItems = items.slice();
    if (activeContainer === overContainer) {
      if (!overIsContainer) {
        nextItems = arrayMove(nextItems, activeIndex, overIndex);
      }
    } else {
      const moved = { ...nextItems[activeIndex], reservation_status: overContainer };
      nextItems.splice(activeIndex, 1);
      if (overIndex === -1) {
        nextItems.push(moved);
      } else {
        nextItems.splice(overIndex, 0, moved);
      }
    }

    const normalized = renumber(nextItems);
    setItems(normalized);
    onItemsChange?.(normalized);
    void persist(normalized);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  const activeItem = activeId ? items.find((item) => String(item.id) === activeId) : null;

  return (
    <div className="space-y-3">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.status}
              id={`container:${column.status}`}
              title={text[column.status]}
            >
              <SortableContext
                items={column.items.map((item) => String(item.id))}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {column.items.map((item) => (
                    <SortCard key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
        <DragOverlay>
          {activeItem ? <CardView item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
      <p className={`text-xs ${saving ? "text-amber-200" : "text-cyan-200"}`}>{message}</p>
    </div>
  );
}
