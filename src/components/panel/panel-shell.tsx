import Link from "next/link";
import { FiLogOut, FiUser } from "react-icons/fi";
import type { SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { dirForLang, tr, type AppLang } from "@/lib/i18n";
import { NotificationBell } from "./notification-bell";
import { LiveClock } from "./live-clock";
import { HtmlDirSetter } from "@/components/html-dir-setter";
import { BackNavButton } from "./back-nav-button";

type NavKey =
  | "dashboard"
  | "rooms"
  | "guests"
  | "users"
  | "roles"
  | "reservations"
  | "service-requests"
  | "profile";

type Props = {
  lang: AppLang;
  user: SessionUser;
  active: NavKey;
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  children: React.ReactNode;
};

type NavItem = {
  key: NavKey;
  href: (lang: AppLang) => string;
  icon: React.ComponentType<{ className?: string }>;
  labelAr: string;
  labelEn: string;
};

export function PanelShell({ lang, user, active, title, subtitle, backgroundImage, children }: Props) {
  const t = (ar: string, en: string) => tr(lang, ar, en);
  const activePath = active === "dashboard" ? "dashboard" : active;
  const resolvedBackground = backgroundImage ?? "/back.jpeg";
  const hasBackground = Boolean(resolvedBackground);
  const isRtl = dirForLang(lang) === "rtl";
  const glassSoft = hasBackground
    ? "bg-white/12 text-white hover:bg-white/22"
    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const glassStrong = hasBackground
    ? "bg-white/20 text-white hover:bg-white/30"
    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";

  return (
    <div dir={dirForLang(lang)} className="relative flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      <HtmlDirSetter lang={lang} />
      {hasBackground ? (
        <>
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat blur-[2px]"
            style={{ backgroundImage: `url('${resolvedBackground}')` }}
          />
          <div className="absolute inset-0 bg-slate-900/40" />
        </>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header
          className={`relative z-50 shrink-0 px-3 py-2.5 md:px-6 md:py-3 ${
            hasBackground
              ? "border-b border-white/20 bg-white/10 backdrop-blur-xl"
              : "border-b border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              {active !== "dashboard" ? (
                <BackNavButton
                  fallbackHref={`/${lang}/dashboard`}
                  label={t("رجوع", "Back")}
                  rtl={isRtl}
                  dark={hasBackground}
                />
              ) : null}
              <div className="min-w-0">
                <h1
                  className={`truncate text-sm font-semibold tracking-wide md:text-base ${
                    hasBackground ? "text-white" : "text-slate-900"
                  }`}
                >
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <div
                className={`hidden items-center gap-1 rounded-xl p-1 sm:flex ${
                  hasBackground ? "bg-white/10" : "border border-slate-200 bg-white"
                }`}
              >
                <Link
                  href={`/en/${activePath}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    lang === "en" ? "bg-teal-600 text-white" : hasBackground ? "text-white/80 hover:text-white" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  EN
                </Link>
                <Link
                  href={`/ar/${activePath}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    lang === "ar" ? "bg-teal-600 text-white" : hasBackground ? "text-white/80 hover:text-white" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  AR
                </Link>
              </div>

              <NotificationBell lang={lang} hasPermission={hasPermission(user, "services.manage")} />

              <Link
                href={`/${lang}/profile`}
                className={`hidden items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition lg:inline-flex ${glassSoft}`}
              >
                <FiUser className="h-3.5 w-3.5" />
                <span className="max-w-28 truncate">{user.fullName}</span>
              </Link>

              <form action="/api/auth/logout" method="post">
                <input type="hidden" name="lang" value={lang} />
                <button className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${glassStrong}`}>
                  <FiLogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("خروج", "Logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="panel-glass relative z-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>

        <footer
          className={`shrink-0 px-3 py-2 md:px-6 ${
            hasBackground
              ? "border-t border-white/20 bg-white/10 backdrop-blur-xl"
              : "border-t border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[11px] font-semibold tracking-wide ${hasBackground ? "text-white/80" : "text-slate-500"}`}>
              GuestHub Operations
            </p>
            <div className={`rounded-lg px-2 py-1 text-[11px] font-medium ${glassSoft}`}>
              <LiveClock lang={lang} />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
