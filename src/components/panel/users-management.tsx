"use client";

import { useState } from "react";
import type { RoleOption, StaffUser } from "@/lib/data";
import { AppModal } from "@/components/ui/app-modal";
import { AppSelect } from "@/components/ui/app-select";

type Labels = {
  addUser: string;
  assignRole: string;
  fullName: string;
  username: string;
  password: string;
  selectUser: string;
  selectRole: string;
  create: string;
  saveRole: string;
  cancel: string;
};

type Props = {
  lang: string;
  returnTo: string;
  users: StaffUser[];
  roles: RoleOption[];
  labels: Labels;
};

export function UsersManagement({ lang, returnTo, users, roles, labels }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <>
      <section className="mb-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
        >
          {labels.addUser}
        </button>
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
        >
          {labels.assignRole}
        </button>
      </section>

      <AppModal open={addOpen} onClose={() => setAddOpen(false)} title={labels.addUser} closeLabel={labels.cancel}>
        <form action="/api/admin/users" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.fullName}</span>
            <input
              name="fullName"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.username}</span>
            <input
              name="username"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.password}</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
              {labels.create}
            </button>
          </div>
        </form>
      </AppModal>

      <AppModal open={assignOpen} onClose={() => setAssignOpen(false)} title={labels.assignRole} closeLabel={labels.cancel}>
        <form action="/api/admin/user-roles" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.selectUser}</span>
            <AppSelect name="userId" required>
              <option value="" className="text-slate-900">{labels.selectUser}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="text-slate-900">
                  {user.username}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/80">{labels.selectRole}</span>
            <AppSelect name="roleId" required>
              <option value="" className="text-slate-900">{labels.selectRole}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id} className="text-slate-900">
                  {role.role_name}
                </option>
              ))}
            </AppSelect>
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded-xl bg-cyan-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
              {labels.saveRole}
            </button>
          </div>
        </form>
      </AppModal>
    </>
  );
}
