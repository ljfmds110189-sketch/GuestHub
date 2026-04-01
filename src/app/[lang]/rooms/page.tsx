import { PanelShell } from "@/components/panel/panel-shell";
import { Pagination } from "@/components/panel/pagination";
import { RoomsManagement } from "@/components/panel/rooms-management";
import { hasPermission } from "@/lib/auth";
import { listRoomsPaginated } from "@/lib/data";
import { readPager, requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; error?: string; ok?: string }>;
};

export default async function RoomsPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "occupancy.view", "dashboard");

  const pager = readPager(query, { pageSize: 12 });
  const rooms = await listRoomsPaginated(pager.page, pager.pageSize);
  const canManageRooms = hasPermission(ctx.user, "rooms.manage");

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="rooms"
      title={ctx.t("إدارة الغرف", "Rooms Management")}
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

      <RoomsManagement
        lang={ctx.lang}
        returnTo={`/${ctx.lang}/rooms`}
        rooms={rooms.rows}
        canManageRooms={canManageRooms}
        labels={{
          addRoom: ctx.t("إضافة غرفة جديدة", "Add New Room"),
          editRoom: ctx.t("تعديل بيانات الغرفة", "Edit Room"),
          deleteRoom: ctx.t("حذف الغرفة", "Delete Room"),
          save: ctx.t("حفظ", "Save"),
          cancel: ctx.t("إلغاء", "Cancel"),
          roomNumber: ctx.t("رقم الغرفة", "Room number"),
          floor: ctx.t("الطابق", "Floor"),
          roomType: ctx.t("نوع الغرفة", "Room type"),
          capacity: ctx.t("السعة", "Capacity"),
          status: ctx.t("الحالة", "Status"),
          active: ctx.t("نشطة", "Active"),
          maintenance: ctx.t("صيانة", "Maintenance"),
          actions: ctx.t("إجراءات", "Actions"),
          room: ctx.t("الغرفة", "Room"),
          type: ctx.t("النوع", "Type"),
          available: ctx.t("متاحة", "Available"),
          occupied: ctx.t("مشغولة", "Occupied"),
          maintenanceLabel: ctx.t("صيانة", "Maintenance"),
          confirmDeleteTitle: ctx.t("تأكيد حذف الغرفة", "Confirm Room Deletion"),
          confirmDeleteMessage: ctx.t(
            "هل أنت متأكد من حذف هذه الغرفة؟ لا يمكن التراجع عن هذا الإجراء.",
            "Are you sure you want to delete this room? This action cannot be undone.",
          ),
          confirmDeleteButton: ctx.t("تأكيد الحذف", "Confirm Delete"),
          openAddModal: ctx.t("إضافة غرفة", "Add Room"),
          openEditModal: ctx.t("تعديل", "Edit"),
          openDeleteDialog: ctx.t("حذف", "Delete"),
        }}
      />

      <Pagination
        lang={ctx.lang}
        basePath={`/${ctx.lang}/rooms`}
        page={rooms.pagination.page}
        pageSize={rooms.pagination.pageSize}
        total={rooms.pagination.total}
      />
    </PanelShell>
  );
}
