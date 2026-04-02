import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
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

  const userId = Number.parseInt(cleanText(form.get("userId")), 10);
  const roleId = Number.parseInt(cleanText(form.get("roleId")), 10);

  if (!Number.isFinite(userId) || !Number.isFinite(roleId)) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "المستخدم والدور مطلوبان", "User and role are required"))}`,
        getBaseUrl(),
      ),
    );
  }

  await query(
    `
    INSERT INTO app_user_roles (user_id, role_id, assigned_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, roleId, currentUser.id],
  );

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تعيين الدور للمستخدم", "Role assigned to user"))}`,
      getBaseUrl(),
    ),
  );
}
