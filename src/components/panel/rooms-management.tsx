"use client";

import { useState } from "react";
import type { RoomLive } from "@/lib/data";
import { AppModal } from "@/components/ui/app-modal";
import { AppSelect } from "@/components/ui/app-select";

type Labels = {
  addRoom: string;
  editRoom: string;
  deleteRoom: string;
  save: string;
  cancel: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  capacity: string;
  status: string;
  active: string;
  maintenance: string;
  actions: string;
  room: string;
  type: string;
  available: string;
  occupied: string;
  maintenanceLabel: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteButton: string;
  openAddModal: string;
  openEditModal: string;
  openDeleteDialog: string;
};

type Props = {
  lang: string;
  returnTo: string;
  rooms: RoomLive[];
  canManageRooms: boolean;
  labels: Labels;
};

function statusClass(status: "available" | "occupied" | "maintenance") {
  if (status === "available") return "bg-emerald-200/30 text-emerald-50";
  if (status === "occupied") return "bg-amber-200/30 text-amber-50";
  return "bg-rose-200/30 text-rose-50";
}

export function RoomsManagement({ lang, returnTo, rooms, canManageRooms, labels }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomLive | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<RoomLive | null>(null);

  return (
    <>
      {canManageRooms ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/30"
          >
            {labels.openAddModal}
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white/12 shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-4 py-3 text-left">{labels.room}</th>
                <th className="px-4 py-3 text-left">{labels.floor}</th>
                <th className="px-4 py-3 text-left">{labels.type}</th>
                <th className="px-4 py-3 text-left">{labels.capacity}</th>
                <th className="px-4 py-3 text-left">{labels.status}</th>
                {canManageRooms ? <th className="px-4 py-3 text-left">{labels.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-t border-white/10 text-white/90">
                  <td className="px-4 py-3 font-medium">{room.room_number}</td>
                  <td className="px-4 py-3">{room.floor ?? "-"}</td>
                  <td className="px-4 py-3">{room.room_type}</td>
                  <td className="px-4 py-3">{room.capacity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusClass(room.live_status)}`}>
                      {room.live_status === "available"
                        ? labels.available
                        : room.live_status === "occupied"
                          ? labels.occupied
                          : labels.maintenanceLabel}
                    </span>
                  </td>
                  {canManageRooms ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditRoom(room)}
                          className="rounded-lg bg-cyan-400/25 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-400/35"
                        >
                          {labels.openEditModal}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRoom(room)}
                          className="rounded-lg bg-rose-400/25 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/35"
                        >
                          {labels.openDeleteDialog}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AppModal open={addOpen} onClose={() => setAddOpen(false)} title={labels.addRoom} closeLabel={labels.cancel}>
        <form action="/api/rooms" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.roomNumber}</span>
                <input
                  name="roomNumber"
                  required
                  placeholder={labels.roomNumber}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.floor}</span>
                <input
                  name="floor"
                  type="number"
                  placeholder={labels.floor}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.roomType}</span>
                <input
                  name="roomType"
                  placeholder={labels.roomType}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.capacity}</span>
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={2}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <div className="col-span-full mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
                >
                  {labels.cancel}
                </button>
                <button className="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
                  {labels.save}
                </button>
              </div>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(editRoom)}
        onClose={() => setEditRoom(null)}
        title={labels.editRoom}
        closeLabel={labels.cancel}
      >
        {editRoom ? (
          <form action="/api/rooms" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="action" value="update" />
              <input type="hidden" name="roomId" value={editRoom.id} />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.roomNumber}</span>
                <input
                  name="roomNumber"
                  required
                  defaultValue={editRoom.room_number}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.floor}</span>
                <input
                  name="floor"
                  type="number"
                  defaultValue={editRoom.floor ?? ""}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.roomType}</span>
                <input
                  name="roomType"
                  defaultValue={editRoom.room_type}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.capacity}</span>
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  defaultValue={editRoom.capacity}
                  className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-white/80">{labels.status}</span>
                <AppSelect
                  name="status"
                  defaultValue={editRoom.status}
                  className="w-full"
                >
                  <option value="active" className="text-slate-900">{labels.active}</option>
                  <option value="maintenance" className="text-slate-900">{labels.maintenance}</option>
                </AppSelect>
              </label>
              <div className="col-span-full mt-1 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditRoom(null)}
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/25"
                >
                  {labels.cancel}
                </button>
                <button className="rounded-xl bg-cyan-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                  {labels.save}
                </button>
              </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={Boolean(deleteRoom)}
        onClose={() => setDeleteRoom(null)}
        title={labels.confirmDeleteTitle}
        maxWidthClass="max-w-md"
        closeLabel={labels.cancel}
      >
        {deleteRoom ? (
          <>
            <p className="mt-1 text-sm text-white/80">
              {labels.confirmDeleteMessage} <span className="font-semibold">#{deleteRoom.room_number}</span>
            </p>
            <div className="mt-4 flex justify-end">
              <form action="/api/rooms" method="post">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="roomId" value={deleteRoom.id} />
                <button className="rounded-xl bg-rose-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                  {labels.confirmDeleteButton}
                </button>
              </form>
            </div>
          </>
        ) : null}
      </AppModal>
    </>
  );
}
