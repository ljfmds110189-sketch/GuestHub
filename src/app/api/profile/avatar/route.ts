import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

const maxFileBytes = 3 * 1024 * 1024;
const allowedTypes = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const userId = Number.parseInt(cleanText(form.get("userId")), 10);
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/users/${userId}`;

  const currentUser = await getCurrentUser();
  const baseUrl = getBaseUrl();
  const redirectTo = (messageType: "ok" | "error", message: string) => {
    return NextResponse.redirect(`${baseUrl}${returnTo}?${messageType}=${encodeURIComponent(message)}`, { status: 303 });
  };

  if (!currentUser) {
    return NextResponse.redirect(
      `${baseUrl}/${lang}/login?error=${encodeURIComponent(tr(lang, "تحتاج تسجيل دخول", "Please sign in"))}`,
      { status: 303 },
    );
  }

  const canManageUsers = hasPermission(currentUser, "users.manage");
  if (!Number.isFinite(userId) || (!canManageUsers && currentUser.id !== userId)) {
    return redirectTo("error", tr(lang, "لا تملك صلاحية", "Access denied"));
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return redirectTo("error", tr(lang, "ملف الصورة مطلوب", "Avatar file is required"));
  }

  const ext = allowedTypes.get(file.type);
  if (!ext || file.size <= 0 || file.size > maxFileBytes) {
    return redirectTo("error", tr(lang, "صيغة أو حجم الصورة غير صالح", "Invalid image format or size"));
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `avatar-${userId}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const fullPath = path.join(uploadDir, fileName);
  const avatarUrl = `/uploads/avatars/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(fullPath, bytes);

  await query(`UPDATE app_users SET avatar_url = $2 WHERE id = $1`, [userId, avatarUrl]);

  return redirectTo("ok", tr(lang, "تم رفع الصورة", "Avatar uploaded"));
}
