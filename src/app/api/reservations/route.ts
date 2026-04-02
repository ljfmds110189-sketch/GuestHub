import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/reservations`;
  const action = cleanText(form.get("action")) || "create";

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "guests.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "delete") {
    const reservationId = Number.parseInt(cleanText(form.get("reservationId")), 10);
    if (!Number.isFinite(reservationId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "معرف الحجز غير صالح", "Invalid reservation id"))}`,
          getBaseUrl(),
        ),
      );
    }

    const hasRequests = await query(
      `SELECT 1 FROM service_requests WHERE reservation_id = $1 LIMIT 1`,
      [reservationId],
    );
    if (hasRequests.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "لا يمكن حذف الحجز لوجود طلبات خدمة مرتبطة", "Cannot delete reservation with linked service requests"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(`DELETE FROM guest_access_tokens WHERE reservation_id = $1`, [reservationId]);
    await query(`DELETE FROM reservations WHERE id = $1`, [reservationId]);

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم حذف الحجز", "Reservation deleted"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "update") {
    const reservationId = Number.parseInt(cleanText(form.get("reservationId")), 10);
    const guestId = Number.parseInt(cleanText(form.get("guestId")), 10);
    const roomId = Number.parseInt(cleanText(form.get("roomId")), 10);
    const status = cleanText(form.get("status"));
    const checkIn = new Date(cleanText(form.get("checkIn")));
    const checkOut = new Date(cleanText(form.get("checkOut")));
    const validStatuses = ["booked", "checked_in", "checked_out", "cancelled"];

    if (
      !Number.isFinite(reservationId) ||
      !Number.isFinite(guestId) ||
      !Number.isFinite(roomId) ||
      !validStatuses.includes(status) ||
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime()) ||
      checkOut <= checkIn
    ) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات الحجز غير صحيحة", "Invalid reservation data"))}`,
          getBaseUrl(),
        ),
      );
    }

    const roomReady = await query(`SELECT 1 FROM rooms WHERE id = $1 AND status = 'active'`, [roomId]);
    if (!roomReady.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الغرفة غير نشطة", "Room is not active"))}`,
          getBaseUrl(),
        ),
      );
    }

    const overlap = await query(
      `
      SELECT 1
      FROM reservations
      WHERE id <> $1
        AND room_id = $2
        AND reservation_status IN ('booked', 'checked_in')
        AND tstzrange(check_in, check_out, '[)') && tstzrange($3::timestamptz, $4::timestamptz, '[)')
      LIMIT 1
      `,
      [reservationId, roomId, checkIn.toISOString(), checkOut.toISOString()],
    );
    if (overlap.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الغرفة محجوزة في هذا الوقت", "Room is already booked for this time"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(
      `
      UPDATE reservations
      SET guest_id = $2,
          room_id = $3,
          check_in = $4,
          check_out = $5,
          reservation_status = $6
      WHERE id = $1
      `,
      [reservationId, guestId, roomId, checkIn.toISOString(), checkOut.toISOString(), status],
    );

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تحديث الحجز", "Reservation updated"))}`,
        getBaseUrl(),
      ),
    );
  }

  /* ── Create ── */
  if (action === "create") {
    const guestId = Number.parseInt(cleanText(form.get("guestId")), 10);
    const roomId = Number.parseInt(cleanText(form.get("roomId")), 10);
    const checkIn = new Date(cleanText(form.get("checkIn")));
    const checkOut = new Date(cleanText(form.get("checkOut")));

    if (
      !Number.isFinite(guestId) ||
      !Number.isFinite(roomId) ||
      Number.isNaN(checkIn.getTime()) ||
      Number.isNaN(checkOut.getTime()) ||
      checkOut <= checkIn
    ) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات الحجز غير صحيحة", "Invalid reservation data"))}`,
          getBaseUrl(),
        ),
      );
    }

    const roomReady = await query(`SELECT 1 FROM rooms WHERE id = $1 AND status = 'active'`, [roomId]);
    if (!roomReady.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الغرفة غير نشطة", "Room is not active"))}`,
          getBaseUrl(),
        ),
      );
    }

    const overlap = await query(
      `SELECT 1
       FROM reservations
       WHERE room_id = $1
         AND reservation_status IN ('booked', 'checked_in')
         AND tstzrange(check_in, check_out, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
       LIMIT 1`,
      [roomId, checkIn.toISOString(), checkOut.toISOString()],
    );
    if (overlap.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الغرفة محجوزة في هذا الوقت", "Room is already booked for this time"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(
      `INSERT INTO reservations (guest_id, room_id, check_in, check_out, reservation_status)
       VALUES ($1, $2, $3, $4, 'booked')`,
      [guestId, roomId, checkIn.toISOString(), checkOut.toISOString()],
    );

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء الحجز", "Reservation created"))}`,
        getBaseUrl(),
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${returnTo}?error=${encodeURIComponent(tr(lang, "إجراء غير معروف", "Unknown action"))}`,
      getBaseUrl(),
    ),
  );
}
