import Link from "next/link";
import { PanelShell } from "@/components/panel/panel-shell";
import { Pagination } from "@/components/panel/pagination";
import { UsersManagement } from "@/components/panel/users-management";
import { listRoles, listUsersPaginated } from "@/lib/data";
import { readPager, requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; error?: string; ok?: string }>;
};

export default async function UsersPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "users.manage", "dashboard");

  const pager = readPager(query, { pageSize: 10 });
  const [users, roles] = await Promise.all([
    listUsersPaginated(pager.page, pager.pageSize),
    listRoles(),
  ]);

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="users"
      title={ctx.t("إدارة المستخدمين", "Users Management")}
    >
      {query.error ? (
        <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {query.ok}
        </p>
      ) : null}

      <UsersManagement
        lang={ctx.lang}
        returnTo={`/${ctx.lang}/users`}
        users={users.rows}
        roles={roles}
        labels={{
          addUser: ctx.t("إضافة مستخدم", "Add User"),
          assignRole: ctx.t("تعيين دور", "Assign Role"),
          fullName: ctx.t("الاسم الكامل", "Full name"),
          username: ctx.t("اسم المستخدم", "Username"),
          password: ctx.t("كلمة المرور (8+)", "Password (8+)"),
          selectUser: ctx.t("اختر مستخدم", "Select user"),
          selectRole: ctx.t("اختر دور", "Select role"),
          create: ctx.t("إضافة", "Create"),
          saveRole: ctx.t("حفظ الدور", "Assign"),
          cancel: ctx.t("إلغاء", "Cancel"),
        }}
      />

      <section className="overflow-hidden rounded-2xl bg-white/12 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">{ctx.t("المستخدم", "User")}</th>
                <th className="px-4 py-3 text-left">{ctx.t("الاسم", "Full name")}</th>
                <th className="px-4 py-3 text-left">{ctx.t("الأدوار", "Roles")}</th>
                <th className="px-4 py-3 text-left">{ctx.t("الحالة", "Status")}</th>
                <th className="px-4 py-3 text-left">{ctx.t("إجراء", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {users.rows.map((user) => (
                <tr key={user.id} className="border-t border-slate-200 text-slate-700">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/${ctx.lang}/users/${user.id}`} className="text-blue-600 hover:text-blue-700">
                      {user.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.roles.length ? user.roles.join(", ") : "-"}</td>
                  <td className="px-4 py-3">
                    {user.is_active ? ctx.t("نشط", "Active") : ctx.t("موقوف", "Disabled")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${ctx.lang}/users/${user.id}/edit`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {ctx.t("تعديل", "Edit")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination
        lang={ctx.lang}
        basePath={`/${ctx.lang}/users`}
        page={users.pagination.page}
        pageSize={users.pagination.pageSize}
        total={users.pagination.total}
      />
    </PanelShell>
  );
}
