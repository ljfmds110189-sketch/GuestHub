import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";
import { hashPassword } from "@/lib/security";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/profile`;

  const baseUrl = getBaseUrl();
  const redirectTo = (messageType: "ok" | "error", message: string) => {
    return NextResponse.redirect(`${baseUrl}${returnTo}?${messageType}=${encodeURIComponent(message)}`, { status: 303 });
  };

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.redirect(
      `${baseUrl}/${lang}/login?error=${encodeURIComponent(tr(lang, "تحتاج تسجيل دخول", "Please sign in"))}`,
      { status: 303 },
    );
  }

  const fullName = cleanText(form.get("fullName"));
  const password = cleanText(form.get("password"));

  if (!fullName) {
    return redirectTo("error", tr(lang, "الاسم الكامل مطلوب", "Full name is required"));
  }

  if (password && password.length < 8) {
    return redirectTo("error", tr(lang, "الحد الأدنى 8 أحرف لكلمة المرور", "Password must be at least 8 characters"));
  }

  try {
    await query(`UPDATE app_users SET full_name = $2 WHERE id = $1`, [currentUser.id, fullName]);

    if (password) {
      const passwordHash = hashPassword(password);
      await query(`UPDATE app_users SET password_hash = $2 WHERE id = $1`, [currentUser.id, passwordHash]);
    }
  } catch {
    return redirectTo("error", tr(lang, "تعذر تحديث الملف الشخصي", "Failed to update profile"));
  }

  return redirectTo("ok", tr(lang, "تم تحديث الملف الشخصي", "Profile updated successfully"));
}
