"use client";

import { useState, useMemo, Fragment, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiFilter,
  FiGrid,
  FiList,
  FiLoader,
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import { AppSelect } from "@/components/ui/app-select";

type ServiceRequest = {
  id: number;
  guest_name: string;
  room_number: string;
  category_name_ar: string;
  category_name_en: string;
  item_name_ar: string;
  item_name_en: string;
  request_status: string;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

type Staff = { id: number; full_name: string };

type Stats = {
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
};

type Props = {
  lang: "ar" | "en";
  requests: ServiceRequest[];
  stats: Stats;
  staffList: Staff[];
  statusFilter?: string;
  basePath: string;
};

const statusConfig = {
  pending: {
    icon: FiClock,
    label: { ar: "معلّق", en: "Pending" },
    color: "amber",
    gradient: "from-amber-500/40 to-orange-500/40",
    border: "border-amber-400/50",
    badge: "bg-amber-500/30 text-amber-200 ring-1 ring-amber-400/50",
    glow: "shadow-amber-500/30",
  },
  accepted: {
    icon: FiAlertCircle,
    label: { ar: "مقبول", en: "Accepted" },
    color: "blue",
    gradient: "from-blue-500/40 to-cyan-500/40",
    border: "border-blue-400/50",
    badge: "bg-blue-500/30 text-blue-200 ring-1 ring-blue-400/50",
    glow: "shadow-blue-500/30",
  },
  in_progress: {
    icon: FiLoader,
    label: { ar: "قيد التنفيذ", en: "In Progress" },
    color: "indigo",
    gradient: "from-indigo-500/40 to-purple-500/40",
    border: "border-indigo-400/50",
    badge: "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-400/50",
    glow: "shadow-indigo-500/30",
  },
  completed: {
    icon: FiCheckCircle,
    label: { ar: "مكتمل", en: "Completed" },
    color: "emerald",
    gradient: "from-emerald-500/40 to-teal-500/40",
    border: "border-emerald-400/50",
    badge: "bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-400/50",
    glow: "shadow-emerald-500/30",
  },
  cancelled: {
    icon: FiXCircle,
    label: { ar: "ملغى", en: "Cancelled" },
    color: "slate",
    gradient: "from-slate-500/40 to-gray-500/40",
    border: "border-slate-400/50",
    badge: "bg-slate-500/30 text-slate-200 ring-1 ring-slate-400/50",
    glow: "shadow-slate-500/30",
  },
};

const statusOrder = ["pending", "accepted", "in_progress", "completed", "cancelled"] as const;

export function ServiceRequestsDashboard({
  lang,
  requests,
  stats,
  staffList,
  statusFilter,
  basePath,
}: Props) {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const isRtl = lang === "ar";

  const totalActive = stats.pending + stats.accepted + stats.in_progress;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const avgResponseTime = "12m"; // This would come from real data

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        r.guest_name.toLowerCase().includes(q) ||
        r.room_number.toLowerCase().includes(q) ||
        r.item_name_en.toLowerCase().includes(q) ||
        r.item_name_ar.includes(q)
    );
  }, [requests, searchQuery]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, ServiceRequest[]> = {};
    for (const status of statusOrder) {
      groups[status] = [];
    }
    for (const req of filteredRequests) {
      if (groups[req.request_status]) {
        groups[req.request_status].push(req);
      }
    }
    return groups;
  }, [filteredRequests]);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          Hero Stats Section
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl" />
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto]">
          {/* Main metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Active Requests */}
            <div className="group relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/25 to-orange-500/25 p-4 transition-all hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-200">
                    {t("الطلبات النشطة", "Active Requests")}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-white">{totalActive}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {t("بحاجة للمعالجة", "Need attention")}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/40 p-2.5">
                  <FiActivity className="h-5 w-5 text-amber-300" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-200">
                <FiTrendingUp className="h-3.5 w-3.5" />
                <span>+3 {t("من اليوم", "from today")}</span>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 to-teal-500/25 p-4 transition-all hover:border-emerald-400/60 hover:shadow-lg hover:shadow-emerald-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-200">
                    {t("معدل الإنجاز", "Completion Rate")}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-white">{completionRate}%</p>
                  <p className="mt-1 text-xs text-white/70">
                    {stats.completed} {t("من", "of")} {stats.total}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-500/40 p-2.5">
                  <FiBarChart2 className="h-5 w-5 text-emerald-300" />
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Avg Response Time */}
            <div className="group relative overflow-hidden rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/25 to-cyan-500/25 p-4 transition-all hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-200">
                    {t("متوسط الاستجابة", "Avg Response")}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-white">{avgResponseTime}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {t("وقت المعالجة", "Processing time")}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-500/40 p-2.5">
                  <FiClock className="h-5 w-5 text-blue-300" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300">
                <FiTrendingUp className="h-3.5 w-3.5" />
                <span>-2m {t("من الأمس", "from yesterday")}</span>
              </div>
            </div>

            {/* Total Requests */}
            <div className="group relative overflow-hidden rounded-2xl border border-purple-400/40 bg-gradient-to-br from-purple-500/25 to-pink-500/25 p-4 transition-all hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-purple-200">
                    {t("إجمالي الطلبات", "Total Requests")}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight text-white">{stats.total}</p>
                  <p className="mt-1 text-xs text-white/70">
                    {t("منذ البداية", "All time")}
                  </p>
                </div>
                <div className="rounded-xl bg-purple-500/40 p-2.5">
                  <FiGrid className="h-5 w-5 text-purple-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Status breakdown mini-chart */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/70">
              {t("توزيع الحالات", "Status Distribution")}
            </p>
            <div className="flex items-end gap-2">
              {statusOrder.slice(0, 4).map((status) => {
                const config = statusConfig[status];
                const count = stats[status as keyof Stats];
                const height = stats.total > 0 ? Math.max(8, (count / stats.total) * 80) : 8;
                return (
                  <div key={status} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-white">{count}</span>
                    <div
                      className={`w-8 rounded-t-lg bg-gradient-to-t ${config.gradient} transition-all duration-500`}
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-[10px] text-white/60">{config.label[lang].slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Status Filter Pills
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-wrap items-center gap-2">
        <a
          href={basePath}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            !statusFilter
              ? "bg-white/25 text-white shadow-lg shadow-white/10 ring-1 ring-white/30"
              : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs font-bold">
            {stats.total}
          </span>
          {t("الكل", "All")}
        </a>
        {statusOrder.map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = stats[status as keyof Stats];
          const isActive = statusFilter === status;
          return (
            <a
              key={status}
              href={`${basePath}?status=${status}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? `${config.badge} shadow-lg ${config.glow}`
                  : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "" : "opacity-80"}`} />
              <span>{config.label[lang]}</span>
              <span
                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  isActive ? "bg-white/30" : "bg-white/20"
                }`}
              >
                {count}
              </span>
            </a>
          );
        })}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Toolbar: Search, View Toggle, Actions
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative min-w-[280px] flex-1 sm:max-w-md">
          <FiSearch className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("بحث بالاسم، الغرفة، أو الخدمة...", "Search by name, room, or service...")}
            className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pe-4 ps-10 text-sm text-white placeholder-white/50 outline-none transition focus:border-cyan-400/60 focus:bg-white/15 focus:ring-2 focus:ring-cyan-400/30"
          />
        </div>

        {/* View toggle & actions */}
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/20 bg-white/10">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition ${
                viewMode === "table"
                  ? "bg-white/25 text-white"
                  : "text-white/70 hover:bg-white/15 hover:text-white"
              }`}
            >
              <FiList className="h-4 w-4" />
              <span className="hidden sm:inline">{t("جدول", "Table")}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition ${
                viewMode === "kanban"
                  ? "bg-white/25 text-white"
                  : "text-white/70 hover:bg-white/15 hover:text-white"
              }`}
            >
              <FiGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t("كانبان", "Kanban")}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/20 hover:text-white"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("تحديث", "Refresh")}</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Content: Table or Kanban View
          ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === "table" ? (
        <TableView
          requests={filteredRequests}
          staffList={staffList}
          lang={lang}
          statusFilter={statusFilter}
          basePath={basePath}
          expandedRow={expandedRow}
          setExpandedRow={setExpandedRow}
        />
      ) : (
        <KanbanView
          groups={groupedByStatus}
          staffList={staffList}
          lang={lang}
          statusFilter={statusFilter}
          basePath={basePath}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Table View Component
   ═══════════════════════════════════════════════════════════════════════════ */
function TableView({
  requests,
  staffList,
  lang,
  statusFilter,
  basePath,
  expandedRow,
  setExpandedRow,
}: {
  requests: ServiceRequest[];
  staffList: Staff[];
  lang: "ar" | "en";
  statusFilter?: string;
  basePath: string;
  expandedRow: number | null;
  setExpandedRow: (id: number | null) => void;
}) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 py-16">
        <div className="rounded-2xl bg-white/15 p-4">
          <FiGrid className="h-8 w-8 text-white/50" />
        </div>
        <p className="mt-4 text-white/70">{t("لا توجد طلبات", "No requests found")}</p>
        <p className="mt-1 text-sm text-white/50">
          {t("جرّب تغيير الفلتر أو البحث", "Try changing the filter or search")}
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] shadow-2xl backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/15 bg-white/10">
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                #
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("الضيف", "Guest")}
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("الغرفة", "Room")}
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("الخدمة", "Service")}
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("الحالة", "Status")}
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("المعيّن", "Assigned")}
              </th>
              <th className="px-4 py-4 text-start text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("الوقت", "Time")}
              </th>
              <th className="px-4 py-4 text-end text-xs font-semibold uppercase tracking-wider text-white/70">
                {t("إجراءات", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {requests.map((r) => {
              const config = statusConfig[r.request_status as keyof typeof statusConfig] ?? statusConfig.pending;
              const Icon = config.icon;
              const isExpanded = expandedRow === r.id;
              const timeAgo = getTimeAgo(r.created_at, lang);

              return (
                <Fragment key={r.id}>
                  <tr
                    className={`group transition-colors ${
                      isExpanded ? "bg-white/[0.10]" : "hover:bg-white/[0.08]"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-white/60">#{r.id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 ring-1 ring-cyan-400/40">
                          <FiUser className="h-4 w-4 text-cyan-200" />
                        </div>
                        <span className="font-medium text-white">{r.guest_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-mono text-xs text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {r.room_number}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium text-white">
                          {lang === "ar" ? r.item_name_ar : r.item_name_en}
                        </p>
                        <p className="truncate text-xs text-white/60">
                          {lang === "ar" ? r.category_name_ar : r.category_name_en}
                          {r.quantity > 1 && ` × ${r.quantity}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${config.badge}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label[lang]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {r.assigned_to_name ? (
                        <div className="flex items-center gap-2">
                          {r.assigned_to_avatar ? (
                            <img
                              src={r.assigned_to_avatar}
                              alt={r.assigned_to_name}
                              className="h-6 w-6 rounded-full object-cover ring-1 ring-purple-400/30"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 text-[10px] font-bold text-purple-200 ring-1 ring-purple-400/40">
                              {r.assigned_to_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-white">{r.assigned_to_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-white/50">{t("غير معيّن", "Unassigned")}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-white">{timeAgo}</span>
                        <span className="text-[10px] text-white/60">
                          {new Date(r.created_at).toLocaleDateString(lang, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                          className="rounded-lg p-2 text-white/70 transition hover:bg-white/15 hover:text-white"
                        >
                          <FiChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-expanded`}>
                      <td colSpan={8} className="border-t border-white/10 bg-white/[0.06] px-4 py-4">
                        <RequestActionPanel
                          request={r}
                          staffList={staffList}
                          lang={lang}
                          statusFilter={statusFilter}
                          basePath={basePath}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Kanban View Component
   ═══════════════════════════════════════════════════════════════════════════ */
function KanbanView({
  groups,
  staffList,
  lang,
  statusFilter,
  basePath,
}: {
  groups: Record<string, ServiceRequest[]>;
  staffList: Staff[];
  lang: "ar" | "en";
  statusFilter?: string;
  basePath: string;
}) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  return (
    <div className="grid gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {statusOrder.slice(0, 4).map((status) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const items = groups[status] || [];

        return (
          <div
            key={status}
            className={`flex flex-col rounded-2xl border ${config.border} bg-gradient-to-b ${config.gradient} p-4`}
          >
            {/* Column header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`rounded-lg ${config.badge} p-1.5`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-semibold text-white">{config.label[lang]}</span>
              </div>
              <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/20 px-2 text-xs font-bold text-white">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-3">
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/20 py-8">
                  <p className="text-xs text-white/50">{t("لا توجد طلبات", "No requests")}</p>
                </div>
              ) : (
                items.map((r) => (
                  <KanbanCard
                    key={r.id}
                    request={r}
                    staffList={staffList}
                    lang={lang}
                    statusFilter={statusFilter}
                    basePath={basePath}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  request: r,
  staffList,
  lang,
  statusFilter,
  basePath,
}: {
  request: ServiceRequest;
  staffList: Staff[];
  lang: "ar" | "en";
  statusFilter?: string;
  basePath: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const timeAgo = getTimeAgo(r.created_at, lang);

  return (
    <div className="group rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/15">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/40 to-blue-500/40 text-xs font-bold text-cyan-200">
            {r.room_number}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{r.guest_name}</p>
            <p className="text-xs text-white/60">{timeAgo}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowActions(!showActions)}
          className="rounded p-1 text-white/50 opacity-0 transition group-hover:opacity-100 hover:bg-white/15 hover:text-white"
        >
          <FiMoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Service info */}
      <div className="mt-3">
        <p className="text-sm text-white">{lang === "ar" ? r.item_name_ar : r.item_name_en}</p>
        <p className="mt-0.5 text-xs text-white/60">
          {lang === "ar" ? r.category_name_ar : r.category_name_en}
          {r.quantity > 1 && ` × ${r.quantity}`}
        </p>
      </div>

      {/* Notes */}
      {r.notes && (
        <p className="mt-2 truncate rounded bg-white/10 px-2 py-1 text-xs text-white/80">
          {r.notes}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
        {r.assigned_to_name ? (
          <div className="flex items-center gap-1.5">
            {r.assigned_to_avatar ? (
              <img
                src={r.assigned_to_avatar}
                alt={r.assigned_to_name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 text-[8px] font-bold text-purple-200">
                {r.assigned_to_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-white/80">{r.assigned_to_name}</span>
          </div>
        ) : (
          <span className="text-xs text-white/50">{t("غير معيّن", "Unassigned")}</span>
        )}
        <span className="font-mono text-[10px] text-white/50">#{r.id}</span>
      </div>

      {/* Action panel */}
      {showActions && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <RequestActionPanel
            request={r}
            staffList={staffList}
            lang={lang}
            statusFilter={statusFilter}
            basePath={basePath}
            compact
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Request Action Panel
   ═══════════════════════════════════════════════════════════════════════════ */
function RequestActionPanel({
  request: r,
  staffList,
  lang,
  statusFilter,
  basePath,
  compact = false,
}: {
  request: ServiceRequest;
  staffList: Staff[];
  lang: "ar" | "en";
  statusFilter?: string;
  basePath: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const returnUrl = `${basePath}${statusFilter ? `?status=${statusFilter}` : ""}`;
  const isTerminal = r.request_status === "completed" || r.request_status === "cancelled";

  const statusLabel = (s: string) => statusConfig[s as keyof typeof statusConfig]?.label[lang] ?? s;

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;

    const formData = new FormData();
    formData.append("lang", lang);
    formData.append("action", "update_status");
    formData.append("requestId", String(r.id));
    formData.append("status", status);
    if (assignedTo) formData.append("assignedTo", assignedTo);
    formData.append("returnTo", returnUrl);

    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        body: formData,
        redirect: "manual",
      });
      // After success, refresh the page data without full reload
      startTransition(() => {
        router.refresh();
      });
      setStatus("");
      setAssignedTo("");
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(t("هل أنت متأكد من حذف هذا الطلب؟", "Are you sure you want to delete this request?"))) {
      return;
    }

    const formData = new FormData();
    formData.append("lang", lang);
    formData.append("action", "delete");
    formData.append("requestId", String(r.id));
    formData.append("returnTo", returnUrl);

    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        body: formData,
        redirect: "manual",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "flex-col items-stretch" : ""}`}>
      {!isTerminal && (
        <form onSubmit={handleUpdateStatus} className="flex flex-wrap items-center gap-2">
          <AppSelect
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
            className="rounded-lg px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("تغيير الحالة", "Change Status")}
            </option>
            {statusOrder.map((s) => {
              if (s === r.request_status || s === "pending") return null;
              return (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              );
            })}
          </AppSelect>

          <AppSelect
            name="assignedTo"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t("تعيين موظف", "Assign Staff")}</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </AppSelect>

          <button
            type="submit"
            disabled={isPending || !status}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/30 disabled:opacity-50"
          >
            {isPending ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : (
              <FiCheckCircle className="h-4 w-4" />
            )}
            {t("تطبيق", "Apply")}
          </button>
        </form>
      )}

      <form onSubmit={handleDelete}>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          <FiXCircle className="h-4 w-4" />
          {t("حذف", "Delete")}
        </button>
      </form>

      {/* Notes */}
      {r.notes && !compact && (
        <div className="ms-auto max-w-xs rounded-lg bg-white/5 px-3 py-2">
          <p className="text-xs text-white/40">{t("ملاحظات", "Notes")}</p>
          <p className="mt-1 text-sm text-white/70">{r.notes}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */
function getTimeAgo(dateStr: string, lang: "ar" | "en"): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return lang === "ar" ? "الآن" : "Just now";
  if (diffMins < 60) return lang === "ar" ? `${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return lang === "ar" ? `${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return lang === "ar" ? `${diffDays} يوم` : `${diffDays}d ago`;
  return date.toLocaleDateString(lang, { month: "short", day: "numeric" });
}
