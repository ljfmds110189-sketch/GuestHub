"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RoleOption } from "@/lib/data";
import { AppModal } from "@/components/ui/app-modal";

type Labels = {
  createRole: string;
  editRole: string;
  deleteRole: string;
  roleName: string;
  description: string;
  save: string;
  cancel: string;
  openCreateModal: string;
  openEditModal: string;
  openDeleteDialog: string;
  selectRoleToEdit: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  confirmDeleteButton: string;
};

type Props = {
  lang: string;
  returnTo: string;
  roles: RoleOption[];
  selectedRoleId?: number;
  labels: Labels;
};

export function RolesManagement({ lang, returnTo, roles, selectedRoleId, labels }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <article className="rounded-2xl bg-white/12 p-4 backdrop-blur-xl">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
        >
          {labels.openCreateModal}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-white/70">{labels.selectRoleToEdit}</p>
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/${lang}/roles?roleId=${role.id}`}
            className={`block rounded-xl px-3 py-2 text-sm ${selectedRole?.id === role.id ? "bg-cyan-400/25 text-white" : "bg-white/10 text-white/85"}`}
          >
            <p className="font-medium">{role.role_name}</p>
            <p className="text-xs opacity-80">{role.description ?? "-"}</p>
          </Link>
        ))}
      </div>

      {selectedRole ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-xl bg-cyan-400/25 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/35"
          >
            {labels.openEditModal}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-xl bg-rose-400/25 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/35"
          >
            {labels.openDeleteDialog}
          </button>
        </div>
      ) : null}

      <AppModal open={createOpen} onClose={() => setCreateOpen(false)} title={labels.createRole} closeLabel={labels.cancel}>
        <form action="/api/admin/roles" method="post" className="mt-4 space-y-3">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="action" value="create" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.roleName}</span>
            <input
              name="roleName"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.description}</span>
            <input name="description" className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <div className="flex justify-end">
            <button className="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
              {labels.save}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={editOpen && Boolean(selectedRole)}
        onClose={() => setEditOpen(false)}
        title={labels.editRole}
        closeLabel={labels.cancel}
      >
        {selectedRole ? (
          <form action="/api/admin/roles" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="returnTo" value={`/${lang}/roles?roleId=${selectedRole.id}`} />
            <input type="hidden" name="action" value="update" />
            <input type="hidden" name="roleId" value={selectedRole.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.roleName}</span>
              <input
                name="roleName"
                required
                defaultValue={selectedRole.role_name}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{labels.description}</span>
              <input
                name="description"
                defaultValue={selectedRole.description ?? ""}
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <div className="flex justify-end">
              <button className="rounded-xl bg-cyan-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                {labels.save}
              </button>
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={deleteOpen && Boolean(selectedRole)}
        onClose={() => setDeleteOpen(false)}
        title={labels.confirmDeleteTitle}
        maxWidthClass="max-w-md"
        closeLabel={labels.cancel}
      >
        {selectedRole ? (
          <>
            <p className="text-sm text-white/80">
              {labels.confirmDeleteMessage} <span className="font-semibold">{selectedRole.role_name}</span>
            </p>
            <div className="mt-4 flex justify-end">
              <form action="/api/admin/roles" method="post">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="returnTo" value={`/${lang}/roles`} />
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="roleId" value={selectedRole.id} />
                <button className="rounded-xl bg-rose-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                  {labels.confirmDeleteButton}
                </button>
              </form>
            </div>
          </>
        ) : null}
      </AppModal>
    </article>
  );
}
