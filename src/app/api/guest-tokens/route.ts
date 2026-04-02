import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/reservations`;

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "guests.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  const reservationId = Number.parseInt(cleanText(form.get("reservationId")), 10);
  if (!Number.isFinite(reservationId)) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "حجز غير صالح", "Invalid reservation"))}`,
        getBaseUrl(),
      ),
    );
  }

  // Verify reservation exists and is active
  const reservation = await query(
    `SELECT id, check_out FROM reservations
     WHERE id = $1 AND reservation_status IN ('booked', 'checked_in')`,
    [reservationId],
  );

  if (!reservation.rowCount) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "الحجز غير موجود أو غير نشط", "Reservation not found or not active"))}`,
        getBaseUrl(),
      ),
    );
  }

  const token = crypto.randomUUID() + crypto.randomBytes(16).toString("hex");
  const expiresAt = reservation.rows[0].check_out;

  await query(
    `INSERT INTO guest_access_tokens (token, reservation_id, expires_at)
     VALUES ($1, $2, $3)`,
    [token, reservationId, expiresAt],
  );

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء رابط الضيف", "Guest link created"))}&token=${encodeURIComponent(token)}`,
      getBaseUrl(),
    ),
  );
}
