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
import { ServiceRequestsDashboard } from "@/components/panel/service-requests-dashboard";
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

export default async function ServiceRequestsPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "services.manage", "dashboard");

  const pager = readPager(query, { pageSize: 20 });
  const statusFilter = query.status || undefined;

  const [requests, stats, staffList, reservations, serviceItems] = await Promise.all([
    listServiceRequestsPaginated(pager.page, pager.pageSize, { status: statusFilter }),
    getServiceRequestStats(),
    listStaffUsers(),
    listActiveReservations(),
    listServiceItemOptions(),
  ]);

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="service-requests"
      title={ctx.t("طلبات الخدمة", "Service Requests")}
    >
      {query.error ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-gradient-to-r from-rose-500/10 to-pink-500/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20">
            <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-rose-200">{query.error}</p>
        </div>
      ) : null}

      {query.ok ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-emerald-200">{query.ok}</p>
        </div>
      ) : null}

      {/* Dashboard with stats, filters, and views */}
      <ServiceRequestsDashboard
        lang={ctx.lang}
        requests={requests.rows}
        stats={stats}
        staffList={staffList}
        statusFilter={statusFilter}
        basePath={`/${ctx.lang}/service-requests`}
      />

      {/* Create new request button */}
      <div className="mt-6">
        <CreateRequestForm
          lang={ctx.lang}
          reservations={reservations}
          serviceItems={serviceItems}
          returnTo={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
        />
      </div>

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          lang={ctx.lang}
          basePath={`/${ctx.lang}/service-requests${statusFilter ? `?status=${statusFilter}` : ""}`}
          page={requests.pagination.page}
          pageSize={requests.pagination.pageSize}
          total={requests.pagination.total}
        />
      </div>
    </PanelShell>
  );
}
