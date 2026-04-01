import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { dirForLang, resolveLang, tr } from "@/lib/i18n";
import { HtmlDirSetter } from "@/components/html-dir-setter";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    error?: string;
    ok?: string;
  }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const lang = resolveLang(routeParams.lang);
  if (routeParams.lang !== lang) {
    redirect(`/${lang}/login`);
  }

  const user = await getCurrentUser();
  if (user) redirect(`/${lang}/dashboard`);

  return (
    <main
      dir={dirForLang(lang)}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
    >
      <HtmlDirSetter lang={lang} />

      {/* Background image */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat blur-[2px]"
        style={{ backgroundImage: "url('/back-login.jpg')" }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Glassmorphism card */}
      <section className="relative z-10 w-full max-w-md rounded-3xl bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-4 flex items-center justify-end gap-2 text-sm">
          <Link
            href="/ar/login"
            className={`rounded-lg px-3 py-1 transition ${lang === "ar" ? "bg-white/90 text-slate-900 shadow-sm" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
          >
            العربية
          </Link>
          <Link
            href="/en/login"
            className={`rounded-lg px-3 py-1 transition ${lang === "en" ? "bg-white/90 text-slate-900 shadow-sm" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
          >
            English
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white">
          {tr(lang, "تسجيل دخول موظفي الفندق", "Hotel Staff Login")}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {tr(
            lang,
            "لوحة إدارة الضيوف والغرف والحجوزات",
            "Management panel for guests, rooms, and reservations",
          )}
        </p>

        {query.error ? (
          <p className="mt-4 rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-200 backdrop-blur-sm">
            {query.error}
          </p>
        ) : null}

        {query.ok ? (
          <p className="mt-4 rounded-xl bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200 backdrop-blur-sm">
            {query.ok}
          </p>
        ) : null}

        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="lang" value={lang} />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/90">
              {tr(lang, "اسم المستخدم", "Username")}
            </span>
            <input
              name="username"
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 outline-none backdrop-blur-sm transition focus:border-white/40 focus:bg-white/15"
              placeholder="admin"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-white/90">
              {tr(lang, "كلمة المرور", "Password")}
            </span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 outline-none backdrop-blur-sm transition focus:border-white/40 focus:bg-white/15"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-white/20 px-4 py-2.5 font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-white/30 active:scale-[0.98]"
          >
            {tr(lang, "دخول", "Sign in")}
          </button>
        </form>
      </section>
    </main>
  );
}
