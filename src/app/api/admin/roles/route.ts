import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/roles`;
  const action = cleanText(form.get("action")) || "create";

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "roles.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "delete") {
    const roleId = Number.parseInt(cleanText(form.get("roleId")), 10);
    if (!Number.isFinite(roleId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "معرف الدور غير صالح", "Invalid role id"))}`,
          getBaseUrl(),
        ),
      );
    }

    const role = await query<{ is_system: boolean }>(
      `SELECT is_system FROM app_roles WHERE id = $1`,
      [roleId],
    );
    if (!role.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الدور غير موجود", "Role not found"))}`,
          getBaseUrl(),
        ),
      );
    }
    if (role.rows[0].is_system) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "لا يمكن حذف دور نظام", "Cannot delete a system role"))}`,
          getBaseUrl(),
        ),
      );
    }

    const assigned = await query(`SELECT 1 FROM app_user_roles WHERE role_id = $1 LIMIT 1`, [roleId]);
    if (assigned.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "لا يمكن حذف الدور لوجود مستخدمين مرتبطين به", "Cannot delete role while users are assigned"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(`DELETE FROM app_roles WHERE id = $1`, [roleId]);
    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم حذف الدور", "Role deleted"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "update") {
    const roleId = Number.parseInt(cleanText(form.get("roleId")), 10);
    const roleName = cleanText(form.get("roleName")).toLowerCase();
    const description = cleanText(form.get("description"));

    if (!Number.isFinite(roleId) || !roleName) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات الدور غير صحيحة", "Invalid role data"))}`,
          getBaseUrl(),
        ),
      );
    }

    try {
      await query(
        `
        UPDATE app_roles
        SET role_name = $2,
            description = NULLIF($3, '')
        WHERE id = $1
        `,
        [roleId, roleName, description],
      );
    } catch (error) {
      const maybePg = error as { code?: string };
      if (maybePg.code === "23505") {
        return NextResponse.redirect(
          new URL(
            `${returnTo}?error=${encodeURIComponent(tr(lang, "الدور موجود مسبقًا", "Role already exists"))}`,
            getBaseUrl(),
          ),
        );
      }
      throw error;
    }

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تحديث الدور", "Role updated"))}`,
        getBaseUrl(),
      ),
    );
  }

  const roleName = cleanText(form.get("roleName")).toLowerCase();
  const description = cleanText(form.get("description"));

  if (!roleName) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "اسم الدور مطلوب", "Role name is required"))}`,
        getBaseUrl(),
      ),
    );
  }

  const created = await query<{ id: number }>(
    `
    INSERT INTO app_roles (role_name, description)
    VALUES ($1, NULLIF($2, ''))
    ON CONFLICT (role_name) DO NOTHING
    RETURNING id
    `,
    [roleName, description],
  );

  if (!created.rowCount) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "الدور موجود مسبقًا", "Role already exists"))}`,
        getBaseUrl(),
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء الدور", "Role created"))}`,
      getBaseUrl(),
    ),
  );
}
