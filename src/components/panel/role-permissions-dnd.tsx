"use client";

import { useId, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiMenu, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import { AppSelect } from "@/components/ui/app-select";

type AssignedPermission = {
  permission_id: number;
  permission_code: string;
  description: string | null;
};

type Permission = {
  id: number;
  permission_code: string;
  description: string | null;
};

type Props = {
  lang: "ar" | "en";
  roleId: number;
  initialAssigned: AssignedPermission[];
  allPermissions: Permission[];
};

type SortRowProps = {
  item: AssignedPermission;
  onRemove: (id: number) => void;
};

function SortRow({ item, onRemove }: SortRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: String(item.permission_id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg border border-slate-300 p-1 text-slate-400"
          type="button"
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <div>
          <p className="font-medium text-slate-700">{item.permission_code}</p>
          {item.description ? <p className="text-xs text-slate-400">{item.description}</p> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.permission_id)}
        className="rounded-lg border border-rose-700/50 p-1 text-rose-700"
      >
        <FiTrash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function RolePermissionsDnd({ lang, roleId, initialAssigned, allPermissions }: Props) {
  const [assigned, setAssigned] = useState<AssignedPermission[]>(initialAssigned);
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const assignedIds = useMemo(() => new Set(assigned.map((p) => p.permission_id)), [assigned]);

  const canAdd = selectedPermissionId && !assignedIds.has(Number(selectedPermissionId));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assigned.findIndex((item) => String(item.permission_id) === String(active.id));
    const newIndex = assigned.findIndex((item) => String(item.permission_id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setAssigned((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  function addPermission() {
    if (!canAdd) return;
    const next = allPermissions.find((p) => p.id === Number(selectedPermissionId));
    if (!next) return;
    setAssigned((prev) => [
      ...prev,
      {
        permission_id: next.id,
        permission_code: next.permission_code,
        description: next.description,
      },
    ]);
    setSelectedPermissionId("");
  }

  function removePermission(permissionId: number) {
    setAssigned((prev) => prev.filter((item) => item.permission_id !== permissionId));
  }

  async function saveOrder() {
    try {
      setSaving(true);
      setMessage("");
      const response = await fetch("/api/admin/role-permissions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          permissionIds: assigned.map((p) => p.permission_id),
        }),
      });

      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage(data.message ?? t("خطا در ذخیره", "Save failed"));
        return;
      }

      setMessage(data.message ?? t("ذخیره شد", "Saved"));
    } catch {
      setMessage(t("خطا در ارتباط", "Network error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AppSelect
          value={selectedPermissionId}
          onChange={(event) => setSelectedPermissionId(event.target.value)}
          className="w-auto min-w-56"
        >
          <option value="">{t("انتخاب دسترسی", "Select permission")}</option>
          {allPermissions.map((permission) => (
            <option key={permission.id} value={permission.id}>
              {permission.permission_code}
            </option>
          ))}
        </AppSelect>
        <button
          type="button"
          onClick={addPermission}
          disabled={!canAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-40"
        >
          <FiPlus className="h-4 w-4" />
          {t("افزودن", "Add")}
        </button>
        <button
          type="button"
          onClick={saveOrder}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <FiSave className="h-4 w-4" />
          {saving ? t("در حال ذخیره...", "Saving...") : t("ذخیره ترتیب", "Save order")}
        </button>
      </div>

      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={assigned.map((item) => String(item.permission_id))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {assigned.map((item) => (
              <SortRow key={item.permission_id} item={item} onRemove={removePermission} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {message ? <p className="text-sm text-blue-600">{message}</p> : null}
    </div>
  );
}
