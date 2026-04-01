import { FiAlertCircle, FiCheckCircle, FiClock, FiLoader, FiXCircle } from "react-icons/fi";
import { PanelShell } from "@/components/panel/panel-shell";
import { Pagination } from "@/components/panel/pagination";
import {
  getServiceRequestStats,
  listActiveReservations,
  listServiceItemOptions,
  listServiceRequestsPaginated,
  listStaffUsers,
} from "@/lib/data";
import { CreateRequestForm } from "@/components/panel/create-request-form";
import { AppSelect } from "@/components/ui/app-select";
import { readPager, requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    error?: string;
    ok?: string;
  }>;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: FiClock,
  accepted: FiAlertCircle,
  in_progress: FiLoader,
  completed: FiCheckCircle,
  cancelled: FiXCircle,
};

export default async function ServiceRequestsPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "services.manage", "dashboard");

  const pager = readPager(query, { pageSize: 15 });
  const statusFilter = query.status || undefined;

  const [requests, stats, staffList, reservations, serviceItems] = await Promise.all([
    listServiceRequestsPaginated(pager.page, pager.pageSize, { status: statusFilter }),
    getServiceRequestStats(),
    listStaffUsers(),
    listActiveReservations(),
    listServiceItemOptions(),
  ]);

  const totalActive = stats.pending + stats.accepted + stats.in_progress;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusLabel = (s: string) => {
    const map: Record<string, [string, string]> = {
      pending: ["معلّق", "Pending"],
      accepted: ["مقبول", "Accepted"],
      in_progress: ["قيد التنفيذ", "In Progress"],
      completed: ["مكتمل", "Completed"],
      cancelled: ["ملغى", "Cancelled"],
    };
    const pair = map[s];
    return pair ? ctx.t(pair[0], pair[1]) : s;
  };

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="service-requests"
      title={ctx.t("طلبات الخدمة", "Service Requests")}
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

      {/* Stats cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(["pending", "accepted", "in_progress", "completed", "cancelled"] as const).map((s) => {
          const Icon = statusIcons[s];
          return (
            <a
              key={s}
              href={`/${ctx.lang}/service-requests?status=${s}`}
              className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                statusFilter === s
                  ? "border-teal-400 bg-teal-50 ring-2 ring-teal-500"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-xs text-slate-500">{statusLabel(s)}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-2xl font-bold text-slate-900">
                  {stats[s as keyof typeof stats]}
                </p>
                <Icon className="h-5 w-5 text-slate-400" />
              </div>
            </a>
          );
        })}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {ctx.t("فلتر الحالة", "Status Filter")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/${ctx.lang}/service-requests`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                !statusFilter
                  ? "border-teal-400 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {ctx.t("الكل", "All")} ({stats.total})
            </a>
            {(["pending", "accepted", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <a
                key={s}
                href={`/${ctx.lang}/service-requests?status=${s}`}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === s
                    ? "border-teal-400 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {statusLabel(s)} ({stats[s as keyof typeof stats]})
              </a>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {ctx.t("خلاصه", "Summary")}
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">{ctx.t("مفتوحة", "Open")}</p>
              <p className="mt-1 text-lg font-bold text-amber-800">{totalActive}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-700">{ctx.t("مكتملة", "Done")}</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">{stats.completed}</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-xs text-slate-600">{ctx.t("إنجاز", "Rate")}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{completionRate}%</p>
            </div>
          </div>
        </article>
      </section>

      {statusFilter ? (
        <div className="mt-3">
          <a
            href={`/${ctx.lang}/service-requests`}
            className="text-sm text-teal-600 underline"
          >
            {ctx.t("عرض الكل", "Show all")}
          </a>
        </div>
      ) : null}

      {/* Create request on behalf of guest */}
      <CreateRequestForm
        lang={ctx.lang}
        reservations={reservations}
        serviceItems={serviceItems}
        returnTo={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
      />

      {/* Requests table */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                <th className="px-4 py-3 text-start font-medium">#</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("الضيف", "Guest")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("الغرفة", "Room")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("الفئة", "Category")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("الخدمة", "Service")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("الحالة", "Status")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("المعيّن", "Assigned")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("التاريخ", "Date")}</th>
                <th className="px-4 py-3 text-start font-medium">{ctx.t("إجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    {ctx.t("لا توجد طلبات", "No requests found")}
                  </td>
                </tr>
              ) : null}
              {requests.rows.map((r) => {
                const StatusIcon = statusIcons[r.request_status] ?? FiClock;
                return (
                  <tr key={r.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.id}</td>
                    <td className="px-4 py-3">{r.guest_name}</td>
                    <td className="px-4 py-3 font-mono">{r.room_number}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {ctx.lang === "ar" ? r.category_name_ar : r.category_name_en}
                    </td>
                    <td className="px-4 py-3">
                      {ctx.lang === "ar" ? r.item_name_ar : r.item_name_en}
                      {r.quantity > 1 ? (
                        <span className="ms-1 text-xs text-slate-400">×{r.quantity}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[r.request_status] ?? ""}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusLabel(r.request_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.assigned_to_name ?? (
                        <span className="text-slate-300">{ctx.t("غير معيّن", "Unassigned")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleDateString(ctx.lang === "ar" ? "ar" : "en", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {r.request_status !== "completed" && r.request_status !== "cancelled" ? (
                          <form
                            action="/api/service-requests"
                            method="post"
                            className="flex flex-wrap items-center gap-1"
                          >
                            <input type="hidden" name="lang" value={ctx.lang} />
                            <input type="hidden" name="action" value="update_status" />
                            <input type="hidden" name="requestId" value={r.id} />
                            <input
                              type="hidden"
                              name="returnTo"
                              value={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
                            />
                            <AppSelect
                              name="status"
                              defaultValue=""
                              required
                              className="rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="" disabled>
                                {ctx.t("تغيير", "Change")}
                              </option>
                              {r.request_status !== "accepted" ? (
                                <option value="accepted">{statusLabel("accepted")}</option>
                              ) : null}
                              {r.request_status !== "in_progress" ? (
                                <option value="in_progress">{statusLabel("in_progress")}</option>
                              ) : null}
                              <option value="completed">{statusLabel("completed")}</option>
                              <option value="cancelled">{statusLabel("cancelled")}</option>
                            </AppSelect>
                            <AppSelect
                              name="assignedTo"
                              className="rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="">{ctx.t("تعيين", "Assign")}</option>
                              {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name}
                                </option>
                              ))}
                            </AppSelect>
                            <button className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                              {ctx.t("حفظ", "Save")}
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                        <form action="/api/service-requests" method="post">
                          <input type="hidden" name="lang" value={ctx.lang} />
                          <input type="hidden" name="action" value="delete" />
                          <input type="hidden" name="requestId" value={r.id} />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
                          />
                          <button className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            {ctx.t("حذف", "Delete")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Pagination
        lang={ctx.lang}
        basePath={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
        page={requests.pagination.page}
        pageSize={requests.pagination.pageSize}
        total={requests.pagination.total}
      />
    </PanelShell>
  );
}
