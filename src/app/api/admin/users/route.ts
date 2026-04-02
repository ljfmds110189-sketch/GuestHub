import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/security";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/users`;

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "users.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  const fullName = cleanText(form.get("fullName"));
  const username = cleanText(form.get("username")).toLowerCase();
  const password = cleanText(form.get("password"));

  if (!fullName || !username || password.length < 8) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات المستخدم غير صالحة (الحد الأدنى 8 أحرف لكلمة المرور)", "Invalid user data (password must be at least 8 characters)"))}`,
        getBaseUrl(),
      ),
    );
  }

  const passwordHash = hashPassword(password);
  const created = await query<{ id: number }>(
    `
    INSERT INTO app_users (username, full_name, password_hash, created_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (username) DO NOTHING
    RETURNING id
    `,
    [username, fullName, passwordHash, currentUser.id],
  );

  if (!created.rowCount) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "اسم المستخدم موجود مسبقًا", "Username already exists"))}`,
        getBaseUrl(),
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء المستخدم", "User created"))}`,
      getBaseUrl(),
    ),
  );
}
