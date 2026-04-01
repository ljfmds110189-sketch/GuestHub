import { PanelShell } from "@/components/panel/panel-shell";
import { Pagination } from "@/components/panel/pagination";
import { GuestsManagement } from "@/components/panel/guests-management";
import { hasPermission } from "@/lib/auth";
import { listGuestsPaginated } from "@/lib/data";
import { readPager, requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; error?: string; ok?: string }>;
};

export default async function GuestsPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "occupancy.view", "dashboard");

  const pager = readPager(query, { pageSize: 10 });
  const guests = await listGuestsPaginated(pager.page, pager.pageSize);
  const canManage = hasPermission(ctx.user, "guests.manage");

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="guests"
      title={ctx.t("إدارة الضيوف", "Guest Management")}
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

      <GuestsManagement
        lang={ctx.lang}
        returnTo={`/${ctx.lang}/guests`}
        guests={guests.rows}
        canManage={canManage}
        labels={{
          addGuest: ctx.t("إضافة ضيف", "Add Guest"),
          editGuest: ctx.t("تعديل بيانات الضيف", "Edit Guest"),
          deleteGuest: ctx.t("حذف الضيف", "Delete Guest"),
          save: ctx.t("حفظ", "Save"),
          cancel: ctx.t("إلغاء", "Cancel"),
          firstName: ctx.t("الاسم الأول", "First name"),
          lastName: ctx.t("اسم العائلة", "Last name"),
          phone: ctx.t("الهاتف", "Phone"),
          email: ctx.t("البريد الإلكتروني", "Email"),
          actions: ctx.t("إجراءات", "Actions"),
          name: ctx.t("الاسم", "Name"),
          currentRoom: ctx.t("الغرفة الحالية", "Current room"),
          checkInOut: ctx.t("الدخول/الخروج", "Check in/out"),
          openAddModal: ctx.t("إضافة ضيف", "Add Guest"),
          openEditModal: ctx.t("تعديل", "Edit"),
          openDeleteDialog: ctx.t("حذف", "Delete"),
          confirmDeleteTitle: ctx.t("تأكيد حذف الضيف", "Confirm Guest Deletion"),
          confirmDeleteMessage: ctx.t(
            "هل أنت متأكد من حذف هذا الضيف؟ لا يمكن التراجع عن هذا الإجراء.",
            "Are you sure you want to delete this guest? This action cannot be undone.",
          ),
          confirmDeleteButton: ctx.t("تأكيد الحذف", "Confirm Delete"),
        }}
      />

      <Pagination
        lang={ctx.lang}
        basePath={`/${ctx.lang}/guests`}
        page={guests.pagination.page}
        pageSize={guests.pagination.pageSize}
        total={guests.pagination.total}
      />
    </PanelShell>
  );
}
