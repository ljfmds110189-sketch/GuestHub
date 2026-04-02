import { PanelShell } from "@/components/panel/panel-shell";
import { DashboardGrid } from "@/components/panel/dashboard-grid";
import { getRoomStats, getServiceRequestStats } from "@/lib/data";
import { hasPermission } from "@/lib/auth";
import { requirePanelContext } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);

  const [stats, srStats] = await Promise.all([
    getRoomStats(),
    hasPermission(ctx.user, "services.manage")
      ? getServiceRequestStats()
      : Promise.resolve(null),
  ]);

  const serviceOpen = srStats ? srStats.pending + srStats.accepted + srStats.in_progress : 0;
  const hasServicePermission = hasPermission(ctx.user, "services.manage");

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="dashboard"
      title={ctx.t("لوحة التحكم", "Dashboard")}
      backgroundImage="/back.jpeg"
    >
      <div className="mx-auto w-full max-w-6xl space-y-4 p-1 md:p-2">
          {query.error ? (
            <p className="rounded-2xl bg-rose-500/25 px-4 py-2 text-sm text-rose-100 backdrop-blur-md">
              {query.error}
            </p>
          ) : null}
          {query.ok ? (
            <p className="rounded-2xl bg-emerald-500/25 px-4 py-2 text-sm text-emerald-100 backdrop-blur-md">
              {query.ok}
            </p>
          ) : null}

          <DashboardGrid
            lang={ctx.lang}
            roomCount={stats.total}
            serviceOpen={serviceOpen}
            srStats={srStats}
            hasServicePermission={hasServicePermission}
          />
      </div>
    </PanelShell>
  );
}
