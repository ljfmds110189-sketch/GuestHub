import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/rooms`;
  const action = cleanText(form.get("action")) || "create";

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "rooms.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "delete") {
    const roomId = Number.parseInt(cleanText(form.get("roomId")), 10);
    if (!Number.isFinite(roomId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "معرف الغرفة غير صالح", "Invalid room id"))}`,
          getBaseUrl(),
        ),
      );
    }

    const hasReservations = await query(`SELECT 1 FROM reservations WHERE room_id = $1 LIMIT 1`, [roomId]);
    if (hasReservations.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "لا يمكن حذف الغرفة لوجود حجوزات مرتبطة", "Cannot delete room with linked reservations"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(`DELETE FROM rooms WHERE id = $1`, [roomId]);
    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم حذف الغرفة", "Room deleted"))}`,
        getBaseUrl(),
      ),
    );
  }

  if (action === "update") {
    const roomId = Number.parseInt(cleanText(form.get("roomId")), 10);
    const roomNumber = cleanText(form.get("roomNumber"));
    const floorRaw = cleanText(form.get("floor"));
    const roomType = cleanText(form.get("roomType")) || "standard";
    const capacity = Number.parseInt(cleanText(form.get("capacity")) || "2", 10);
    const status = cleanText(form.get("status")) || "active";
    const floor = floorRaw ? Number.parseInt(floorRaw, 10) : null;

    if (
      !Number.isFinite(roomId) ||
      !roomNumber ||
      !Number.isFinite(capacity) ||
      capacity < 1 ||
      (status !== "active" && status !== "maintenance")
    ) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات الغرفة غير صحيحة", "Invalid room data"))}`,
          getBaseUrl(),
        ),
      );
    }

    try {
      await query(
        `UPDATE rooms
         SET room_number = $2, floor = $3, room_type = $4, capacity = $5, status = $6
         WHERE id = $1`,
        [roomId, roomNumber, Number.isFinite(floor ?? Number.NaN) ? floor : null, roomType, capacity, status],
      );
    } catch (error) {
      const maybePg = error as { code?: string };
      if (maybePg.code === "23505") {
        return NextResponse.redirect(
          new URL(
            `${returnTo}?error=${encodeURIComponent(tr(lang, "رقم الغرفة مكرر", "Room number already exists"))}`,
            getBaseUrl(),
          ),
        );
      }
      throw error;
    }

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تحديث الغرفة", "Room updated"))}`,
        getBaseUrl(),
      ),
    );
  }

  const roomNumber = cleanText(form.get("roomNumber"));
  const floorRaw = cleanText(form.get("floor"));
  const roomType = cleanText(form.get("roomType")) || "standard";
  const capacity = Number.parseInt(cleanText(form.get("capacity")) || "2", 10);
  const floor = floorRaw ? Number.parseInt(floorRaw, 10) : null;

  if (!roomNumber || !Number.isFinite(capacity) || capacity < 1) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات الغرفة غير صحيحة", "Invalid room data"))}`,
        getBaseUrl(),
      ),
    );
  }

  const created = await query(
    `
    INSERT INTO rooms (room_number, floor, room_type, capacity, created_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (room_number) DO NOTHING
    RETURNING id
    `,
    [roomNumber, floor, roomType, capacity, currentUser.id],
  );

  if (!created.rowCount) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "رقم الغرفة مكرر", "Room number already exists"))}`,
        getBaseUrl(),
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${returnTo}?ok=${encodeURIComponent(tr(lang, "تمت إضافة الغرفة", "Room added"))}`,
      getBaseUrl(),
    ),
  );
}
