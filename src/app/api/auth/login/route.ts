import { NextResponse } from "next/server";
import { authenticateUser, createSession, SESSION_COOKIE } from "@/lib/auth";
import { cleanText } from "@/lib/http";
import { env } from "@/lib/env";
import { resolveLang, tr } from "@/lib/i18n";

function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path,
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const username = cleanText(form.get("username"));
  const password = cleanText(form.get("password"));

  if (!username || !password) {
    return redirectTo(
      `/${lang}/login?error=${encodeURIComponent(
        tr(lang, "اسم المستخدم وكلمة المرور مطلوبان", "Username and password are required"),
      )}`,
    );
  }

  const user = await authenticateUser(username, password);
  if (!user) {
    return redirectTo(
      `/${lang}/login?error=${encodeURIComponent(
        tr(lang, "بيانات الدخول غير صحيحة", "Invalid login credentials"),
      )}`,
    );
  }

  const userAgent = request.headers.get("user-agent");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
  const token = await createSession(user.id, userAgent, ipAddress);

  const response = redirectTo(
    `/${lang}/dashboard?ok=${encodeURIComponent(
      tr(lang, "تم تسجيل الدخول بنجاح", "Signed in successfully"),
    )}`,
  );
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  });

  return response;
}
