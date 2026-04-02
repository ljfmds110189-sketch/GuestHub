"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  FiActivity,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";

interface DashboardGridProps {
  lang: string;
  roomCount: number;
  serviceOpen: number;
  srStats: { pending: number; accepted: number; in_progress: number; completed: number; cancelled: number } | null;
  hasServicePermission: boolean;
}

interface Tile {
  id: string;
  href: string;
  labelAr: string;
  labelEn: string;
  icon: React.ElementType;
  metaAr: string;
  metaEn: string;
  iconClass: string;
  glowColor: string;
  groupAr: string;
  groupEn: string;
}

/* ─────────────────────────────────────────────────────────────
   Glow Card – follows mouse with icon-matched glow
───────────────────────────────────────────────────────────── */
function GlowCard({
  tile,
  index,
  lang,
}: {
  tile: Tile;
  index: number;
  lang: string;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80);
    return () => clearTimeout(timer);
  }, [index]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const Icon = tile.icon;
  const label = lang === "ar" ? tile.labelAr : tile.labelEn;
  const meta = lang === "ar" ? tile.metaAr : tile.metaEn;
  const group = lang === "ar" ? tile.groupAr : tile.groupEn;

  return (
    <Link
      ref={cardRef}
      href={tile.href}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`
        group relative overflow-hidden rounded-2xl border border-white/10 
        bg-white/[0.08] p-5 backdrop-blur-xl transition-all duration-500
        hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.12]
        hover:shadow-2xl hover:shadow-black/20
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
      `}
      style={{
        transitionDelay: `${index * 50}ms`,
      }}
    >
      {/* Mouse glow effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isHovering
            ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, ${tile.glowColor}, transparent 40%)`
            : "none",
        }}
      />

      {/* Border glow on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${tile.glowColor.replace("0.15", "0.3")}, transparent 40%)`,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-32 flex-col items-center justify-center gap-4">
        {/* Icon with glow */}
        <div className="relative">
          <div
            className={`
              grid h-16 w-16 place-items-center rounded-2xl transition-all duration-300
              ${tile.iconClass}
              group-hover:scale-110 group-hover:shadow-lg
            `}
            style={{
              boxShadow: isHovering ? `0 0 30px ${tile.glowColor}` : "none",
            }}
          >
            <Icon className="h-8 w-8 transition-transform duration-300 group-hover:scale-110" />
          </div>
          {/* Pulse ring on hover */}
          <div
            className={`
              absolute inset-0 rounded-2xl transition-all duration-500
              ${isHovering ? "animate-ping opacity-30" : "opacity-0"}
            `}
            style={{ backgroundColor: tile.glowColor }}
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-semibold text-white transition-colors duration-300 group-hover:text-white">
            {label}
          </p>
          <p className="mt-1.5 text-xs text-white/60 transition-colors duration-300 group-hover:text-white/80">
            {meta}
          </p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40 transition-colors duration-300 group-hover:text-white/60">
            {group}
          </p>
        </div>
      </div>

      {/* Corner accent */}
      <div
        className="absolute -right-12 -top-12 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ backgroundColor: tile.glowColor }}
      />
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stats Card with animated number
───────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const visTimer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(visTimer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, isVisible]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl
        transition-all duration-700
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{displayValue}</p>
        </div>
        <div
          className="grid h-12 w-12 place-items-center rounded-xl"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {/* Decorative gradient line */}
      <div
        className="absolute bottom-0 left-0 h-1 w-full opacity-60"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Dashboard Grid
───────────────────────────────────────────────────────────── */
export function DashboardGrid({
  lang,
  roomCount,
  serviceOpen,
  srStats,
  hasServicePermission,
}: DashboardGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const tiles: Tile[] = [
    {
      id: "rooms",
      href: `/${lang}/rooms`,
      labelAr: "الغرف",
      labelEn: "Rooms",
      icon: FiLayers,
      metaAr: `${roomCount} غرفة`,
      metaEn: `${roomCount} rooms`,
      iconClass: "bg-cyan-500/20 text-cyan-300",
      glowColor: "rgba(6, 182, 212, 0.15)",
      groupAr: "الغرف والحجوزات",
      groupEn: "Rooms & Reservations",
    },
    {
      id: "reservations",
      href: `/${lang}/reservations`,
      labelAr: "الحجوزات",
      labelEn: "Reservations",
      icon: FiCalendar,
      metaAr: "متابعة مباشرة",
      metaEn: "Live board",
      iconClass: "bg-amber-500/20 text-amber-300",
      glowColor: "rgba(245, 158, 11, 0.15)",
      groupAr: "الغرف والحجوزات",
      groupEn: "Rooms & Reservations",
    },
    {
      id: "qr-codes",
      href: `/${lang}/qr-codes`,
      labelAr: "رموز QR",
      labelEn: "QR Codes",
      icon: FiGrid,
      metaAr: "رموز الغرف",
      metaEn: "Room codes",
      iconClass: "bg-violet-500/20 text-violet-300",
      glowColor: "rgba(139, 92, 246, 0.15)",
      groupAr: "الغرف والحجوزات",
      groupEn: "Rooms & Reservations",
    },
    {
      id: "service-requests",
      href: `/${lang}/service-requests`,
      labelAr: "طلبات الخدمة",
      labelEn: "Service Requests",
      icon: FiBell,
      metaAr: `${serviceOpen} مفتوحة`,
      metaEn: `${serviceOpen} open`,
      iconClass: "bg-fuchsia-500/20 text-fuchsia-300",
      glowColor: "rgba(217, 70, 239, 0.15)",
      groupAr: "الخدمات والضيوف",
      groupEn: "Services & Guests",
    },
    {
      id: "guests",
      href: `/${lang}/guests`,
      labelAr: "الضيوف",
      labelEn: "Guests",
      icon: FiUsers,
      metaAr: "قائمة النزلاء",
      metaEn: "Guest directory",
      iconClass: "bg-teal-500/20 text-teal-300",
      glowColor: "rgba(20, 184, 166, 0.15)",
      groupAr: "الخدمات والضيوف",
      groupEn: "Services & Guests",
    },
    {
      id: "users",
      href: `/${lang}/users`,
      labelAr: "المستخدمون",
      labelEn: "Users",
      icon: FiUser,
      metaAr: "فريق الفندق",
      metaEn: "Hotel staff",
      iconClass: "bg-indigo-500/20 text-indigo-300",
      glowColor: "rgba(99, 102, 241, 0.15)",
      groupAr: "الإعدادات",
      groupEn: "Settings",
    },
    {
      id: "roles",
      href: `/${lang}/roles`,
      labelAr: "الأدوار",
      labelEn: "Roles",
      icon: FiBookOpen,
      metaAr: "الصلاحيات",
      metaEn: "Permissions",
      iconClass: "bg-rose-500/20 text-rose-300",
      glowColor: "rgba(244, 63, 94, 0.15)",
      groupAr: "الإعدادات",
      groupEn: "Settings",
    },
    {
      id: "profile",
      href: `/${lang}/profile`,
      labelAr: "الملف الشخصي",
      labelEn: "Profile",
      icon: FiSettings,
      metaAr: "حسابك",
      metaEn: "Your account",
      iconClass: "bg-emerald-500/20 text-emerald-300",
      glowColor: "rgba(16, 185, 129, 0.15)",
      groupAr: "الإعدادات",
      groupEn: "Settings",
    },
  ];

  const quickStats = [
    {
      label: t("طلبات مفتوحة", "Open Requests"),
      value: serviceOpen,
      icon: FiBell,
      color: "rgba(251, 146, 60, 0.8)",
    },
    {
      label: t("قيد التنفيذ", "In Progress"),
      value: srStats?.in_progress || 0,
      icon: FiActivity,
      color: "rgba(129, 140, 248, 0.8)",
    },
    {
      label: t("مكتملة اليوم", "Completed Today"),
      value: srStats?.completed || 0,
      icon: FiTrendingUp,
      color: "rgba(52, 211, 153, 0.8)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <section
        className={`
          grid gap-4 sm:grid-cols-3 transition-all duration-700
          ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {quickStats.map((stat, i) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            delay={i * 100}
          />
        ))}
      </section>

      {/* Main Navigation Grid */}
      <section
        className={`
          relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br 
          from-white/[0.12] via-white/[0.08] to-white/[0.04] p-6 shadow-2xl backdrop-blur-xl
          transition-all duration-700 delay-200
          ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {/* Background decorations */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30">
              <FiZap className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t("أقسام النظام", "System Sections")}
              </h2>
              <p className="text-xs text-white/50">
                {t("الوصول السريع لجميع الأقسام", "Quick access to all modules")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((tile, index) => (
              <GlowCard key={tile.id} tile={tile} index={index} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      {/* Notification Center */}
      <section
        className={`
          relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br 
          from-white/[0.10] to-white/[0.05] p-6 shadow-2xl backdrop-blur-xl
          transition-all duration-700 delay-300
          ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-20 top-0 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30">
                <FiBell className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("مركز الإشعارات", "Notification Center")}
                </h2>
                <p className="text-xs text-white/50">
                  {t(
                    "مراجعة التنبيهات وتوجيه الطلبات",
                    "Review alerts and route requests",
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 ring-1 ring-amber-400/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-sm font-semibold text-amber-200">
                {serviceOpen} {t("تذكرة مفتوحة", "open tickets")}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href={`/${lang}/service-requests?status=pending`}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 px-4 py-4 ring-1 ring-amber-400/20 transition-all duration-300 hover:ring-amber-400/40 hover:shadow-lg hover:shadow-amber-500/10"
            >
              <div className="relative z-10">
                <p className="text-2xl font-bold text-amber-200">{srStats?.pending || 0}</p>
                <p className="mt-1 text-sm font-medium text-amber-100/80">
                  {t("بانتظار المعالجة", "Pending Queue")}
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-amber-400/20 blur-2xl transition-all duration-300 group-hover:bg-amber-400/30" />
            </Link>

            <Link
              href={`/${lang}/service-requests?status=in_progress`}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 px-4 py-4 ring-1 ring-indigo-400/20 transition-all duration-300 hover:ring-indigo-400/40 hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="relative z-10">
                <p className="text-2xl font-bold text-indigo-200">{srStats?.in_progress || 0}</p>
                <p className="mt-1 text-sm font-medium text-indigo-100/80">
                  {t("قيد التنفيذ", "In Progress")}
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-indigo-400/20 blur-2xl transition-all duration-300 group-hover:bg-indigo-400/30" />
            </Link>

            <Link
              href={`/${lang}/service-requests`}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 px-4 py-4 ring-1 ring-cyan-400/20 transition-all duration-300 hover:ring-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="relative z-10">
                <p className="text-2xl font-bold text-cyan-200">→</p>
                <p className="mt-1 text-sm font-medium text-cyan-100/80">
                  {t("عرض كل التنبيهات", "View All Alerts")}
                </p>
              </div>
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-cyan-400/20 blur-2xl transition-all duration-300 group-hover:bg-cyan-400/30" />
            </Link>
          </div>

          {hasServicePermission && (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-3 text-xs text-white/60">
              <FiClock className="h-4 w-4 text-cyan-400" />
              <span>
                {t(
                  "مزامنة الإشعارات تعمل تلقائياً كل 10 ثوان لضمان تحديث فوري.",
                  "Notification sync runs every 10 seconds for near real-time updates.",
                )}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
