import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];

  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.redirect(
    new URL(
      `/${lang}/login?ok=${encodeURIComponent(
        tr(lang, "تم تسجيل الخروج", "Logged out successfully"),
      )}`,
      getBaseUrl(),
    ),
  );
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
