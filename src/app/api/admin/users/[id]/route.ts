import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { tx } from "@/lib/db";
import { cleanText } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";
import { hashPassword } from "@/lib/security";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function toBool(value: string) {
  return value === "on" || value === "true" || value === "1";
}

function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function POST(request: Request, context: RouteParams) {
  const routeParams = await context.params;
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/users`;

  const redirectTo = (messageType: "ok" | "error", message: string) => {
    return NextResponse.redirect(`${returnTo}?${messageType}=${encodeURIComponent(message)}`, { status: 303 });
  };

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.redirect(
      `/${lang}/login?error=${encodeURIComponent(tr(lang, "تحتاج تسجيل دخول", "Please sign in"))}`,
      { status: 303 },
    );
  }

  if (!hasPermission(currentUser, "users.manage")) {
    return redirectTo("error", tr(lang, "لا تملك صلاحية", "Access denied"));
  }

  const userId = toInt(routeParams.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return redirectTo("error", tr(lang, "معرف مستخدم غير صالح", "Invalid user id"));
  }

  const fullName = cleanText(form.get("fullName"));
  const username = cleanText(form.get("username")).toLowerCase();
  const isActive = toBool(cleanText(form.get("isActive")));
  const password = cleanText(form.get("password"));
  const roleIds = form.getAll("roleIds").map((v) => Number.parseInt(String(v), 10)).filter(Number.isFinite);

  if (!fullName) {
    return redirectTo("error", tr(lang, "الاسم الكامل مطلوب", "Full name is required"));
  }

  if (!username) {
    return redirectTo("error", tr(lang, "اسم المستخدم مطلوب", "Username is required"));
  }

  if (password && password.length < 8) {
    return redirectTo("error", tr(lang, "الحد الأدنى 8 أحرف لكلمة المرور", "Password must be at least 8 characters"));
  }

  if (currentUser.id === userId && !isActive) {
    return redirectTo("error", tr(lang, "لا يمكن تعطيل حسابك الحالي", "You cannot disable your current account"));
  }

  try {
    await tx(async (client) => {
      await client.query(
        `
        UPDATE app_users
        SET full_name = $2, username = $3, is_active = $4
        WHERE id = $1
        `,
        [userId, fullName, username, isActive],
      );

      if (password) {
        const passwordHash = hashPassword(password);
        await client.query(`UPDATE app_users SET password_hash = $2 WHERE id = $1`, [userId, passwordHash]);
      }

      await client.query(`DELETE FROM app_user_roles WHERE user_id = $1`, [userId]);
      for (const roleId of roleIds) {
        await client.query(
          `INSERT INTO app_user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, roleId, currentUser.id],
        );
      }
    });
  } catch (error) {
    const maybePg = error as { code?: string };
    if (maybePg.code === "23505") {
      return redirectTo("error", tr(lang, "اسم المستخدم موجود مسبقًا", "Username already exists"));
    }
    return redirectTo("error", tr(lang, "تعذر تحديث المستخدم", "Failed to update user"));
  }

  return redirectTo("ok", tr(lang, "تم تحديث بيانات المستخدم", "User updated successfully"));
}
