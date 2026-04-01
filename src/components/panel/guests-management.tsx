"use client";

import { useState } from "react";
import type { GuestWithRoom } from "@/lib/data";
import { AppModal } from "@/components/ui/app-modal";

type Labels = {
  addGuest: string;
  editGuest: string;
  deleteGuest: string;
  save: string;
  cancel: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  actions: string;
  name: string;
  currentRoom: string;
  checkInOut: string;
  openAddModal: string;
  openEditModal: string;
  openDeleteDialog: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteButton: string;
};

type Props = {
  lang: string;
  returnTo: string;
  guests: GuestWithRoom[];
  canManage: boolean;
  labels: Labels;
};

export function GuestsManagement({ lang, returnTo, guests, canManage, labels }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<GuestWithRoom | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<GuestWithRoom | null>(null);

  return (
    <>
      {canManage ? (
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

      <section className="overflow-hidden rounded-2xl bg-white/12 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-white/10 text-white/70">
              <tr>
                <th className="px-4 py-3 text-left">{labels.name}</th>
                <th className="px-4 py-3 text-left">{labels.phone}</th>
                <th className="px-4 py-3 text-left">{labels.email}</th>
                <th className="px-4 py-3 text-left">{labels.currentRoom}</th>
                <th className="px-4 py-3 text-left">{labels.checkInOut}</th>
                {canManage ? <th className="px-4 py-3 text-left">{labels.actions}</th> : null}
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id} className="border-t border-white/10 text-white/90">
                  <td className="px-4 py-3 font-medium">
                    {guest.first_name} {guest.last_name}
                  </td>
                  <td className="px-4 py-3">{guest.phone ?? "-"}</td>
                  <td className="px-4 py-3">{guest.email ?? "-"}</td>
                  <td className="px-4 py-3">{guest.room_number ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-white/70">
                    {guest.check_in ? new Date(guest.check_in).toLocaleString() : "-"} / {" "}
                    {guest.check_out ? new Date(guest.check_out).toLocaleString() : "-"}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditGuest(guest)}
                          className="rounded-lg bg-cyan-400/25 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-400/35"
                        >
                          {labels.openEditModal}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteGuest(guest)}
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

      <AppModal open={addOpen} onClose={() => setAddOpen(false)} title={labels.addGuest} closeLabel={labels.cancel}>
        <form action="/api/guests" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.firstName}</span>
            <input
              name="firstName"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.lastName}</span>
            <input
              name="lastName"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.phone}</span>
            <input name="phone" className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.email}</span>
            <input
              name="email"
              type="email"
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <div className="col-span-full mt-1 flex justify-end">
            <button className="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
              {labels.save}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(editGuest)}
        onClose={() => setEditGuest(null)}
        title={labels.editGuest}
        closeLabel={labels.cancel}
      >
        {editGuest ? (
          <form action="/api/guests" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="action" value="update" />
            <input type="hidden" name="guestId" value={editGuest.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.firstName}</span>
              <input
                name="firstName"
                required
                defaultValue={editGuest.first_name}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.lastName}</span>
              <input
                name="lastName"
                required
                defaultValue={editGuest.last_name}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.phone}</span>
              <input
                name="phone"
                defaultValue={editGuest.phone ?? ""}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.email}</span>
              <input
                name="email"
                type="email"
                defaultValue={editGuest.email ?? ""}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="col-span-full mt-1 flex justify-end">
              <button className="rounded-xl bg-cyan-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                {labels.save}
              </button>
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={Boolean(deleteGuest)}
        onClose={() => setDeleteGuest(null)}
        title={labels.confirmDeleteTitle}
        maxWidthClass="max-w-md"
        closeLabel={labels.cancel}
      >
        {deleteGuest ? (
          <>
            <p className="text-sm text-white/80">
              {labels.confirmDeleteMessage} <span className="font-semibold">{deleteGuest.first_name} {deleteGuest.last_name}</span>
            </p>
            <div className="mt-4 flex justify-end">
              <form action="/api/guests" method="post">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="guestId" value={deleteGuest.id} />
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
