import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiGrid,
  FiLayers,
  FiSettings,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import Link from "next/link";
import { PanelShell } from "@/components/panel/panel-shell";
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

  const groups = [
    {
      titleAr: "إدارة الغرف والحجوزات",
      titleEn: "Rooms & Reservations",
      tiles: [
        {
          href: `/${ctx.lang}/rooms`,
          label: ctx.t("الغرف", "Rooms"),
          icon: FiLayers,
          meta: `${stats.total} ${ctx.t("غرفة", "rooms")}`,
          iconClass: "bg-cyan-100 text-cyan-700",
        },
        {
          href: `/${ctx.lang}/reservations`,
          label: ctx.t("الحجوزات", "Reservations"),
          icon: FiCalendar,
          meta: ctx.t("متابعة مباشرة", "Live board"),
          iconClass: "bg-amber-100 text-amber-700",
        },
        {
          href: `/${ctx.lang}/qr-codes`,
          label: ctx.t("رموز QR", "QR Codes"),
          icon: FiGrid,
          meta: ctx.t("رموز الغرف", "Room codes"),
          iconClass: "bg-violet-100 text-violet-700",
        },
      ],
    },
    {
      titleAr: "الخدمات والضيوف",
      titleEn: "Services & Guests",
      tiles: [
        {
          href: `/${ctx.lang}/service-requests`,
          label: ctx.t("طلبات الخدمة", "Service Requests"),
          icon: FiBell,
          meta: `${serviceOpen} ${ctx.t("مفتوحة", "open")}`,
          iconClass: "bg-fuchsia-100 text-fuchsia-700",
        },
        {
          href: `/${ctx.lang}/guests`,
          label: ctx.t("الضيوف", "Guests"),
          icon: FiUsers,
          meta: ctx.t("قائمة النزلاء", "Guest directory"),
          iconClass: "bg-teal-100 text-teal-700",
        },
      ],
    },
    {
      titleAr: "الإعدادات والصلاحيات",
      titleEn: "Settings & Access",
      tiles: [
        {
          href: `/${ctx.lang}/users`,
          label: ctx.t("المستخدمون", "Users"),
          icon: FiUser,
          meta: ctx.t("فريق الفندق", "Hotel staff"),
          iconClass: "bg-indigo-100 text-indigo-700",
        },
        {
          href: `/${ctx.lang}/roles`,
          label: ctx.t("الأدوار", "Roles"),
          icon: FiBookOpen,
          meta: ctx.t("الصلاحيات", "Permissions"),
          iconClass: "bg-rose-100 text-rose-700",
        },
        {
          href: `/${ctx.lang}/profile`,
          label: ctx.t("الملف الشخصي", "Profile"),
          icon: FiSettings,
          meta: ctx.t("حسابك", "Your account"),
          iconClass: "bg-emerald-100 text-emerald-700",
        },
      ],
    },
  ];

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

          {groups.map((group) => (
            <section key={group.titleEn} className="rounded-3xl bg-white/12 p-4 backdrop-blur-xl md:p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
                {ctx.t(group.titleAr, group.titleEn)}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.tiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <Link
                      key={tile.href}
                      href={tile.href}
                      className="group rounded-2xl bg-white/14 p-4 text-center backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
                    >
                      <div className="flex min-h-28 flex-col items-center justify-center gap-3">
                        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${tile.iconClass}`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{tile.label}</p>
                          <p className="mt-1 text-[11px] text-white/70">{tile.meta}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="rounded-2xl bg-white/12 p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {ctx.t("مركز الإشعارات", "Notification Center")}
                </h2>
                <p className="mt-1 text-sm text-white/75">
                  {ctx.t(
                    "مراجعة التنبيهات الحرجة وتوجيه الطلبات إلى الفريق المناسب بسرعة.",
                    "Review critical alerts and route requests to the right team quickly.",
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-amber-400/25 px-3 py-1.5 text-xs font-semibold text-amber-100">
                {ctx.t("التذاكر المفتوحة", "Open Tickets")}: {serviceOpen}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link
                href={`/${ctx.lang}/service-requests?status=pending`}
                className="rounded-xl bg-amber-400/20 px-3 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-400/30"
              >
                {ctx.t("بانتظار المعالجة", "Pending Queue")} {srStats ? `(${srStats.pending})` : ""}
              </Link>
              <Link
                href={`/${ctx.lang}/service-requests?status=in_progress`}
                className="rounded-xl bg-indigo-400/20 px-3 py-2.5 text-sm font-medium text-indigo-50 transition hover:bg-indigo-400/30"
              >
                {ctx.t("قيد التنفيذ", "In Progress")} {srStats ? `(${srStats.in_progress})` : ""}
              </Link>
              <Link
                href={`/${ctx.lang}/service-requests`}
                className="rounded-xl bg-cyan-400/20 px-3 py-2.5 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/30"
              >
                {ctx.t("عرض كل التنبيهات", "View All Alerts")}
              </Link>
            </div>

            {hasServicePermission ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs text-white/80">
                <FiClock className="h-4 w-4" />
                {ctx.t(
                  "مزامنة الإشعارات تعمل تلقائياً كل 10 ثوان لضمان تحديث فوري.",
                  "Notification sync runs every 10 seconds for near real-time updates.",
                )}
              </div>
            ) : null}
          </section>
      </div>
    </PanelShell>
  );
}
