import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/roles`;

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "roles.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  const roleId = Number.parseInt(cleanText(form.get("roleId")), 10);
  const permissionId = Number.parseInt(cleanText(form.get("permissionId")), 10);

  if (!Number.isFinite(roleId) || !Number.isFinite(permissionId)) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "الدور والصلاحية مطلوبان", "Role and permission are required"))}`,
        getBaseUrl(),
      ),
    );
  }

  await query(
    `
    INSERT INTO app_role_permissions (role_id, permission_id)
    VALUES ($1, $2)
    ON CONFLICT (role_id, permission_id) DO NOTHING
    `,
    [roleId, permissionId],
  );

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تعيين الصلاحية", "Permission assigned"))}`,
      getBaseUrl(),
    ),
  );
}
