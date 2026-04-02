import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { generateRoomQrToken, generateAllRoomQrTokens } from "@/lib/data";
import { cleanText } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/qr-codes`;
  const action = cleanText(form.get("action")); // "single" | "bulk"
  const roomId = Number.parseInt(cleanText(form.get("roomId")), 10);

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "guests.manage")) {
    return NextResponse.redirect(
      `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
    );
  }

  if (action === "bulk") {
    const count = await generateAllRoomQrTokens();
    return NextResponse.redirect(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, `تم إنشاء ${count} رمز QR`, `Generated ${count} QR codes`))}`,
    );
  }

  if (!Number.isFinite(roomId)) {
    return NextResponse.redirect(
      `${returnTo}?error=${encodeURIComponent(tr(lang, "غرفة غير صالحة", "Invalid room"))}`,
    );
  }

  await generateRoomQrToken(roomId);

  return NextResponse.redirect(
    `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء رمز QR", "QR code generated"))}`,
  );
}
